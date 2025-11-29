/**
 * V3 Illustration Service
 *
 * Orchestrates illustration generation for V3 stories:
 * 1. Generates illustration prompts via OpenAI (one call for all prompts)
 * 2. Fires all Leonardo calls in parallel
 * 3. Handles moderation failures with progressive cleansing (up to 5 attempts)
 * 4. Updates database as each image completes
 * 5. Uploads to Supabase storage in background
 */

import { createClient } from '@/lib/supabase/server';
import { createAdminClient } from '@/lib/supabase/admin';
import { LeonardoClient } from '@/lib/leonardo/client';
import { AIConfigService, type AIConfig } from '@/lib/services/ai-config';
import { withRetry } from '@/lib/utils/retry';
import {
  buildIllustrationPromptsPrompt,
  validateIllustrationPromptsResponse,
  buildCleansePrompt,
} from '../prompt-builders/V3IllustrationPromptBuilder';
import type {
  V3CharacterInfo,
  V3IllustrationStatusData,
  V3IllustrationPromptsResponse,
  V3IllustrationGenerationResult,
  V3CoverIllustrationStatus,
  V3SceneIllustrationStatus,
  V3Paragraph,
} from '../types';

const MAX_MODERATION_RETRIES = 5;

/**
 * Main entry point - generate all illustrations for a V3 story
 */
