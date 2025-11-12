/**
 * Story Generation Service
 * Handles story generation with OpenAI, tracking, and cost logging
 */

import { createClient } from '@/lib/supabase/server';
import { FunStoryPromptBuilder } from '../prompt-builders/funStoryPromptBuilder';
import { GrowthStoryPromptBuilder } from '../prompt-builders/growthStoryPromptBuilder';
import { AIConfigService, type AIConfig } from './ai-config';
import { StoryIllustrationGenerator } from './story-illustration-generator';
import type {
  StoryGenerationParams,
  StoryGenerationRequest,
  Story,
  ParsedStory,
  StoryCharacter,
  StoryParameter,
  PromptBuildContext,
  GenerationStatus,
} from '../types/story-types';

export class StoryGenerationService {
  /**
   * Main story generation method - synchronous for MVP
   */
  static async generateStory(
    userId: string,
    params: StoryGenerationParams
  ): Promise<Story> {
    const supabase = await createClient();
    const startedAt = new Date().toISOString();
    let costLogId: string | null = null;

    try {
      // 1. Build request context
      const request = await this.buildGenerationRequest(params);

      // 2. Build prompt using appropriate builder
      const prompt = await this.buildPrompt(request);

      // 3. Get AI config for mode
      const aiConfig = await this.getAIConfigForMode(request.mode);
      if (!aiConfig) {
        throw new Error(`No AI config found for mode: ${request.mode}`);
      }

      // 4. Create initial cost log entry (status: 'processing')
      const { data: costLog } = await supabase
        .from('api_cost_logs')
        .insert({
          user_id: userId,
          provider: aiConfig.provider,
          operation: 'story_generation',
          model_used: aiConfig.model_name,
          character_profile_id: params.heroId,
          processing_status: 'processing',
          generation_params: params,
          prompt_used: prompt,
          started_at: startedAt,
          metadata: {
            ai_config_name: aiConfig.name,
            mode: request.mode,
          },
        })
        .select('id')
        .single();

      costLogId = costLog?.id || null;

      // 5. Generate story
      const story = await this._generateSync(userId, request, prompt, aiConfig, costLogId);

      // 6. Cost log is already updated in _generateSync
      // No need to update again here

      return story;
    } catch (error: any) {
      // Update cost log to 'failed'
      if (costLogId) {
        await supabase
          .from('api_cost_logs')
          .update({
            processing_status: 'failed',
            error_message: error.message,
            completed_at: new Date().toISOString(),
          })
          .eq('id', costLogId);
      }
      throw error;
    }
  }

  /**
   * Internal synchronous generation logic
   */
  private static async _generateSync(
    userId: string,
    request: StoryGenerationRequest,
    prompt: string,
    aiConfig: AIConfig,
    costLogId: string | null
  ): Promise<Story> {
    // 1. Call OpenAI
    const response = await this.callOpenAI(prompt, aiConfig);

    // 2. Parse response
    const parsed = this.parseResponse(response.content);

    // 3. Create content record
    const story = await this.saveStory(userId, parsed, request, prompt);

    // 4. Link characters
    await this.linkCharacters(story.id, request.characters);

    // 5. Generate illustration if prompt exists and illustrations were requested
    if (parsed.illustration_prompt && request.includeIllustrations) {
      console.log('Generating story illustration with Gemini...');
      try {
        const illustration = await StoryIllustrationGenerator.generateAndSaveIllustration(
          parsed.illustration_prompt,
          userId,
          story.id
        );

        if (illustration) {
          console.log('Story illustration generated successfully');
          // Update the story object with the illustration
          story.story_illustrations = [illustration];
        } else {
          console.warn('Failed to generate story illustration');
        }
      } catch (error) {
        console.error('Error generating story illustration:', error);
        // Continue without illustration - don't fail the entire story generation
      }
    }

    // 6. Update cost log with token data and completion status
    await this.logCosts(userId, aiConfig, response.tokens, {
      content_id: story.id,
      mode: request.mode,
      prompt_tokens: response.promptTokens,
      completion_tokens: response.completionTokens,
      total_tokens: response.tokens,
    }, costLogId);

    return story;
  }

