/**
 * V3 Story Streaming API Route
 *
 * POST /api/story-engine/v3/stream
 *
 * Generates a story using StoryEngine V3 with real-time streaming.
 * Uses Server-Sent Events (SSE) to send content as it's generated.
 */

// Force Node.js runtime for streaming support
export const runtime = 'nodejs';
export const dynamic = 'force-dynamic';

import { createClient } from '@/lib/supabase/server';
import { createAdminClient } from '@/lib/supabase/admin';
import { V3StoryPromptBuilder } from '@/lib/story-engine-v3/prompt-builders/V3StoryPromptBuilder';
import { AIConfigService, type AIConfig } from '@/lib/services/ai-config';
import { StoryUsageLimitsService } from '@/lib/services/story-usage-limits';
import { StoryCompletionService } from '@/lib/services/story-completion';
import { parser } from 'stream-json';
import { PassThrough } from 'stream';
import type {
  V3StoryGenerationParams,
  V3GenerationRequest,
  V3Story,
  V3StoryOpenAIResponse,
  V3CharacterInfo,
  V3GenerationMetadata,
} from '@/lib/story-engine-v3/types';

// SSE Event Types
interface StreamCallbacks {
  onTitle: (title: string) => void;
  onParagraph: (index: number, text: string) => void;
  onMoral: (moral: string) => void;
  onComplete: (fullJson: V3StoryOpenAIResponse) => Promise<void>;
  onError: (error: Error) => void;
}