export async function generateAllIllustrations(
  storyId: string,
  userId: string
): Promise<{ success: boolean; illustrationCount: number; error?: string }> {
  const supabase = createAdminClient();

  try {
    // 1. Fetch story data
    const { data: story, error: storyError } = await supabase
      .from('content')
      .select('id, title, generation_metadata, v3_illustration_status')
      .eq('id', storyId)
      .eq('user_id', userId)
      .single();

    if (storyError || !story) {
      return { success: false, illustrationCount: 0, error: 'Story not found' };
    }

    // Check if already generating
    const currentStatus = story.v3_illustration_status as V3IllustrationStatusData | null;
    if (currentStatus?.overall === 'generating') {
      return { success: false, illustrationCount: 0, error: 'Illustrations already generating' };
    }

    // 2. Extract story data
    const metadata = story.generation_metadata as any;
    const v3Story = metadata?.v3_story;
    const characters = metadata?.characters as V3CharacterInfo[] || [];

    if (!v3Story?.paragraphs || !v3Story?.title) {
      return { success: false, illustrationCount: 0, error: 'Invalid story structure' };
    }

    const paragraphs = v3Story.paragraphs as V3Paragraph[];
    const illustrationCount = paragraphs.length + 1; // scenes + cover

    // 3. Initialize status tracking
    const initialStatus: V3IllustrationStatusData = {
      overall: 'generating',
      cover: { status: 'pending' },
      scenes: paragraphs.map((_, i) => ({
        paragraphIndex: i,
        status: 'pending',
      })),
    };

    await supabase
      .from('content')
      .update({ v3_illustration_status: initialStatus })
      .eq('id', storyId);

    // 4. Generate illustration prompts via OpenAI
    const promptsResult = await generateIllustrationPrompts(
      v3Story.title,
      paragraphs,
      characters
    );

    if (!promptsResult.success || !promptsResult.prompts) {
      await updateOverallStatus(supabase, storyId, 'failed');
      return { success: false, illustrationCount: 0, error: promptsResult.error || 'Failed to generate prompts' };
    }

    // 5. Update status with prompts
    const statusWithPrompts: V3IllustrationStatusData = {
      overall: 'generating',
      cover: { status: 'generating', prompt: promptsResult.prompts.coverPrompt },
      scenes: promptsResult.prompts.scenePrompts.map(sp => ({
        paragraphIndex: sp.paragraphIndex,
        status: 'generating' as const,
        prompt: sp.prompt,
      })),
    };

    await supabase
      .from('content')
      .update({ v3_illustration_status: statusWithPrompts })
      .eq('id', storyId);

    // 6. Get Leonardo config
    const aiConfig = await AIConfigService.getBetaIllustrationConfig();
    if (!aiConfig) {
      await updateOverallStatus(supabase, storyId, 'failed');
      return { success: false, illustrationCount: 0, error: 'Leonardo config not found' };
    }

    // 7. Fire all Leonardo calls in parallel
    // NOTE: These do NOT update the database individually - they return results
    // which we batch update at the end to avoid race conditions
    const leonardoClient = new LeonardoClient();

    const allPromises: Promise<V3IllustrationGenerationResult>[] = [
      // Cover
      generateSingleIllustration(
        leonardoClient,
        aiConfig,
        promptsResult.prompts.coverPrompt,
        'cover',
        undefined
      ),
      // Scenes
      ...promptsResult.prompts.scenePrompts.map(sp =>
        generateSingleIllustration(
          leonardoClient,
          aiConfig,
          sp.prompt,
          'scene',
          sp.paragraphIndex
        )
      ),
    ];

    // Wait for all to complete (don't fail if some fail)
    const results = await Promise.allSettled(allPromises);

    // 8. Collect all results and do a SINGLE batch update to avoid race conditions
    const successCount = results.filter(
      r => r.status === 'fulfilled' && r.value.success
    ).length;

    console.log(`[V3 Illustrations] All parallel calls completed. Success: ${successCount}/${illustrationCount}`);

    // Build the final status from all results
    const finalStatus: V3IllustrationStatusData = {
      overall: 'generating', // Will be updated below
      cover: { ...statusWithPrompts.cover }, // Start with prompt
      scenes: [...statusWithPrompts.scenes], // Start with prompts
    };

    // Process each result and update the final status object
    results.forEach((r, i) => {
      if (r.status === 'rejected') {
        console.error(`[V3 Illustrations] Promise ${i} rejected:`, r.reason);
        // Mark as failed
        if (i === 0) {
          finalStatus.cover = { ...finalStatus.cover, status: 'failed', error: r.reason?.message || 'Unknown error' };
        } else {
          const sceneIndex = i - 1;
          if (finalStatus.scenes[sceneIndex]) {
            finalStatus.scenes[sceneIndex] = { ...finalStatus.scenes[sceneIndex], status: 'failed', error: r.reason?.message || 'Unknown error' };
          }
        }
      } else {
        const result = r.value;
        if (!result.success) {
          console.error(`[V3 Illustrations] Promise ${i} failed:`, result.error);
        }

        // Update the appropriate slot
        if (result.imageType === 'cover') {
          finalStatus.cover = {
            ...finalStatus.cover,
            status: result.success ? 'success' : 'failed',
            tempUrl: result.leonardoUrl,
            error: result.error,
            attempts: result.attempts,
          };
        } else if (result.paragraphIndex !== undefined) {
          const sceneIndex = finalStatus.scenes.findIndex(s => s.paragraphIndex === result.paragraphIndex);
          if (sceneIndex >= 0) {
            finalStatus.scenes[sceneIndex] = {
              ...finalStatus.scenes[sceneIndex],
              status: result.success ? 'success' : 'failed',
              tempUrl: result.leonardoUrl,
              error: result.error,
              attempts: result.attempts,
            };
          }
        }
      }
    });

    // Determine overall status
    let overallStatus: 'complete' | 'partial' | 'failed';
    if (successCount === illustrationCount) {
      overallStatus = 'complete';
    } else if (successCount > 0) {
      overallStatus = 'partial';
    } else {
      overallStatus = 'failed';
    }
    finalStatus.overall = overallStatus;

    // 9. Single atomic database update with all results
    console.log(`[V3 Illustrations] Saving final status (overall: ${overallStatus}) to database`);
    const { error: finalUpdateError } = await supabase
      .from('content')
      .update({ v3_illustration_status: finalStatus })
      .eq('id', storyId);

    if (finalUpdateError) {
      console.error('[V3 Illustrations] Failed to save final status:', finalUpdateError);
    } else {
      console.log('[V3 Illustrations] Successfully saved all illustration results');
    }

    // 10. Fire background upload to Supabase (don't await)
    uploadToSupabaseInBackground(storyId, userId).catch(err => {
      console.error('[V3 Illustrations] Background upload failed:', err);
    });

    return {
      success: overallStatus !== 'failed',
      illustrationCount: successCount,
    };

  } catch (error: any) {
    console.error('[V3 Illustrations] Error:', error);
    await updateOverallStatus(supabase, storyId, 'failed');
    return { success: false, illustrationCount: 0, error: error.message };
  }
}

/**
 * Generate illustration prompts via OpenAI
 */