  /**
   * Build generation request from params
   */
  private static async buildGenerationRequest(
    params: StoryGenerationParams
  ): Promise<StoryGenerationRequest> {
    const supabase = await createClient();

    // Fetch all characters
    const characters = await this.fetchCharacters(
      params.heroId,
      params.characterIds,
      params.adHocCharacters
    );

    // Fetch story parameters
    const { data: parameters } = await supabase
      .from('story_parameters')
      .select('*')
      .in('id', [params.genreId, params.toneId, params.lengthId, params.growthTopicId].filter(Boolean));

    if (!parameters || parameters.length < 3) {
      throw new Error('Failed to fetch story parameters');
    }

    const genre = parameters.find(p => p.id === params.genreId);
    const tone = parameters.find(p => p.id === params.toneId);
    const length = parameters.find(p => p.id === params.lengthId);
    const growthTopic = params.growthTopicId
      ? parameters.find(p => p.id === params.growthTopicId)
      : undefined;

    if (!genre || !tone || !length) {
      throw new Error('Missing required story parameters');
    }

    if (params.mode === 'growth' && !growthTopic) {
      throw new Error('Growth topic required for growth mode stories');
    }

    // Get hero age
    const heroAge = await this.getHeroAge(params.heroId);

    return {
      characters,
      genre,
      tone,
      length,
      growthTopic,
      mode: params.mode,
      customInstructions: params.customInstructions,
      heroAge,
      includeIllustrations: params.includeIllustrations,
    };
  }

  /**
   * Fetch and organize characters
   */
  private static async fetchCharacters(
    heroId: string,
    characterIds: string[],
    adHocCharacters: Array<{ name: string; role?: string }>
  ): Promise<StoryCharacter[]> {
    const supabase = await createClient();

    const allIds = [heroId, ...characterIds].filter(Boolean);

    // Fetch linked characters
    const { data: profiles, error } = await supabase
      .from('character_profiles')
      .select('*')
      .in('id', allIds);

    if (error) {
      throw new Error(`Failed to fetch characters: ${error.message}`);
    }

    const characters: StoryCharacter[] = [];

    // Add hero
    const heroProfile = profiles?.find(p => p.id === heroId);
    if (heroProfile) {
      characters.push({
        id: heroProfile.id,
        name: heroProfile.name,
        profileType: heroProfile.character_type,
        role: 'hero',
        attributes: heroProfile.attributes,
        description: heroProfile.appearance_description,
      });
    }

    // Add supporting characters
    characterIds.forEach(id => {
      const profile = profiles?.find(p => p.id === id);
      if (profile) {
        characters.push({
          id: profile.id,
          name: profile.name,
          profileType: profile.character_type,
          role: this.inferRole(profile.character_type),
          attributes: profile.attributes,
          description: profile.appearance_description,
        });
      }
    });

    // Add ad-hoc characters
    adHocCharacters.forEach(char => {
      characters.push({
        name: char.name,
        role: (char.role as 'hero' | 'sidekick' | 'pet' | 'friend' | 'family' | 'other') || 'friend',
      });
    });

    return characters;
  }

  /**
   * Get hero age from character profile
   */
  private static async getHeroAge(heroId: string): Promise<number> {
    const supabase = await createClient();

    const { data, error } = await supabase
      .from('character_profiles')
      .select('attributes')
      .eq('id', heroId)
      .single();

    if (error || !data) {
      return 6; // Default age
    }

    return data.attributes?.age || 6;
  }

  /**
   * Infer character role from profile type
   */
  private static inferRole(profileType: string): 'hero' | 'sidekick' | 'pet' | 'friend' | 'family' | 'other' {
    const roleMap: Record<string, 'hero' | 'sidekick' | 'pet' | 'friend' | 'family' | 'other'> = {
      child: 'friend',
      pet: 'pet',
      storybook_character: 'sidekick',
      magical_creature: 'friend',
    };
    return roleMap[profileType] || 'friend';
  }

  /**
   * Build prompt using appropriate builder
   */
  private static async buildPrompt(request: StoryGenerationRequest): Promise<string> {
    const context: PromptBuildContext = {
      characters: request.characters,
      genre: request.genre,
      tone: request.tone,
      length: request.length,
      growthTopic: request.growthTopic,
      mode: request.mode,
      customInstructions: request.customInstructions,
      heroAge: request.heroAge,
      includeIllustrations: request.includeIllustrations,
    };

    const builder = request.mode === 'fun'
      ? new FunStoryPromptBuilder()
      : new GrowthStoryPromptBuilder();

    return await builder.buildPrompt(context);
  }

