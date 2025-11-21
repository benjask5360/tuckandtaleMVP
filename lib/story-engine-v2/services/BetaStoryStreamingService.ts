/**
 * Beta Story Streaming Service
 * Handles streaming story generation for better UX
 * Returns story ID immediately and streams content as it's generated
 */

import { createClient } from '@/lib/supabase/server';
import { createAdminClient } from '@/lib/supabase/admin';
import { BetaStoryPromptBuilder } from '../prompt-builders/BetaStoryPromptBuilder';
import { BetaStoryValidator } from './BetaStoryValidator';
import { BetaIllustrationService } from './BetaIllustrationService';
import { AIConfigService, type AIConfig } from '@/lib/services/ai-config';
import type {
  BetaStoryGenerationRequest,
  BetaStoryOpenAIResponse,
  CharacterInfo,
  Scene,
} from '../types/beta-story-types';
import type { StoryGenerationParams } from '@/lib/types/story-types';

export class BetaStoryStreamingService {
  /**
   * Start story generation and return story ID immediately
   * Story content will be streamed and saved progressively
   */
  static async startGeneration(
    userId: string,
    params: StoryGenerationParams
  ): Promise<{ storyId: string; streamUrl: string }> {
    const supabase = await createClient();
    const adminSupabase = createAdminClient();

    // Build generation request
    const request = await this.buildGenerationRequest(params);

    // Create initial story record with pending status
    const { data: story, error: storyError } = await adminSupabase
      .from('content')
      .insert({
        user_id: userId,
        title: 'Generating your story...',
        story_text: '',
        paragraphs: [],
        generation_status: 'generating',
        generation_metadata: {
          mode: params.mode,
          genre: request.genre.name,
          tone: request.tone.name,
          length: request.length.name,
          growth_topic: request.growthTopic?.name,
          moral_lesson: request.moralLesson?.name,
          characters: request.characters.map(char => ({
            character_profile_id: char.id || null,
            character_name: char.name,
            profile_type: char.characterType || null,
          })),
          generation_started_at: new Date().toISOString(),
          is_beta_engine: true,
        },
        created_at: new Date().toISOString(),
      })
      .select('id')
      .single();

    if (storyError || !story) {
      throw new Error('Failed to create story record');
    }

    // Start async generation process
    this.generateStoryAsync(story.id, userId, request, params);

    return {
      storyId: story.id,
      streamUrl: `/api/stories/${story.id}/stream`,
    };
  }

  /**
   * Generate story asynchronously and update database progressively
   */
  private static async generateStoryAsync(
    storyId: string,
    userId: string,
    request: BetaStoryGenerationRequest,
    params: StoryGenerationParams
  ): Promise<void> {
    const adminSupabase = createAdminClient();

    try {
      // Build prompt
      const promptBuilder = new BetaStoryPromptBuilder();
      const prompt = await promptBuilder.buildPrompt(request);

      // Get AI config
      const aiConfig = await this.getAIConfigForMode(request.mode);
      if (!aiConfig) {
        throw new Error(`No AI config found for mode: ${request.mode}`);
      }

      // Stream from OpenAI
      const streamResponse = await this.streamFromOpenAI(prompt, aiConfig);

      let accumulatedContent = '';
      let lastUpdate = Date.now();
      const UPDATE_INTERVAL = 500; // Update database every 500ms

      for await (const chunk of streamResponse) {
        accumulatedContent += chunk;

        // Update database periodically, not on every chunk
        if (Date.now() - lastUpdate > UPDATE_INTERVAL) {
          await this.updateStoryProgress(storyId, accumulatedContent);
          lastUpdate = Date.now();
        }
      }

      // Final update with complete content
      await this.finalizeStory(storyId, userId, accumulatedContent, request, params);

    } catch (error) {
      console.error('Error in async story generation:', error);

      // Update story with error status
      await adminSupabase
        .from('content')
        .update({
          generation_status: 'error',
          generation_metadata: {
            error: error instanceof Error ? error.message : 'Unknown error',
            failed_at: new Date().toISOString(),
          },
        })
        .eq('id', storyId);
    }
  }

