/**
 * Beta Story Generation Service
 * Handles story generation with OpenAI using the new scene-based format
 * Generates individual illustrations for each scene using Leonardo AI
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

export class BetaStoryGenerationService {
  /**
   * Main story generation method for Beta engine
   */
  static async generateStory(
    userId: string,
    params: StoryGenerationParams
  ): Promise<any> {
    const supabase = await createClient();
    const startedAt = new Date().toISOString();
    let costLogId: string | null = null;

    console.log('\n' + '='.repeat(80));
    console.log('BETA STORY GENERATION STARTED');
    console.log('='.repeat(80));
    console.log(`User ID: ${userId}`);
    console.log(`Mode: ${params.mode}`);
    console.log(`Illustrations: ${params.includeIllustrations ? 'Yes' : 'No'}`);
    console.log('='.repeat(80) + '\n');

    try {
      // 1. Build generation request
      console.log('Step 1: Building generation request...');
      const request = await this.buildGenerationRequest(params);
      console.log('✅ Generation request built');

      // 2. Build prompt using Beta prompt builder
      console.log('\nStep 2: Building prompt...');
      const promptBuilder = new BetaStoryPromptBuilder();
      const prompt = await promptBuilder.buildPrompt(request);
      console.log('✅ Prompt built');

      // 3. Get AI config for text generation (OpenAI)
      console.log('\nStep 3: Getting AI configuration...');
      const aiConfig = await this.getAIConfigForMode(request.mode);
      if (!aiConfig) {
        throw new Error(`No AI config found for mode: ${request.mode}`);
      }
      console.log(`✅ AI Config: ${aiConfig.name} (${aiConfig.provider}/${aiConfig.model_name})`);

      // 4. Create initial cost log entry
      console.log('\nStep 4: Creating cost log entry...');
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
            engine_version: 'beta',
          },
        })
        .select('id')
        .single();

      costLogId = costLog?.id || null;
      console.log(`✅ Cost log created: ${costLogId}`);

      // 5. Call OpenAI to generate story
      console.log('\nStep 5: Calling OpenAI API...');
      const openAIResponse = await this.callOpenAI(prompt, aiConfig);
      console.log(`✅ OpenAI response received`);
      console.log(`   Tokens used: ${openAIResponse.tokens} (prompt: ${openAIResponse.promptTokens}, completion: ${openAIResponse.completionTokens})`);

      // 6. Parse and validate response
      console.log('\nStep 6: Parsing and validating response...');
      const parsedStory = BetaStoryValidator.extractJSON(openAIResponse.content);
      const validation = BetaStoryValidator.validate(parsedStory, {
        requireIllustrations: request.includeIllustrations,
      });

      BetaStoryValidator.logValidationResult(validation);

      if (!validation.isValid || !validation.story) {
        const errorMsg = BetaStoryValidator.getErrorMessage(validation);
        throw new Error(`Story validation failed:\n${errorMsg}`);
      }

      console.log('✅ Story validated successfully');

      // 7. Save story to database
      console.log('\nStep 7: Saving story to database...');
      const storyId = await this.saveStory(userId, validation.story, request, prompt);
      console.log(`✅ Story saved with ID: ${storyId}`);

      // 8. Link characters
      console.log('\nStep 8: Linking characters...');
      await this.linkCharacters(storyId, request.characters);
      console.log('✅ Characters linked');

      // 9. Update cost log with tokens
      console.log('\nStep 9: Updating cost log...');
      if (costLogId) {
        await AIConfigService.logGenerationCost(
          userId,
          params.heroId,
          aiConfig,
          openAIResponse.tokens,
          {
            prompt_used: prompt,
            prompt_tokens: openAIResponse.promptTokens,
            completion_tokens: openAIResponse.completionTokens,
          },
          costLogId,
          storyId
        );
      }
      console.log('✅ Cost log updated');

      // 10. Generate illustrations if requested
      if (request.includeIllustrations) {
        console.log('\nStep 10: Generating illustrations...');
        try {
          const illustrationResult = await BetaIllustrationService.generateAllIllustrations(
            userId,
            storyId,
            validation.story.scenes,
            validation.story.coverIllustrationPrompt
          );

          console.log(`✅ All illustrations generated (${illustrationResult.sceneIllustrations.length} scenes + 1 cover)`);

          // Update scenes with illustration URLs
          await BetaIllustrationService.updateScenesWithIllustrations(
            storyId,
            validation.story.scenes,
            illustrationResult.sceneIllustrations
          );

          // Update cover illustration
          await BetaIllustrationService.updateCoverIllustration(
            storyId,
            illustrationResult.coverIllustrationUrl
          );

          console.log('✅ Story updated with illustration URLs');
        } catch (error) {
          console.error('❌ Illustration generation failed:', error);
          // Don't fail the entire story generation if illustrations fail
          console.log('⚠️  Continuing without illustrations');
        }
      }

      // 11. Fetch and return final story
      console.log('\nStep 11: Fetching final story...');
      const story = await this.getStory(storyId);
      console.log('✅ Story generation complete!');

      console.log('\n' + '='.repeat(80));
      console.log('BETA STORY GENERATION COMPLETED SUCCESSFULLY');
      console.log('='.repeat(80) + '\n');

      return story;
    } catch (error: any) {
      console.error('\n❌ BETA STORY GENERATION FAILED');
      console.error('Error:', error.message);
      console.error('Stack:', error.stack);

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
   * Build generation request from params
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
   * Fetch and organize characters
   */
  private static async fetchCharacters(
    heroId: string,
    characterIds: string[],
    adHocCharacters: Array<{ name: string; role?: string }>
  ): Promise<CharacterInfo[]> {
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
      });
    }

    // Add supporting characters
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
        });
      }
    });

    // Add ad-hoc characters
    adHocCharacters.forEach(char => {
      characters.push({
        id: '', // Ad-hoc characters don't have IDs
        name: char.name,
        characterType: 'storybook_character',
        appearanceDescription: '',
        role: (char.role as any) || 'friend',
      });
    });

    return characters;
  }

  /**
   * Infer character role from character type
   */
  private static inferRole(
    characterType: string
  ): 'hero' | 'sidekick' | 'pet' | 'friend' | 'family' {
    const roleMap: Record<string, 'hero' | 'sidekick' | 'pet' | 'friend' | 'family'> = {
      child: 'friend',
      pet: 'pet',
      storybook_character: 'sidekick',
      magical_creature: 'friend',
    };
    return roleMap[characterType] || 'friend';
  }

  /**
   * Get AI config for story mode
   */
  private static async getAIConfigForMode(mode: 'fun' | 'growth'): Promise<AIConfig | null> {
    const purpose = mode === 'fun' ? 'story_fun' : 'story_growth';
    return await AIConfigService.getDefaultConfig(purpose);
  }

  /**
   * Call OpenAI API to generate story
   */
  private static async callOpenAI(
    prompt: string,
    aiConfig: AIConfig
  ): Promise<{ content: string; tokens: number; promptTokens: number; completionTokens: number }> {
    const apiKey = process.env.OPENAI_API_KEY;
    if (!apiKey) {
      throw new Error('OpenAI API key not configured');
    }

    const requestBody: any = {
      model: aiConfig.model_id,
      messages: [
        {
          role: 'user',
          content: prompt,
        },
      ],
      max_tokens: aiConfig.settings.max_tokens || 4000, // Increased for Beta engine's detailed prompts
      temperature: aiConfig.settings.temperature || 0.8,
      top_p: aiConfig.settings.top_p || 1.0,
      frequency_penalty: aiConfig.settings.frequency_penalty || 0.3,
      presence_penalty: aiConfig.settings.presence_penalty || 0.3,
    };

    // Use JSON mode if supported (GPT-4 Turbo and later)
    if (aiConfig.model_id.includes('gpt-4') || aiConfig.model_id.includes('gpt-3.5-turbo-1106')) {
      requestBody.response_format = { type: 'json_object' };
    }

    console.log('OpenAI Request:');
    console.log(`  Model: ${requestBody.model}`);
    console.log(`  Max Tokens: ${requestBody.max_tokens}`);
    console.log(`  Temperature: ${requestBody.temperature}`);

    const response = await fetch('https://api.openai.com/v1/chat/completions', {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
        Authorization: `Bearer ${apiKey}`,
      },
      body: JSON.stringify(requestBody),
    });

    if (!response.ok) {
      const errorText = await response.text();
      console.error('OpenAI API Error:', errorText);
      throw new Error(`OpenAI API error: ${response.status} ${response.statusText}`);
    }

    const data = await response.json();

    if (!data.choices || data.choices.length === 0) {
      throw new Error('No response from OpenAI');
    }

    const content = data.choices[0].message.content;
    const tokens = data.usage?.total_tokens || 0;
    const promptTokens = data.usage?.prompt_tokens || 0;
    const completionTokens = data.usage?.completion_tokens || 0;

    return { content, tokens, promptTokens, completionTokens };
  }

  /**
   * Save story to database
   */
  private static async saveStory(
    userId: string,
    story: BetaStoryOpenAIResponse,
    request: BetaStoryGenerationRequest,
    prompt: string
  ): Promise<string> {
    const supabase = createAdminClient();

    // Join paragraphs for legacy body field
    const body = story.scenes.map(scene => scene.paragraph).join('\n\n');

    // Determine age appropriateness
    const heroAge = request.characters.find(c => c.role === 'hero')?.age || 6;
    const ageAppropriateFor = [heroAge, heroAge + 1, heroAge + 2];

    const { data, error } = await supabase
      .from('content')
      .insert({
        user_id: userId,
        content_type: 'story',
        title: story.title,
        body: body,
        theme: request.genre.name,
        age_appropriate_for: ageAppropriateFor,
        generation_prompt: prompt,
        generation_metadata: {
          mode: request.mode,
          genre: request.genre.name,
          tone: request.tone.name,
          length: request.length.name,
          growth_topic: request.growthTopic?.name,
          moral: story.moral,
          paragraphs: story.scenes.map(s => s.paragraph),
          hero_age: heroAge,
          character_count: request.characters.length,
          include_illustrations: request.includeIllustrations,
        },
        include_illustrations: request.includeIllustrations,
        engine_version: 'beta',
        story_scenes: story.scenes.map(scene => ({
          paragraph: scene.paragraph,
          charactersInScene: scene.charactersInScene,
          illustrationPrompt: scene.illustrationPrompt,
        })),
        cover_illustration_prompt: story.coverIllustrationPrompt,
      })
      .select('id')
      .single();

    if (error) {
      console.error('Error saving story:', error);
      throw new Error(`Failed to save story: ${error.message}`);
    }

    return data.id;
  }

  /**
   * Link characters to story
   */
  private static async linkCharacters(
    storyId: string,
    characters: CharacterInfo[]
  ): Promise<void> {
    const supabase = createAdminClient();

    const characterLinks = characters
      .filter(char => char.id) // Only link characters with IDs (not ad-hoc)
      .map(char => ({
        content_id: storyId,
        character_profile_id: char.id,
        role: char.role,
        character_name_in_content: char.name,
      }));

    if (characterLinks.length > 0) {
      const { error } = await supabase.from('content_characters').insert(characterLinks);

      if (error) {
        console.error('Error linking characters:', error);
        throw new Error(`Failed to link characters: ${error.message}`);
      }
    }
  }

  /**
   * Get story by ID
   */
  private static async getStory(storyId: string): Promise<any> {
    const supabase = createAdminClient();

    const { data, error } = await supabase
      .from('content')
      .select('*')
      .eq('id', storyId)
      .single();

    if (error) {
      throw new Error(`Failed to fetch story: ${error.message}`);
    }

    return data;
  }
}