async function generateIllustrationPrompts(
  title: string,
  paragraphs: V3Paragraph[],
  characters: V3CharacterInfo[]
): Promise<{ success: boolean; prompts?: V3IllustrationPromptsResponse; error?: string }> {
  const MAX_RETRIES = 2;
  const prompt = buildIllustrationPromptsPrompt(title, paragraphs, characters);
  let lastError = '';

  for (let attempt = 1; attempt <= MAX_RETRIES; attempt++) {
    try {
      const response = await fetch('https://api.openai.com/v1/chat/completions', {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
          Authorization: `Bearer ${process.env.OPENAI_API_KEY}`,
        },
        body: JSON.stringify({
          model: 'gpt-4o-mini',
          messages: [{ role: 'user', content: prompt }],
          response_format: { type: 'json_object' },
          max_tokens: 4000,
          temperature: 0.7,
        }),
      });

      if (!response.ok) {
        const error = await response.text();
        console.error(`[V3 Illustrations] OpenAI error (attempt ${attempt}/${MAX_RETRIES}):`, error);
        lastError = 'Failed to generate illustration prompts';
        continue;
      }

      const data = await response.json();
      const content = data.choices?.[0]?.message?.content;
      const finishReason = data.choices?.[0]?.finish_reason;

      if (!content) {
        console.warn(`[V3 Illustrations] No content in response (attempt ${attempt}/${MAX_RETRIES})`);
        lastError = 'No content in OpenAI response';
        continue;
      }

      // Check if response was truncated
      if (finishReason === 'length') {
        console.warn(`[V3 Illustrations] Response truncated (attempt ${attempt}/${MAX_RETRIES})`);
        lastError = 'Response was truncated';
        continue;
      }

      const parsed = JSON.parse(content);
      const validation = validateIllustrationPromptsResponse(parsed, paragraphs.length);

      if (!validation.isValid) {
        console.error(`[V3 Illustrations] Validation errors (attempt ${attempt}/${MAX_RETRIES}):`, validation.errors);
        lastError = validation.errors.join(', ');
        continue;
      }

      return { success: true, prompts: validation.data };

    } catch (error: any) {
      console.error(`[V3 Illustrations] Prompt generation error (attempt ${attempt}/${MAX_RETRIES}):`, error);
      lastError = error.message;
      // Continue to next attempt
    }
  }

  // All retries exhausted
  console.error('[V3 Illustrations] All retries exhausted');
  return { success: false, error: lastError || 'Failed after multiple attempts' };
}

/**
 * Generate a single illustration with moderation retry logic
 * NOTE: This function does NOT update the database - it only returns results.
 * The caller is responsible for collecting all results and doing a single batch update.
 */
async function generateSingleIllustration(
  leonardoClient: LeonardoClient,
  aiConfig: AIConfig,
  originalPrompt: string,
  imageType: 'cover' | 'scene',
  paragraphIndex: number | undefined
): Promise<V3IllustrationGenerationResult> {
  let currentPrompt = originalPrompt;
  let attempts = 0;

  for (let attempt = 0; attempt <= MAX_MODERATION_RETRIES; attempt++) {
    attempts = attempt + 1;

    try {
      // Build Leonardo config
      const leonardoConfig = AIConfigService.buildLeonardoConfig(aiConfig, currentPrompt);

      // Generate image with retry for transient errors
      const { generationId, apiCreditCost } = await withRetry(
        () => leonardoClient.generateImage(leonardoConfig),
        { maxRetries: 2 }
      );

      // Poll for completion
      const generation = await leonardoClient.pollGeneration(generationId);

      // Check for moderation failure (status FAILED means Leonardo refused to generate)
      if (generation.status === 'FAILED') {
        if (attempt < MAX_MODERATION_RETRIES) {
          console.log(`[V3 Illustrations] ${imageType}${paragraphIndex !== undefined ? ` ${paragraphIndex}` : ''} failed, cleansing attempt ${attempt + 1}`);
          currentPrompt = await cleansePromptWithOpenAI(originalPrompt, attempt);
          continue;
        }

        // All retries exhausted - return failure (no DB update)
        return {
          success: false,
          imageType,
          paragraphIndex,
          error: 'moderation_failed',
          attempts,
        };
      }

      // NOTE: We intentionally do NOT check generation.images?.[0]?.nsfw here.
      // Leonardo marks ALL images containing children with nsfw:true and moderationClassification:["CHILD"].
      // This is expected behavior for a children's story app - the images are successfully generated
      // and safe to use. Only status === 'FAILED' indicates an actual moderation rejection.

      // Success!
      const leonardoUrl = generation.images?.[0]?.url;
      if (!leonardoUrl) {
        throw new Error('No image URL in response');
      }

      // Return success result (no DB update - caller will batch all updates)
      return {
        success: true,
        imageType,
        paragraphIndex,
        leonardoUrl,
        generationId,
        creditsUsed: apiCreditCost,
        attempts,
      };

    } catch (error: any) {
      // Check if it's a moderation-related error
      // Note: Leonardo uses "moderated" not "moderation", so we check for the root "moderat"
      const isModerationError =
        error.message?.toLowerCase().includes('moderat') ||
        error.message?.toLowerCase().includes('content policy') ||
        error.message?.toLowerCase().includes('nsfw');

      if (isModerationError && attempt < MAX_MODERATION_RETRIES) {
        console.log(`[V3 Illustrations] ${imageType}${paragraphIndex !== undefined ? ` ${paragraphIndex}` : ''} moderation error, cleansing attempt ${attempt + 1}`);
        currentPrompt = await cleansePromptWithOpenAI(originalPrompt, attempt);
        continue;
      }

      // Non-moderation error or retries exhausted - return failure (no DB update)
      console.error(`[V3 Illustrations] ${imageType}${paragraphIndex !== undefined ? ` ${paragraphIndex}` : ''} error:`, error.message);

      return {
        success: false,
        imageType,
        paragraphIndex,
        error: error.message,
        attempts,
      };
    }
  }

  // Should never reach here, but handle it
  return {
    success: false,
    imageType,
    paragraphIndex,
    error: 'Unknown error',
    attempts,
  };
}