export async function POST(request: Request) {
  const encoder = new TextEncoder();

  // Parse request body BEFORE creating stream (body can only be read once)
  let params: V3StoryGenerationParams;
  try {
    // Read the body stream manually to handle chunked requests properly
    if (request.body) {
      const reader = request.body.getReader();
      const chunks: Uint8Array[] = [];
      let done = false;

      while (!done) {
        const result = await reader.read();
        done = result.done;
        if (result.value) {
          chunks.push(result.value);
        }
      }

      const totalLength = chunks.reduce((acc, chunk) => acc + chunk.length, 0);

      if (totalLength === 0) {
        return new Response(JSON.stringify({ error: 'Empty request body' }), {
          status: 400,
          headers: { 'Content-Type': 'application/json' },
        });
      }

      // Combine chunks and decode
      const combined = new Uint8Array(totalLength);
      let offset = 0;
      for (const chunk of chunks) {
        combined.set(chunk, offset);
        offset += chunk.length;
      }

      const bodyText = new TextDecoder().decode(combined);
      params = JSON.parse(bodyText);
    } else {
      return new Response(JSON.stringify({ error: 'No request body' }), {
        status: 400,
        headers: { 'Content-Type': 'application/json' },
      });
    }
  } catch (parseError: any) {
    console.error('[V3 Stream] JSON parse error:', parseError.message);
    return new Response(JSON.stringify({ error: 'Invalid request format' }), {
      status: 400,
      headers: { 'Content-Type': 'application/json' },
    });
  }

  // Validate required fields early
  if (!params.heroId || !params.mode || !params.genreId || !params.toneId || !params.lengthId) {
    return new Response(JSON.stringify({ error: 'Missing required fields' }), {
      status: 400,
      headers: { 'Content-Type': 'application/json' },
    });
  }

  // Helper to send SSE events
  const sendEvent = (controller: ReadableStreamDefaultController, data: object) => {
    controller.enqueue(encoder.encode(`data: ${JSON.stringify(data)}\n\n`));
  };

  const stream = new ReadableStream({
    async start(controller) {
      let userId: string | null = null;
      let costLogId: string | null = null;
      let generationRequest: V3GenerationRequest | null = null;
      let prompt: string | null = null;

      try {
        const supabase = await createClient();

        // Get authenticated user
        const {
          data: { user },
          error: authError,
        } = await supabase.auth.getUser();

        if (authError || !user) {
          sendEvent(controller, { type: 'error', message: 'Unauthorized' });
          controller.close();
          return;
        }

        userId = user.id;

        // Validate mode-specific requirements
        if (params.mode === 'growth' && !params.growthTopicId) {
          sendEvent(controller, { type: 'error', message: 'growthTopicId is required for growth mode' });
          controller.close();
          return;
        }

        // Check usage limits (includes paywall check for free users and subscription limits)
        const usageCheck = await StoryUsageLimitsService.canGenerate(user.id, params.includeIllustrations ?? true);
        if (!usageCheck.allowed) {
          const message = usageCheck.reason === 'subscription_limit_reached'
            ? `You've used all ${usageCheck.billingCycleInfo?.limit || 30} stories this month. Your limit resets in ${usageCheck.billingCycleInfo?.daysUntilReset || 0} days.`
            : usageCheck.reason === 'paywall_required'
            ? 'Payment required to generate this story'
            : 'Story generation limit reached';
          sendEvent(controller, { type: 'error', message });
          controller.close();
          return;
        }

        // Track whether we're using a generation credit and subscription status
        const hasSubscription = usageCheck.paywallBehavior?.hasSubscription || false;
        const usingCredit = params.useCredit && (usageCheck.paywallBehavior?.hasCredits || false);

        // Send initial event to indicate stream started
        sendEvent(controller, { type: 'started' });

        // Build generation request
        generationRequest = await buildGenerationRequest(params);

        // Build prompt
        const promptBuilder = new V3StoryPromptBuilder();
        prompt = await promptBuilder.buildPrompt(generationRequest);

        // Get AI config
        const aiConfig = await getAIConfigForMode(generationRequest.mode);
        if (!aiConfig) {
          sendEvent(controller, { type: 'error', message: 'Story generation service not configured' });
          controller.close();
          return;
        }

        // Create cost log entry
        const { data: costLog } = await supabase
          .from('api_cost_logs')
          .insert({
            user_id: userId,
            provider: aiConfig.provider,
            operation: 'story_generation_v3_stream',
            model_used: aiConfig.model_name,
            character_profile_id: params.heroId,
            processing_status: 'processing',
            generation_params: params,
            prompt_used: prompt,
            started_at: new Date().toISOString(),
            metadata: {
              ai_config_name: aiConfig.name,
              mode: generationRequest.mode,
              engine_version: 'v3',
              streaming: true,
            },
          })
          .select('id')
          .single();

        costLogId = costLog?.id || null;

        // Stream OpenAI with callbacks
        await streamOpenAI(prompt, aiConfig, {
          onTitle: (title) => {
            sendEvent(controller, { type: 'title', text: title });
          },
          onParagraph: (index, text) => {
            sendEvent(controller, { type: 'paragraph', index, text });
          },
          onMoral: (moral) => {
            sendEvent(controller, { type: 'moral', text: moral });
          },
          onComplete: async (fullJson) => {
            try {
              // Transform and save story
              const v3Story = transformToV3Story(fullJson, generationRequest!.length.name);
              const storyId = await saveStory(userId!, v3Story, fullJson, generationRequest!, prompt!, params.includeIllustrations ?? false);

              // Update cost log
              if (costLogId) {
                await supabase
                  .from('api_cost_logs')
                  .update({
                    processing_status: 'completed',
                    completed_at: new Date().toISOString(),
                    content_id: storyId,
                  })
                  .eq('id', costLogId);
              }

              // Increment total story count (tracks ALL completed stories)
              const newStoryCount = await StoryCompletionService.incrementTotalStoryCount(userId!);

              // If used a generation credit, deduct it
              if (usingCredit) {
                await StoryCompletionService.consumeGenerationCredit(userId!);
              }

              // If this is story #2 and user doesn't have subscription, mark as requiring paywall
              // (Story #1 is free trial, story #3+ blocked before generation)
              if (newStoryCount === 2 && !hasSubscription) {
                await StoryCompletionService.markStoryRequiresPaywall(storyId);
              }

              // Send complete event with story ID
              sendEvent(controller, { type: 'complete', storyId });
              controller.close();
            } catch (saveError: any) {
              sendEvent(controller, { type: 'error', message: `Failed to save story: ${saveError.message}` });
              controller.close();
            }
          },
          onError: (error) => {
            sendEvent(controller, { type: 'error', message: error.message });
            controller.close();
          },
        });

      } catch (error: any) {
        console.error('Streaming error:', error);

        // Update cost log to failed
        if (costLogId && userId) {
          const supabase = await createClient();
          await supabase
            .from('api_cost_logs')
            .update({
              processing_status: 'failed',
              error_message: error.message,
              completed_at: new Date().toISOString(),
            })
            .eq('id', costLogId);
        }

        sendEvent(controller, { type: 'error', message: error.message || 'Generation failed' });
        controller.close();
      }
    },
  });

  return new Response(stream, {
    headers: {
      'Content-Type': 'text/event-stream',
      'Cache-Control': 'no-cache',
      'Connection': 'keep-alive',
    },
  });
}

/**
 * Stream OpenAI response and parse JSON incrementally using stream-json
 */
