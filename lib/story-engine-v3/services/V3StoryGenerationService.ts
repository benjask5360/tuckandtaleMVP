/**
 * V3 Story Generation Service
 *
 * Handles story generation with OpenAI for StoryEngine V3.
 * Key differences from V2:
 * - Text-only (no illustrations in Phase 1)
 * - Variable paragraph count based on length
 * - Simpler JSON output format
 */

import { createClient } from '@/lib/supabase/server';
import { createAdminClient } from '@/lib/supabase/admin';
import { V3StoryPromptBuilder } from '../prompt-builders/V3StoryPromptBuilder';
import { AIConfigService, type AIConfig } from '@/lib/services/ai-config';
import { withRetry, isRateLimitError } from '@/lib/utils/retry';
import type {
  V3StoryGenerationParams,
  V3GenerationRequest,
  V3GenerationResult,
  V3Story,
  V3StoryOpenAIResponse,
  V3CharacterInfo,
  V3GenerationMetadata,
} from '../types';

export class V3StoryGenerationService {
  /**
   * Main story generation method for V3 engine
   */
  static async generateStory(
    userId: string,
    params: V3StoryGenerationParams
  ): Promise<V3GenerationResult> {
    const supabase = await createClient();
    const startedAt = new Date().toISOString();
    const overallStartTime = performance.now();
    let costLogId: string | null = null;

    console.log('\n' + '='.repeat(80));
    console.log('V3 STORY GENERATION STARTED');
    console.log('='.repeat(80));
    console.log(`User ID: ${userId}`);
    console.log(`Mode: ${params.mode}`);
    console.log('='.repeat(80) + '\n');

    try {
      // 1. Build generation request
      console.log('Step 1: Building generation request...');
      const request = await this.buildGenerationRequest(params);
      console.log('✅ Generation request built');

      // 2. Build prompt using V3 prompt builder
      console.log('\nStep 2: Building prompt...');
      const promptBuilder = new V3StoryPromptBuilder();
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
          operation: 'story_generation_v3',
          model_used: aiConfig.model_name,
          character_profile_id: params.heroId,
          processing_status: 'processing',
          generation_params: params,
          prompt_used: prompt,
          started_at: startedAt,
          metadata: {
            ai_config_name: aiConfig.name,
            mode: request.mode,
            engine_version: 'v3',
          },
        })
        .select('id')
        .single();

      costLogId = costLog?.id || null;
      console.log(`✅ Cost log created: ${costLogId}`);

      // 5 & 6. Call OpenAI and parse with automatic retry on JSON errors
      console.log('\nStep 5 & 6: Calling OpenAI and parsing response (with auto-retry)...');

      let parsedStory: V3StoryOpenAIResponse | null = null;
      let openAIResponse: { content: string; tokens: number; promptTokens: number; completionTokens: number };
      const maxJsonRetries = 2;

      for (let attempt = 0; attempt <= maxJsonRetries; attempt++) {
        try {
          if (attempt > 0) {
            console.log(`\n🔄 JSON parsing failed, retrying OpenAI call (attempt ${attempt + 1}/${maxJsonRetries + 1})...`);
          }

          const openaiStartTime = performance.now();
          openAIResponse = await this.callOpenAI(prompt, aiConfig);
          const openaiDuration = performance.now() - openaiStartTime;
          console.log(`✅ OpenAI response received (attempt ${attempt + 1})`);
          console.log(`   Tokens used: ${openAIResponse.tokens} (prompt: ${openAIResponse.promptTokens}, completion: ${openAIResponse.completionTokens})`);
          console.log(`⏱️  OpenAI API call: ${(openaiDuration / 1000).toFixed(2)}s (${openaiDuration.toFixed(0)}ms)`);

          // Parse and validate response
          parsedStory = this.parseAndValidateResponse(openAIResponse.content, request.length.name);
          console.log('✅ Story parsed and validated successfully');
          break; // Success! Exit retry loop

        } catch (error: any) {
          if (attempt < maxJsonRetries && (error.message.includes('Invalid JSON') || error.message.includes('validation failed'))) {
            console.warn(`⚠️  JSON parsing/validation failed on attempt ${attempt + 1}, will retry...`);
            console.warn(`   Error: ${error.message}`);
            continue; // Try again
          }
          // Last attempt or non-JSON error - throw it
          throw error;
        }
      }