/**
 * Cleanse a prompt using OpenAI
 */
async function cleansePromptWithOpenAI(
  originalPrompt: string,
  attemptIndex: number
): Promise<string> {
  try {
    const cleansePrompt = buildCleansePrompt(originalPrompt, attemptIndex);

    const response = await fetch('https://api.openai.com/v1/chat/completions', {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
        Authorization: `Bearer ${process.env.OPENAI_API_KEY}`,
      },
      body: JSON.stringify({
        model: 'gpt-4o-mini',
        messages: [{ role: 'user', content: cleansePrompt }],
        max_tokens: 500,
        temperature: 0.3,
      }),
    });

    if (!response.ok) {
      console.error('[V3 Illustrations] Cleanse API error');
      return originalPrompt; // Fall back to original
    }

    const data = await response.json();
    const cleansed = data.choices?.[0]?.message?.content?.trim();

    if (cleansed && cleansed.length > 20) {
      return cleansed;
    }

    return originalPrompt;

  } catch (error) {
    console.error('[V3 Illustrations] Cleanse error:', error);
    return originalPrompt;
  }
}

/**
 * Update illustration status in the database using atomic JSONB operations
 * This prevents race conditions when multiple parallel updates occur
 */
async function updateIllustrationStatus(
  supabase: ReturnType<typeof createAdminClient>,
  storyId: string,
  imageType: 'cover' | 'scene',
  paragraphIndex: number | undefined,
  update: Partial<V3CoverIllustrationStatus | V3SceneIllustrationStatus>
) {
  // Use a retry loop with fresh read to handle concurrent updates
  const maxRetries = 3;

  for (let attempt = 0; attempt < maxRetries; attempt++) {
    // Fetch current status
    const { data, error: fetchError } = await supabase
      .from('content')
      .select('v3_illustration_status')
      .eq('id', storyId)
      .single();

    if (fetchError) {
      console.error(`[V3 Illustrations] Failed to fetch status (attempt ${attempt + 1}):`, fetchError);
      if (attempt === maxRetries - 1) return;
      await new Promise(r => setTimeout(r, 100 * (attempt + 1))); // Backoff
      continue;
    }

    const currentStatus = (data?.v3_illustration_status || {}) as V3IllustrationStatusData;

    // Update the specific illustration
    if (imageType === 'cover') {
      currentStatus.cover = { ...currentStatus.cover, ...update };
    } else if (paragraphIndex !== undefined) {
      const sceneIndex = currentStatus.scenes?.findIndex(
        s => s.paragraphIndex === paragraphIndex
      );
      if (sceneIndex !== undefined && sceneIndex >= 0) {
        currentStatus.scenes[sceneIndex] = {
          ...currentStatus.scenes[sceneIndex],
          ...update,
        };
      }
    }

    // Save back
    const { error: updateError } = await supabase
      .from('content')
      .update({ v3_illustration_status: currentStatus })
      .eq('id', storyId);

    if (updateError) {
      console.error(`[V3 Illustrations] Failed to update status (attempt ${attempt + 1}):`, updateError);
      if (attempt === maxRetries - 1) return;
      await new Promise(r => setTimeout(r, 100 * (attempt + 1))); // Backoff
      continue;
    }

    // Success
    return;
  }
}