  /**
   * Stream content from OpenAI API
   */
  private static async *streamFromOpenAI(
    prompt: string,
    aiConfig: AIConfig
  ): AsyncGenerator<string, void, unknown> {
    const apiKey = process.env.OPENAI_API_KEY;
    if (!apiKey) {
      throw new Error('OpenAI API key not configured');
    }

    const response = await fetch('https://api.openai.com/v1/chat/completions', {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
        Authorization: `Bearer ${apiKey}`,
      },
      body: JSON.stringify({
        model: aiConfig.model_id,
        messages: [
          {
            role: 'user',
            content: prompt,
          },
        ],
        max_tokens: aiConfig.settings.max_tokens || 4000,
        temperature: aiConfig.settings.temperature || 0.8,
        stream: true,
        response_format: { type: 'json_object' },
      }),
    });

    if (!response.ok) {
      throw new Error(`OpenAI API error: ${response.status}`);
    }

    const reader = response.body?.getReader();
    if (!reader) {
      throw new Error('No response body');
    }

    const decoder = new TextDecoder();
    let buffer = '';

    while (true) {
      const { done, value } = await reader.read();
      if (done) break;

      buffer += decoder.decode(value, { stream: true });
      const lines = buffer.split('\n');
      buffer = lines.pop() || '';

      for (const line of lines) {
        if (line.startsWith('data: ')) {
          const data = line.slice(6);
          if (data === '[DONE]') continue;

          try {
            const parsed = JSON.parse(data);
            const content = parsed.choices?.[0]?.delta?.content;
            if (content) {
              yield content;
            }
          } catch (e) {
            // Skip invalid JSON
          }
        }
      }
    }
  }

  /**
   * Update story with partial content
   */
  private static async updateStoryProgress(
    storyId: string,
    partialContent: string
  ): Promise<void> {
    const adminSupabase = createAdminClient();

    // Try to parse partial JSON
    let parsedData: Partial<BetaStoryOpenAIResponse> | null = null;
    try {
      // Attempt to parse, even if incomplete
      parsedData = JSON.parse(partialContent + '}]}'); // Add closing brackets
    } catch {
      // If parsing fails, just show raw text progress
    }

    await adminSupabase
      .from('content')
      .update({
        story_text: parsedData?.title || 'Story generating...',
        generation_metadata: {
          progress: {
            scenes_generated: parsedData?.scenes?.length || 0,
            total_scenes: 8,
            last_update: new Date().toISOString(),
          },
        },
      })
      .eq('id', storyId);
  }

  /**
   * Finalize story with complete content and start illustration generation
   */
  private static async finalizeStory(
    storyId: string,
    userId: string,
    completeContent: string,
    request: BetaStoryGenerationRequest,
    params: StoryGenerationParams
  ): Promise<void> {
    const adminSupabase = createAdminClient();

    // Parse and validate complete story
    const parsedStory: BetaStoryOpenAIResponse = BetaStoryValidator.extractJSON(completeContent);
    const validation = BetaStoryValidator.validate(parsedStory, {
      requireIllustrations: request.includeIllustrations,
    });

    if (!validation.isValid) {
      throw new Error(`Story validation failed: ${validation.errors.join(', ')}`);
    }

    // Build paragraphs array from scenes
    const paragraphs = parsedStory.scenes.map(scene => scene.paragraph);

    // Update story with complete content
    await adminSupabase
      .from('content')
      .update({
        title: parsedStory.title,
        story_text: paragraphs.join('\n\n'),
        paragraphs,
        moral: parsedStory.moral,
        generation_status: 'complete',
        story_scenes: parsedStory.scenes,
        cover_illustration_prompt: parsedStory.coverIllustrationPrompt,
        generation_metadata: {
          completed_at: new Date().toISOString(),
        },
      })
      .eq('id', storyId);

    // Start illustration generation if requested
    if (request.includeIllustrations && parsedStory.coverIllustrationPrompt) {
      BetaIllustrationService.generateAllIllustrations(
        userId,
        storyId,
        parsedStory.scenes,
        parsedStory.coverIllustrationPrompt
      ).catch(error => {
        console.error('Error generating illustrations:', error);
      });
    }
  }

  /**
   * Build generation request from params (reuse from original service)
   */
  private static async buildGenerationRequest(
    params: StoryGenerationParams
  ): Promise<BetaStoryGenerationRequest> {
    const supabase = await createClient();

    // Fetch characters
    const characters = await this.fetchCharacters(
      params.heroId,
      params.characterIds || [],
      params.adHocCharacters || []
    );

    // Fetch story parameters
    const parameterIds = [
      params.genreId,
      params.toneId,
      params.lengthId,
      params.growthTopicId,
      params.moralLessonId,
    ].filter(Boolean);

    const { data: parameters } = await supabase
      .from('story_parameters')
      .select('*')
      .in('id', parameterIds);

    const genre = parameters?.find(p => p.id === params.genreId);
    const tone = parameters?.find(p => p.id === params.toneId);
    const length = parameters?.find(p => p.id === params.lengthId);
    const growthTopic = params.growthTopicId
      ? parameters?.find(p => p.id === params.growthTopicId)
      : undefined;
    const moralLesson = params.moralLessonId
      ? parameters?.find(p => p.id === params.moralLessonId)
      : undefined;

    if (!genre || !tone || !length) {
      throw new Error('Required story parameters not found');
    }

    return {
      mode: params.mode,
      characters,
      genre: {
        name: genre.name,
        displayName: genre.display_name,
        description: genre.description,
      },
      tone: {
        name: tone.name,
        displayName: tone.display_name,
        description: tone.description,
      },
      length: {
        name: length.name,
        displayName: length.display_name,
        metadata: length.metadata,
      },
      growthTopic: growthTopic
        ? {
            name: growthTopic.name,
            displayName: growthTopic.display_name,
            description: growthTopic.description,
          }
        : undefined,
      moralLesson: moralLesson
        ? {
            name: moralLesson.name,
            displayName: moralLesson.display_name,
            description: moralLesson.description,
          }
        : undefined,
      customInstructions: params.customInstructions,
      includeIllustrations: params.includeIllustrations || false,
    };
  }

  /**
   * Fetch and organize characters (reuse from original service)
   */
  private static async fetchCharacters(
    heroId: string,
    characterIds: string[],
    adHocCharacters: Array<{ name: string; role?: string }>
  ): Promise<CharacterInfo[]> {
    const supabase = await createClient();

    const allIds = [heroId, ...characterIds].filter(Boolean);

    const { data: profiles, error } = await supabase
      .from('character_profiles')
      .select('*')
      .in('id', allIds);

    if (error) {
      throw new Error(`Failed to fetch characters: ${error.message}`);
    }

    const characters: CharacterInfo[] = [];

    // Add hero
    const heroProfile = profiles?.find(p => p.id === heroId);
    if (heroProfile) {
      characters.push({
        id: heroProfile.id,
        name: heroProfile.name,
        characterType: heroProfile.character_type,
        appearanceDescription: heroProfile.appearance_description || '',
        age: heroProfile.attributes?.age,
        role: 'hero',
        attributes: heroProfile.attributes,
      });
    }

    // Add supporting characters with sibling detection
    characterIds.forEach(id => {
      const profile = profiles?.find(p => p.id === id);
      if (profile) {
        characters.push({
          id: profile.id,
          name: profile.name,
          characterType: profile.character_type,
          appearanceDescription: profile.appearance_description || '',
          age: profile.attributes?.age,
          role: this.inferRole(profile.character_type),
          attributes: profile.attributes,
        });
      }
    });

    // Apply sibling detection logic
    const childCharacters = characters.filter(c => c.characterType === 'child');
    if (childCharacters.length >= 2) {
      const heroName = childCharacters[0].name;
      for (let i = 1; i < childCharacters.length; i++) {
        const child = childCharacters[i];
        const gender = child.attributes?.gender;
        const relationLabel = gender === 'male' ? 'brother' :
                             gender === 'female' ? 'sister' : 'sibling';
        child.relationship = `${heroName}'s ${relationLabel}`;
      }
    }

    // Add ad-hoc characters
    adHocCharacters.forEach(char => {
      characters.push({
        id: '',
        name: char.name,
        characterType: 'storybook_character',
        appearanceDescription: '',
        role: char.role as any || 'friend',
      });
    });

    return characters;
  }

  /**
   * Infer role from character type
   */
  private static inferRole(
    characterType: string
  ): 'hero' | 'sidekick' | 'friend' | 'family' | 'pet' {
    switch (characterType) {
      case 'pet':
        return 'pet';
      case 'magical_creature':
        return 'friend';
      case 'storybook_character':
        return 'friend';
      case 'child':
      default:
        return 'friend';
    }
  }

  /**
   * Get AI config for mode
   */
  private static async getAIConfigForMode(
    mode: 'fun' | 'growth'
  ): Promise<AIConfig | null> {
    const purpose = mode === 'fun' ? 'story_fun' : 'story_growth';
    return await AIConfigService.getDefaultConfig(purpose);
  }
}