      if (!parsedStory) {
        throw new Error('Failed to generate valid story after all retries');
      }

      // 7. Transform to V3Story structure
      console.log('\nStep 7: Transforming to V3Story structure...');
      const v3Story = this.transformToV3Story(parsedStory, request.length.name);
      console.log(`✅ V3Story created with ${v3Story.paragraphs.length} paragraphs`);

      // 8. Save story to database
      console.log('\nStep 8: Saving story to database...');
      const saveStartTime = performance.now();
      const storyId = await this.saveStory(userId, v3Story, parsedStory, request, prompt);
      const saveDuration = performance.now() - saveStartTime;
      console.log(`✅ Story saved with ID: ${storyId}`);
      console.log(`⏱️  Save story to DB: ${(saveDuration / 1000).toFixed(2)}s (${saveDuration.toFixed(0)}ms)`);

      // 9. Update cost log with tokens
      console.log('\nStep 9: Updating cost log...');
      if (costLogId) {
        await AIConfigService.logGenerationCost(
          userId,
          params.heroId,
          aiConfig,
          openAIResponse!.tokens,
          {
            prompt_used: prompt,
            prompt_tokens: openAIResponse!.promptTokens,
            completion_tokens: openAIResponse!.completionTokens,
          },
          costLogId,
          storyId
        );
      }
      console.log('✅ Cost log updated');

      // 10. Get usage stats for response
      console.log('\nStep 10: Getting usage stats...');
      const usageStats = await this.getUsageStats(userId);

      const overallDuration = performance.now() - overallStartTime;
      console.log('\n' + '='.repeat(80));
      console.log('V3 STORY GENERATION COMPLETED SUCCESSFULLY');
      console.log(`⏱️  TOTAL Generation Time: ${(overallDuration / 1000).toFixed(2)}s (${overallDuration.toFixed(0)}ms)`);
      console.log('='.repeat(80) + '\n');