/**
 * Update overall illustration status
 */
async function updateOverallStatus(
  supabase: ReturnType<typeof createAdminClient>,
  storyId: string,
  overall: 'pending' | 'generating' | 'complete' | 'partial' | 'failed'
) {
  console.log(`[V3 Illustrations] Updating overall status to: ${overall} for story ${storyId}`);

  const { data, error: fetchError } = await supabase
    .from('content')
    .select('v3_illustration_status')
    .eq('id', storyId)
    .single();

  if (fetchError) {
    console.error('[V3 Illustrations] Failed to fetch status for update:', fetchError);
    return;
  }

  const currentStatus = (data?.v3_illustration_status || {}) as V3IllustrationStatusData;
  currentStatus.overall = overall;

  const { error: updateError } = await supabase
    .from('content')
    .update({ v3_illustration_status: currentStatus })
    .eq('id', storyId);

  if (updateError) {
    console.error('[V3 Illustrations] Failed to update overall status:', updateError);
  } else {
    console.log(`[V3 Illustrations] Successfully updated overall status to: ${overall}`);
  }
}

/**
 * Background upload to Supabase storage
 */
async function uploadToSupabaseInBackground(
  storyId: string,
  userId: string
): Promise<void> {
  const supabase = createAdminClient();

  // Fetch current status
  const { data } = await supabase
    .from('content')
    .select('v3_illustration_status')
    .eq('id', storyId)
    .single();

  const status = data?.v3_illustration_status as V3IllustrationStatusData;
  if (!status) return;

  const timestamp = Date.now();
  const basePath = `${userId}/stories/${timestamp}_${storyId}`;

  // Upload cover if successful
  if (status.cover?.status === 'success' && status.cover.tempUrl && !status.cover.imageUrl) {
    try {
      const permanentUrl = await uploadImage(
        supabase,
        status.cover.tempUrl,
        `${basePath}/cover.png`
      );

      await updateIllustrationStatus(supabase, storyId, 'cover', undefined, {
        imageUrl: permanentUrl,
      });
    } catch (error) {
      console.error('[V3 Illustrations] Cover upload failed:', error);
    }
  }

  // Upload scenes
  for (const scene of status.scenes || []) {
    if (scene.status === 'success' && scene.tempUrl && !scene.imageUrl) {
      try {
        const permanentUrl = await uploadImage(
          supabase,
          scene.tempUrl,
          `${basePath}/scene_${scene.paragraphIndex}.png`
        );

        await updateIllustrationStatus(supabase, storyId, 'scene', scene.paragraphIndex, {
          imageUrl: permanentUrl,
        });
      } catch (error) {
        console.error(`[V3 Illustrations] Scene ${scene.paragraphIndex} upload failed:`, error);
      }
    }
  }
}

/**
 * Upload a single image to Supabase storage
 */
async function uploadImage(
  supabase: ReturnType<typeof createAdminClient>,
  sourceUrl: string,
  destinationPath: string
): Promise<string> {
  // Download from Leonardo
  const response = await fetch(sourceUrl);
  if (!response.ok) {
    throw new Error(`Failed to download image: ${response.status}`);
  }

  const blob = await response.blob();
  const buffer = Buffer.from(await blob.arrayBuffer());

  // Upload to Supabase
  const { error: uploadError } = await supabase.storage
    .from('illustrations')
    .upload(destinationPath, buffer, {
      contentType: 'image/png',
      upsert: true,
    });

  if (uploadError) {
    throw new Error(`Upload failed: ${uploadError.message}`);
  }

  // Get public URL
  const { data: publicUrlData } = supabase.storage
    .from('illustrations')
    .getPublicUrl(destinationPath);

  return publicUrlData.publicUrl;
}

/**
 * Get illustration status for a story (used by polling endpoint)
 */
export async function getIllustrationStatus(
  storyId: string,
  userId: string
): Promise<V3IllustrationStatusData | null> {
  const supabase = await createClient();

  const { data, error } = await supabase
    .from('content')
    .select('v3_illustration_status')
    .eq('id', storyId)
    .eq('user_id', userId)
    .single();

  if (error || !data) {
    return null;
  }

  return data.v3_illustration_status as V3IllustrationStatusData | null;
}

// Legacy exports for backward compatibility
export class V3IllustrationService {
  static isEnabled(): boolean {
    return true; // Phase 2 enabled
  }
}

export default V3IllustrationService;