  /**
   * Get AI config for story mode
   */
  private static async getAIConfigForMode(mode: 'fun' | 'growth'): Promise<AIConfig | null> {
    // Map mode to explicit purpose
    const purpose = mode === 'fun' ? 'story_fun' : 'story_growth';

    // Get default config for this specific purpose
    return await AIConfigService.getDefaultConfig(purpose);
  }

  /**
   * Call OpenAI API
   */
  private static async callOpenAI(
    prompt: string,
    aiConfig: AIConfig
  ): Promise<{ content: string; tokens: number; promptTokens: number; completionTokens: number }> {
    const apiKey = process.env.OPENAI_API_KEY;
    if (!apiKey) {
      throw new Error('OpenAI API key not configured');
    }

    const requestBody = {
      model: aiConfig.model_id,
      messages: [
        {
          role: 'user',
          content: prompt,
        },
      ],
      max_tokens: aiConfig.settings.max_tokens || 2000,
      temperature: aiConfig.settings.temperature || 0.8,
      top_p: aiConfig.settings.top_p || 1.0,
      frequency_penalty: aiConfig.settings.frequency_penalty || 0.3,
      presence_penalty: aiConfig.settings.presence_penalty || 0.3,
    };

    console.log('📝 Story Generation Prompt:', {
      model: requestBody.model,
      promptLength: prompt.length,
      promptPreview: prompt.substring(0, 500) + '...',
      settings: {
        max_tokens: requestBody.max_tokens,
        temperature: requestBody.temperature,
      }
    });

    console.log('📝 Full Story Prompt:', prompt);

    const response = await fetch('https://api.openai.com/v1/chat/completions', {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
        'Authorization': `Bearer ${apiKey}`,
      },
      body: JSON.stringify(requestBody),
    });

    if (!response.ok) {
      const errorData = await response.json().catch(() => ({}));
      throw new Error(
        `OpenAI API error: ${response.status} - ${errorData.error?.message || 'Unknown error'}`
      );
    }

    const data = await response.json();

    const usage = data.usage || {};
    console.log('💰 OpenAI Token Usage:', {
      prompt_tokens: usage.prompt_tokens,
      completion_tokens: usage.completion_tokens,
      total_tokens: usage.total_tokens,
    });