async function streamOpenAI(
  prompt: string,
  aiConfig: AIConfig,
  callbacks: StreamCallbacks
): Promise<void> {
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
      messages: [{ role: 'user', content: prompt }],
      max_tokens: aiConfig.settings.max_tokens || 2500,
      temperature: aiConfig.settings.temperature || 0.8,
      top_p: aiConfig.settings.top_p || 1.0,
      frequency_penalty: aiConfig.settings.frequency_penalty || 0.3,
      presence_penalty: aiConfig.settings.presence_penalty || 0.3,
      response_format: { type: 'json_object' },
      stream: true,
    }),
  });

  if (!response.ok) {
    const errorText = await response.text();
    throw new Error(`OpenAI API error: ${response.status} - ${errorText.substring(0, 200)}`);
  }

  const reader = response.body!.getReader();
  const decoder = new TextDecoder();

  // Create a pass-through stream for feeding to stream-json
  const jsonInputStream = new PassThrough();

  // Set up stream-json parser
  const jsonParser = parser();
  jsonInputStream.pipe(jsonParser);

  let jsonBuffer = '';
  let titleEmitted = false;
  let paragraphIndex = 0;
  let moralEmitted = false;
  let inParagraphsArray = false;
  let currentKey = '';

  // Promise to track when parsing is complete
  let parserResolve: () => void;
  let parserReject: (error: Error) => void;
  const parserComplete = new Promise<void>((resolve, reject) => {
    parserResolve = resolve;
    parserReject = reject;
  });

  // Handle parsed JSON tokens
  jsonParser.on('data', (token: { name: string; value?: string }) => {
    const { name, value } = token;

    if (name === 'keyValue' && value) {
      currentKey = value;
    } else if (name === 'startArray' && currentKey === 'paragraphs') {
      inParagraphsArray = true;
    } else if (name === 'endArray' && inParagraphsArray) {
      inParagraphsArray = false;
    } else if (name === 'stringValue' && value !== undefined) {
      if (currentKey === 'title' && !titleEmitted) {
        callbacks.onTitle(value);
        titleEmitted = true;
      } else if (inParagraphsArray) {
        callbacks.onParagraph(paragraphIndex++, value);
      } else if (currentKey === 'moral' && !moralEmitted) {
        callbacks.onMoral(value);
        moralEmitted = true;
      }
    }
  });

  jsonParser.on('end', () => {
    parserResolve();
  });

  jsonParser.on('error', (err: Error) => {
    parserReject(err);
  });

  // Read OpenAI SSE stream
  try {
    while (true) {
      const { done, value } = await reader.read();
      if (done) break;

      const chunk = decoder.decode(value);
      const lines = chunk.split('\n');

      for (const line of lines) {
        if (line.startsWith('data: ') && line !== 'data: [DONE]') {
          try {
            const data = JSON.parse(line.slice(6));
            const content = data.choices?.[0]?.delta?.content || '';
            if (content) {
              jsonBuffer += content;
              jsonInputStream.write(content);
            }
          } catch {
            // Incomplete SSE chunk, continue
          }
        }
      }
    }

    // Signal end of JSON stream
    jsonInputStream.end();

    // Wait for parser to finish
    await parserComplete;

    // Final validation and completion
    try {
      const finalJson = JSON.parse(jsonBuffer) as V3StoryOpenAIResponse;

      // Validate required fields
      if (!finalJson.title || !Array.isArray(finalJson.paragraphs) || finalJson.paragraphs.length === 0) {
        throw new Error('Invalid story response: missing title or paragraphs');
      }

      await callbacks.onComplete(finalJson);
    } catch (e: any) {
      callbacks.onError(new Error(`Failed to parse story: ${e.message}`));
    }

  } catch (streamError: any) {
    callbacks.onError(new Error(`Stream error: ${streamError.message}`));
  }
}

/**
 * Build generation request from params (extracted from V3StoryGenerationService)
 */
async function buildGenerationRequest(
  params: V3StoryGenerationParams
): Promise<V3GenerationRequest> {
  const supabase = await createClient();

  // Fetch characters
  const characters = await fetchCharacters(params.heroId, params.characterIds || []);

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
 * Fetch characters for the story
 */
async function fetchCharacters(
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
        role: inferRole(profile.character_type),
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
 * Infer character role from type
 */
function inferRole(characterType: string): 'hero' | 'sidekick' | 'pet' | 'friend' | 'family' {
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
async function getAIConfigForMode(mode: 'fun' | 'growth'): Promise<AIConfig | null> {
  const purpose = mode === 'fun' ? 'story_fun' : 'story_growth';
  return await AIConfigService.getDefaultConfig(purpose);
}

/**
 * Transform raw response to V3Story
 */
function transformToV3Story(response: V3StoryOpenAIResponse, lengthName: string): V3Story {
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
async function saveStory(
  userId: string,
  v3Story: V3Story,
  rawResponse: V3StoryOpenAIResponse,
  request: V3GenerationRequest,
  prompt: string,
  includeIllustrations: boolean
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
    include_illustrations: includeIllustrations,
    ai_config_name: 'v3_generation_stream',
  };

  // If illustrations are enabled, status is 'text_complete' (waiting for illustrations)
  // Otherwise status is 'complete'
  const generationStatus = includeIllustrations ? 'text_complete' : 'complete';

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
      include_illustrations: includeIllustrations,
      engine_version: 'v3',
      generation_status: generationStatus,
    })
    .select('id')
    .single();

  if (error) {
    console.error('Error saving story:', error);
    throw new Error(`Failed to save story: ${error.message}`);
  }

  return data.id;
}