      return {
        storyId,
        story: v3Story,
        usage: usageStats,
      };

    } catch (error: any) {
      console.error('\n❌ V3 STORY GENERATION FAILED');
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
    params: V3StoryGenerationParams
  ): Promise<V3GenerationRequest> {
    const supabase = await createClient();

    // Fetch characters
    const characters = await this.fetchCharacters(
      params.heroId,
      params.characterIds || []
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
        id: genre.id,
        name: genre.name,
        displayName: genre.display_name,
        description: genre.description,
      },
      tone: {
        id: tone.id,
        name: tone.name,
        displayName: tone.display_name,
        description: tone.description,
      },
      length: {
        id: length.id,
        name: length.name,
        displayName: length.display_name,
        metadata: length.metadata,
      },
      growthTopic: growthTopic
        ? {
            id: growthTopic.id,
            name: growthTopic.name,
            displayName: growthTopic.display_name,
            description: growthTopic.description,
          }
        : undefined,
      moralLesson: moralLesson
        ? {
            id: moralLesson.id,
            name: moralLesson.name,
            displayName: moralLesson.display_name,
            description: moralLesson.description,
          }
        : undefined,
      customInstructions: params.customInstructions,
    };
  }

  /**
   * Fetch and organize characters
   */
  private static async fetchCharacters(
    heroId: string,
    characterIds: string[]
  ): Promise<V3CharacterInfo[]> {
    const supabase = await createClient();

    const allIds = [heroId, ...characterIds].filter(Boolean);

    const { data: profiles, error } = await supabase
      .from('character_profiles')
      .select('*')
      .in('id', allIds);

    if (error) {
      throw new Error(`Failed to fetch characters: ${error.message}`);
    }

    const characters: V3CharacterInfo[] = [];

    // Add hero
    const heroProfile = profiles?.find(p => p.id === heroId);
    if (heroProfile) {
      characters.push({
        id: heroProfile.id,
        name: heroProfile.name,
        characterType: heroProfile.character_type,
        appearanceDescription: heroProfile.appearance_description || '',
        age: heroProfile.attributes?.age,
        background: heroProfile.attributes?.background,
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
          background: profile.attributes?.background,
          role: this.inferRole(profile.character_type),
        });
      }
    });

    // Detect sibling relationships
    const childCharacters = characters.filter(c => c.characterType === 'child');
    if (childCharacters.length >= 2) {
      const heroName = childCharacters[0].name;
      for (let i = 1; i < childCharacters.length; i++) {
        const child = childCharacters[i];
        const profile = profiles?.find(p => p.id === child.id);
        const gender = profile?.attributes?.gender;
        const relationLabel = gender === 'male' ? 'brother' :
                             gender === 'female' ? 'sister' : 'sibling';
        child.relationship = `${heroName}'s ${relationLabel}`;
      }
    }

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
   * Call OpenAI API with retry logic
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
      max_tokens: aiConfig.settings.max_tokens || 3000, // Slightly less than V2 since no illustration prompts
      temperature: aiConfig.settings.temperature || 0.8,
      top_p: aiConfig.settings.top_p || 1.0,
      frequency_penalty: aiConfig.settings.frequency_penalty || 0.5, // Increased to reduce word repetition (e.g., "Giggleberries")
      presence_penalty: aiConfig.settings.presence_penalty || 0.3,
    };

    // Use JSON mode if supported
    if (aiConfig.model_id.includes('gpt-4') || aiConfig.model_id.includes('gpt-3.5-turbo-1106')) {
      requestBody.response_format = { type: 'json_object' };
    }

    console.log('OpenAI Request:');
    console.log(`  Model: ${requestBody.model}`);
    console.log(`  Max Tokens: ${requestBody.max_tokens}`);
    console.log(`  Temperature: ${requestBody.temperature}`);

    return await withRetry(
      async () => {
        const controller = new AbortController();
        const timeoutId = setTimeout(() => controller.abort(), 90000);

        try {
          const response = await fetch('https://api.openai.com/v1/chat/completions', {
            method: 'POST',
            headers: {
              'Content-Type': 'application/json',
              Authorization: `Bearer ${apiKey}`,
            },
            body: JSON.stringify(requestBody),
            signal: controller.signal,
          });

          clearTimeout(timeoutId);

          if (!response.ok) {
            const errorText = await response.text();
            console.error('OpenAI API Error Response:', {
              status: response.status,
              statusText: response.statusText,
              body: errorText.substring(0, 500),
            });

            const error: any = new Error(
              `OpenAI API error: ${response.status} ${response.statusText}`
            );
            error.status = response.status;
            error.statusText = response.statusText;
            error.responseBody = errorText;
            throw error;
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
        } catch (error: any) {
          clearTimeout(timeoutId);

          if (error.name === 'AbortError') {
            const timeoutError: any = new Error('OpenAI API request timed out after 90 seconds');
            timeoutError.status = 408;
            throw timeoutError;
          }

          throw error;
        }
      },
      {
        maxRetries: 3,
        baseDelayMs: 1000,
        maxDelayMs: 30000,
        timeoutMs: 90000,
        shouldRetry: (error: any, attempt: number) => {
          if (attempt >= 3) return false;

          if (isRateLimitError(error)) {
            console.warn('⚠️  Rate limit detected, will retry with extended delay');
            return true;
          }

          const retryableStatuses = [408, 429, 500, 502, 503, 504];
          if (retryableStatuses.includes(error.status)) {
            return true;
          }

          const networkErrors = ['ENOTFOUND', 'ECONNRESET', 'ETIMEDOUT', 'ECONNREFUSED', 'fetch failed'];
          if (error.message && networkErrors.some(msg => error.message.includes(msg))) {
            console.warn('⚠️  Network error detected, will retry');
            return true;
          }

          return false;
        },
        onRetry: (error, attempt, delayMs) => {
          console.warn(
            `🔄 OpenAI API retry attempt ${attempt}/3 ` +
            `(${error.status || 'unknown'} error). ` +
            `Waiting ${delayMs}ms before retry...`
          );
        },
      }
    );
  }

  /**
   * Parse and validate OpenAI response
   */
  private static parseAndValidateResponse(
    content: string,
    lengthName: string
  ): V3StoryOpenAIResponse {
    let parsed: any;

    try {
      // Try to extract JSON from the response
      const jsonMatch = content.match(/\{[\s\S]*\}/);
      if (!jsonMatch) {
        throw new Error('No JSON object found in response');
      }
      parsed = JSON.parse(jsonMatch[0]);
    } catch (e) {
      throw new Error(`Invalid JSON in response: ${e}`);
    }

    // Validate required fields
    if (!parsed.title || typeof parsed.title !== 'string') {
      throw new Error('Story validation failed: missing or invalid title');
    }

    if (!Array.isArray(parsed.paragraphs) || parsed.paragraphs.length === 0) {
      throw new Error('Story validation failed: missing or empty paragraphs array');
    }

    // Validate paragraph count
    const expectedRange = this.getParagraphRange(lengthName);
    const paragraphCount = parsed.paragraphs.length;

    if (paragraphCount < expectedRange.min - 1 || paragraphCount > expectedRange.max + 2) {
      // Allow some flexibility but warn if outside expected range
      console.warn(`⚠️  Paragraph count (${paragraphCount}) outside expected range (${expectedRange.min}-${expectedRange.max})`);
    }

    // Validate each paragraph is a non-empty string
    for (let i = 0; i < parsed.paragraphs.length; i++) {
      if (typeof parsed.paragraphs[i] !== 'string' || parsed.paragraphs[i].trim() === '') {
        throw new Error(`Story validation failed: paragraph ${i + 1} is empty or not a string`);
      }
    }

    return {
      title: parsed.title,
      paragraphs: parsed.paragraphs,
      moral: parsed.moral || undefined,
    };
  }

  /**
   * Get paragraph count range for length
   */
  private static getParagraphRange(lengthName: string): { min: number; max: number } {
    const lengthLower = lengthName.toLowerCase();
    if (lengthLower === 'short') {
      return { min: 6, max: 7 };
    } else if (lengthLower === 'long') {
      return { min: 10, max: 12 };
    }
    return { min: 8, max: 9 }; // medium
  }

  /**
   * Transform OpenAI response to V3Story structure
   */
  private static transformToV3Story(
    response: V3StoryOpenAIResponse,
    lengthName: string
  ): V3Story {
    return {
      title: response.title,
      length: lengthName.toLowerCase() as 'short' | 'medium' | 'long',
      paragraphs: response.paragraphs.map((text, index) => ({
        id: `p${index + 1}`,
        text: text.trim(),
      })),
    };
  }

  /**
   * Save story to database
   */
  private static async saveStory(
    userId: string,
    v3Story: V3Story,
    rawResponse: V3StoryOpenAIResponse,
    request: V3GenerationRequest,
    prompt: string
  ): Promise<string> {
    const supabase = createAdminClient();

    // Join paragraphs for legacy body field
    const body = v3Story.paragraphs.map(p => p.text).join('\n\n');

    // Determine age appropriateness
    const heroAge = request.characters.find(c => c.role === 'hero')?.age || 6;
    const ageAppropriateFor = [heroAge, heroAge + 1, heroAge + 2];

    // Build generation metadata
    const generationMetadata: V3GenerationMetadata = {
      v3_story: v3Story,
      mode: request.mode,
      genre_display: request.genre.displayName,
      tone_display: request.tone.displayName,
      length_display: request.length.displayName,
      growth_topic_display: request.growthTopic?.displayName,
      moral: rawResponse.moral,
      paragraphs: v3Story.paragraphs.map(p => p.text),
      characters: request.characters,
      ai_config_name: 'v3_generation',
    };

    const { data, error } = await supabase
      .from('content')
      .insert({
        user_id: userId,
        content_type: 'story',
        title: v3Story.title,
        body: body,
        theme: request.genre.name,
        age_appropriate_for: ageAppropriateFor,
        generation_prompt: prompt,
        generation_metadata: generationMetadata,
        include_illustrations: false, // V3 Phase 1 is text-only
        engine_version: 'v3',
        generation_status: 'complete', // Text-only is immediately complete
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
   * Get usage stats for response
   */
  private static async getUsageStats(userId: string): Promise<{
    monthlyRemaining: number;
    monthlyLimit: number;
  }> {
    // Import dynamically to avoid circular dependency
    const { StoryUsageLimitsService } = await import('@/lib/services/story-usage-limits');

    const limits = await StoryUsageLimitsService.canGenerate(userId, false); // V3 is text-only

    return {
      monthlyRemaining: limits.monthlyRemaining === Infinity ? -1 : limits.monthlyRemaining,
      monthlyLimit: limits.monthlyLimit === null ? -1 : limits.monthlyLimit,
    };
  }
}