    return {
      content: data.choices[0]?.message?.content || '',
      tokens: data.usage?.total_tokens || 0,
      promptTokens: usage.prompt_tokens || 0,
      completionTokens: usage.completion_tokens || 0,
    };
  }

  /**
   * Parse OpenAI response (JSON or fallback to text)
   */
  private static parseResponse(text: string): ParsedStory {
    // Try JSON first
    try {
      // Remove markdown code blocks if present
      let cleanText = text.trim();
      if (cleanText.startsWith('```json')) {
        cleanText = cleanText.replace(/```json\n?/g, '').replace(/```\n?/g, '');
      } else if (cleanText.startsWith('```')) {
        cleanText = cleanText.replace(/```\n?/g, '');
      }

      const json = JSON.parse(cleanText);

      if (json.title && json.paragraphs && Array.isArray(json.paragraphs)) {
        return {
          title: json.title,
          paragraphs: json.paragraphs,
          moral: json.moral || null,
          illustration_prompt: json.illustration_prompt || null,
        };
      }
    } catch (error) {
      console.log('Failed to parse JSON, falling back to text parsing');
    }

    // Fallback: parse text manually
    return this.parseTextResponse(text);
  }

  /**
   * Fallback text parser
   */
  private static parseTextResponse(text: string): ParsedStory {
    const lines = text.split('\n').filter(line => line.trim());

    // Extract title (first line or look for "Title:" pattern)
    let title = lines[0];
    if (title.toLowerCase().startsWith('title:')) {
      title = title.substring(6).trim();
    }

    // Remove title from lines
    const contentLines = lines.slice(1);

    // Split on double newlines or identify paragraphs
    const paragraphs: string[] = [];
    let currentParagraph = '';

    contentLines.forEach(line => {
      if (line.trim() === '') {
        if (currentParagraph) {
          paragraphs.push(currentParagraph.trim());
          currentParagraph = '';
        }
      } else {
        currentParagraph += (currentParagraph ? ' ' : '') + line.trim();
      }
    });

    if (currentParagraph) {
      paragraphs.push(currentParagraph.trim());
    }

    // Look for moral in last paragraph
    let moral: string | null = null;
    const lastPara = paragraphs[paragraphs.length - 1];
    if (lastPara && (lastPara.toLowerCase().includes('moral:') || lastPara.toLowerCase().includes('lesson:'))) {
      moral = lastPara.replace(/^(moral|lesson):/i, '').trim();
      paragraphs.pop();
    }

    return { title, paragraphs, moral };
  }

  /**
   * Save story to content table
   */
  private static async saveStory(
    userId: string,
    parsed: ParsedStory,
    request: StoryGenerationRequest,
    prompt: string
  ): Promise<Story> {
    const supabase = await createClient();

    const { data, error } = await supabase
      .from('content')
      .insert({
        user_id: userId,
        content_type: 'story',
        title: parsed.title,
        body: parsed.paragraphs.join('\n\n'),
        theme: request.genre.name,
        age_appropriate_for: [request.heroAge],
        generation_prompt: prompt,
        generation_metadata: {
          mode: request.mode,
          genre: request.genre.name,
          genre_display: request.genre.display_name,
          tone: request.tone.name,
          tone_display: request.tone.display_name,
          length: request.length.name,
          length_display: request.length.display_name,
          growth_topic: request.growthTopic?.name,
          growth_topic_display: request.growthTopic?.display_name,
          moral: parsed.moral,
          paragraphs: parsed.paragraphs,
          hero_age: request.heroAge,
          character_count: request.characters.length,
          include_illustrations: request.includeIllustrations || false,
        },
        include_illustrations: request.includeIllustrations || false,
        story_illustration_prompt: parsed.illustration_prompt || null,
      })
      .select()
      .single();

    if (error) {
      throw new Error(`Failed to save story: ${error.message}`);
    }

    return data as Story;
  }

  /**
   * Link characters to story
   */
  private static async linkCharacters(
    storyId: string,
    characters: StoryCharacter[]
  ): Promise<void> {
    const supabase = await createClient();

    const records = characters
      .filter(char => char.id) // Only linked characters
      .map(char => ({
        content_id: storyId,
        character_profile_id: char.id,
        role: char.role || null,
        character_name_in_content: char.name,
      }));

    if (records.length > 0) {
      const { error } = await supabase
        .from('content_characters')
        .insert(records);

      if (error) {
        console.error('Error linking characters:', error);
        // Non-fatal error - story already saved
      }
    }
  }

  /**
   * Log API costs
   */
  private static async logCosts(
    userId: string,
    aiConfig: AIConfig,
    tokens: number,
    metadata: any,
    costLogId: string | null
  ): Promise<void> {
    await AIConfigService.logGenerationCost(
      userId,
      metadata.content_id,
      aiConfig,
      tokens,
      metadata,
      costLogId
    );
  }

  /**
   * Fetch story parameters by type
   */
  static async getParametersByType(type: 'genre' | 'tone' | 'length' | 'growth_topic'): Promise<StoryParameter[]> {
    const supabase = await createClient();

    const { data, error } = await supabase
      .from('story_parameters')
      .select('*')
      .eq('type', type)
      .eq('is_active', true)
      .order('display_order');

    if (error) {
      console.error(`Error fetching ${type} parameters:`, error);
      return [];
    }

    return data as StoryParameter[];
  }

  /**
   * Fetch all story parameters grouped by type
   */
  static async getAllParameters(): Promise<Record<string, StoryParameter[]>> {
    const supabase = await createClient();

    const { data, error } = await supabase
      .from('story_parameters')
      .select('*')
      .eq('is_active', true)
      .order('display_order');

    if (error) {
      console.error('Error fetching story parameters:', error);
      return {};
    }

    // Group by type
    const grouped = data.reduce((acc, param) => {
      if (!acc[param.type]) {
        acc[param.type] = [];
      }
      acc[param.type].push(param);
      return acc;
    }, {} as Record<string, StoryParameter[]>);

    return grouped;
  }
}
