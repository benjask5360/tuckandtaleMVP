/**
 * Beta Story Streaming Service - SIMPLIFIED MVP VERSION
 * Creates story record immediately and generates content asynchronously
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
} from '../types/beta-story-types';
import type { StoryGenerationParams } from '@/lib/types/story-types';

export class BetaStoryStreamingService {
  /**
   * Start story generation and return story ID immediately
   */
  static async startGeneration(
    userId: string,
    params: StoryGenerationParams
  ): Promise<{ storyId: string; streamUrl: string }> {
    const adminSupabase = createAdminClient();

    // Build generation request
    const request = await this.buildGenerationRequest(params);

    // Create initial story record
    const { data: story, error: storyError } = await adminSupabase
      .from('content')
      .insert({
        user_id: userId,
        title: 'Generating your story...',
        body: '',
        content_type: 'story',
        generation_status: 'generating',
        engine_version: 'beta',
        story_scenes: [],
        generation_metadata: {
          mode: params.mode,
          genre: request.genre.name,
          genre_display: request.genre.displayName,
          tone: request.tone.name,
          tone_display: request.tone.displayName,
          length: request.length.name,
          length_display: request.length.displayName,
          growth_topic: request.growthTopic?.name,
          growth_topic_display: request.growthTopic?.displayName,
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
      console.error('Failed to create story record:', storyError);
      throw new Error(`Failed to create story record: ${storyError?.message || 'Unknown error'}`);
    }

    // Start async generation (fire and forget)
    this.generateStoryAsync(story.id, userId, request, params);

    return {
      storyId: story.id,
      streamUrl: `/api/stories/${story.id}/stream`,
    };
  }

  /**
   * Generate story asynchronously - SIMPLIFIED VERSION
   */
  private static async generateStoryAsync(
    storyId: string,
    userId: string,
    request: BetaStoryGenerationRequest,
    params: StoryGenerationParams
  ): Promise<void> {
    const adminSupabase = createAdminClient();

    try {
      // 1. Build prompt
      const promptBuilder = new BetaStoryPromptBuilder();
      const prompt = await promptBuilder.buildPrompt(request);

      // 2. Get AI config
      const aiConfig = await this.getAIConfigForMode(request.mode);
      if (!aiConfig) {
        throw new Error(`No AI config found for mode: ${request.mode}`);
      }

      // 3. Call OpenAI - SIMPLE NON-STREAMING VERSION
      console.log('Calling OpenAI for story generation...');
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
          response_format: { type: 'json_object' }, // Works perfectly without streaming
        }),
      });

      if (!response.ok) {
        const errorText = await response.text();
        throw new Error(`OpenAI API error: ${response.status} - ${errorText}`);
      }

      // 4. Parse complete response
      const data = await response.json();
      const storyContent = data.choices[0].message.content;

      console.log('OpenAI response received, parsing...');
      const parsedStory: BetaStoryOpenAIResponse = BetaStoryValidator.extractJSON(storyContent);

      // 5. Validate story - but don't fail completely if only illustrations are missing
      const validation = BetaStoryValidator.validate(parsedStory, {
        requireIllustrations: request.includeIllustrations,
      });

      if (!validation.isValid) {
        // Check if we at least have the core story content
        const hasTitle = parsedStory.title && typeof parsedStory.title === 'string';
        const hasScenes = Array.isArray(parsedStory.scenes) && parsedStory.scenes.length > 0;
        const hasParagraphs = hasScenes && parsedStory.scenes.every((s: any) => s.paragraph);

        if (!hasTitle || !hasScenes || !hasParagraphs) {
          // Core story content is missing - this is a real failure
          console.error('Story validation failed with critical errors:', validation.errors);
          throw new Error(`Story validation failed: ${validation.errors.join(', ')}`);
        }

        // We have story content but maybe missing illustrations - continue anyway
        console.warn('Story validation has warnings, but continuing with story text:', validation.errors);
        console.warn('Warnings:', validation.warnings);
        // Disable illustrations if validation failed
        request.includeIllustrations = false;
      }

      // 6. Build paragraphs array from scenes
      const paragraphs = parsedStory.scenes.map(scene => scene.paragraph);

      // 7. Update story with complete content IN ONE GO
      console.log('Saving complete story to database...');
      const { error: updateError } = await adminSupabase
        .from('content')
        .update({
          title: parsedStory.title,
          body: paragraphs.join('\n\n'),
          generation_status: 'text_complete',
          story_scenes: parsedStory.scenes,
          cover_illustration_prompt: parsedStory.coverIllustrationPrompt,
          generation_metadata: {
            mode: params.mode,
            genre: request.genre.name,
            genre_display: request.genre.displayName,
            tone: request.tone.name,
            tone_display: request.tone.displayName,
            length: request.length.name,
            length_display: request.length.displayName,
            growth_topic: request.growthTopic?.name,
            growth_topic_display: request.growthTopic?.displayName,
            moral_lesson: request.moralLesson?.name,
            moral: parsedStory.moral,
            paragraphs: paragraphs,
            characters: request.characters.map(char => ({
              character_profile_id: char.id || null,
              character_name: char.name,
              profile_type: char.characterType || null,
            })),
            completed_at: new Date().toISOString(),
            is_beta_engine: true,
          },
        })
        .eq('id', storyId);

      if (updateError) {
        console.error('Failed to save story to database:', updateError);
        throw updateError;
      }

      console.log('Story saved successfully!');

      // 8. Start illustration generation if requested and we have valid prompts
      if (request.includeIllustrations && parsedStory.coverIllustrationPrompt) {
        console.log('Starting illustration generation...');
        BetaIllustrationService.generateAllIllustrations(
          userId,
          storyId,
          parsedStory.scenes,
          parsedStory.coverIllustrationPrompt
        ).then(() => {
          // Mark as fully complete when illustrations are done
          adminSupabase
            .from('content')
            .update({ generation_status: 'complete' })
            .eq('id', storyId)
            .then(() => console.log('Story marked as complete with illustrations'));
        }).catch(error => {
          console.error('Error generating illustrations:', error);
          // Still mark as complete even if illustrations fail
          adminSupabase
            .from('content')
            .update({ generation_status: 'complete' })
            .eq('id', storyId)
            .then(() => console.log('Story marked as complete (illustrations failed)'));
        });
      } else {
        // No illustrations or missing prompts, mark as complete now
        if (request.includeIllustrations && !parsedStory.coverIllustrationPrompt) {
          console.warn('Illustrations requested but coverIllustrationPrompt is missing');
        }
        await adminSupabase
          .from('content')
          .update({ generation_status: 'complete' })
          .eq('id', storyId);
      }

    } catch (error) {
      console.error('Error in story generation:', error);

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