/**
 * Beta Illustration Service
 * Generates individual scene illustrations using Leonardo AI
 * Creates 9 images: 8 scene illustrations + 1 cover illustration
 *
 * OPTIMIZATION: Returns Leonardo CDN URLs immediately for fast display,
 * then uploads to Supabase in background for permanent storage.
 */

import { AIConfigService } from '@/lib/services/ai-config';
import { LeonardoClient } from '@/lib/leonardo/client';
import { createAdminClient } from '@/lib/supabase/admin';
import type { Scene } from '../types/beta-story-types';

export interface BetaIllustrationResult {
  sceneIllustrations: {
    sceneIndex: number;
    illustrationUrl: string;  // This is now the Leonardo URL for fast display
  }[];
  coverIllustrationUrl: string;  // This is now the Leonardo URL for fast display
  totalCreditsUsed: number;
}

// Store background upload promises for tracking (module-level for persistence)
const backgroundUploadPromises: Map<string, Promise<void>> = new Map();

export class BetaIllustrationService {
  /**
   * Generate all illustrations for a Beta story
   * Creates 8 scene images + 1 cover image
   * Returns Leonardo URLs immediately, uploads to Supabase in background
   */
  static async generateAllIllustrations(
    userId: string,
    contentId: string,
    scenes: Scene[],
    coverPrompt: string
  ): Promise<BetaIllustrationResult> {
    console.log('\n' + '='.repeat(80));
    console.log('BETA ILLUSTRATION GENERATION STARTED');
    console.log('='.repeat(80));
    console.log(`Content ID: ${contentId}`);
    console.log(`Number of scenes: ${scenes.length}`);
    console.log(`Total images to generate: ${scenes.length + 1} (${scenes.length} scenes + 1 cover)`);
    console.log('='.repeat(80) + '\n');

    // Get AI configuration for Beta illustrations (Leonardo)
    const aiConfig = await AIConfigService.getBetaIllustrationConfig();

    if (!aiConfig) {
      throw new Error('No AI configuration found for Beta story illustrations');
    }

    console.log('AI Configuration:');
    console.log(`  Provider: ${aiConfig.provider}`);
    console.log(`  Model: ${aiConfig.model_name}`);
    console.log(`  Dimensions: ${aiConfig.settings.width}x${aiConfig.settings.height}`);
    console.log('');

    if (aiConfig.provider !== 'leonardo') {
      throw new Error(`Beta illustrations require Leonardo AI, but configured provider is ${aiConfig.provider}`);
    }

    const leonardoClient = new LeonardoClient();
    let totalCreditsUsed = 0;
    const sceneIllustrations: { sceneIndex: number; illustrationUrl: string }[] = [];
    let coverIllustrationUrl = '';

    console.log(`\n${'='.repeat(80)}`);
    console.log('GENERATING ALL ILLUSTRATIONS CONCURRENTLY');
    console.log('='.repeat(80));
    console.log(`Total images to generate: ${scenes.length + 1} (1 cover + ${scenes.length} scenes)`);
    console.log('All images will generate simultaneously for maximum speed');
    console.log('Leonardo URLs returned immediately, Supabase upload happens in background');
    console.log('='.repeat(80) + '\n');

    const illustrationStartTime = performance.now();

    try {
      // Generate ALL illustrations concurrently (cover + all scenes)
      console.log('🎨 Starting concurrent generation of all illustrations...');

      const allPromises = [
        // Cover illustration
        this.generateSingleIllustration(
          leonardoClient,
          aiConfig,
          coverPrompt,
          userId,
          contentId,
          'cover'
        ).then(result => ({
          type: 'cover' as const,
          leonardoUrl: result.leonardoUrl,
          creditsUsed: result.creditsUsed,
          generationId: result.generationId,
          prompt: coverPrompt,
        })),
        // All scene illustrations
        ...scenes.map((scene, i) =>
          this.generateSingleIllustration(
            leonardoClient,
            aiConfig,
            scene.illustrationPrompt,
            userId,
            contentId,
            `scene_${i}`
          ).then(result => ({
            type: 'scene' as const,
            sceneIndex: i,
            leonardoUrl: result.leonardoUrl,
            creditsUsed: result.creditsUsed,
            generationId: result.generationId,
            prompt: scene.illustrationPrompt,
          }))
        )
      ];

      console.log(`Waiting for ${allPromises.length} illustrations to complete...`);
      const allResults = await Promise.all(allPromises);
      const illustrationDuration = performance.now() - illustrationStartTime;
      console.log('✅ All illustrations generated!');
      console.log(`⏱️  All illustrations (${allPromises.length} concurrent): ${(illustrationDuration / 1000).toFixed(2)}s (${illustrationDuration.toFixed(0)}ms)\n`);

      // PHASE 1: Save Leonardo URLs immediately for fast display
      console.log('📝 Saving Leonardo URLs to database (fast path)...');

      // Prepare scene data with tempUrl
      const scenesWithTempUrls = scenes.map((scene, index) => {
        const result = allResults.find(r => r.type === 'scene' && r.sceneIndex === index);
        return {
          ...scene,
          tempUrl: result?.leonardoUrl,
        };
      });

      // Get cover result
      const coverResult = allResults.find(r => r.type === 'cover');
      coverIllustrationUrl = coverResult?.leonardoUrl || '';

      // Update database with temp URLs and set status to 'uploading'
      const supabase = createAdminClient();
      const { error: tempUpdateError } = await supabase
        .from('content')
        .update({
          story_scenes: scenesWithTempUrls,
          temp_cover_url: coverIllustrationUrl,
          illustration_upload_status: 'uploading',
        })
        .eq('id', contentId);

      if (tempUpdateError) {
        console.error('Error saving temp URLs:', tempUpdateError);
        // Don't throw - we can still return the URLs even if DB update fails
      } else {
        console.log('✅ Temporary URLs saved to database');
      }

      // Build result with Leonardo URLs
      for (const result of allResults) {
        if (result.type === 'scene') {
          sceneIllustrations.push({
            sceneIndex: result.sceneIndex,
            illustrationUrl: result.leonardoUrl,
          });
        }
      }

      // Calculate total credits
      totalCreditsUsed = allResults.reduce((sum, result) => sum + result.creditsUsed, 0);

      // PHASE 2: Start background upload to Supabase (fire-and-forget)
      console.log('🔄 Starting background upload to Supabase storage...');

      const backgroundPromise = this.uploadToSupabaseInBackground(
        userId,
        contentId,
        allResults,
        aiConfig,
        leonardoClient
      );

      // Store the promise for potential tracking/retry
      backgroundUploadPromises.set(contentId, backgroundPromise);

      // Clean up after completion
      backgroundPromise.finally(() => {
        backgroundUploadPromises.delete(contentId);
      });

      console.log('\n' + '='.repeat(80));
      console.log('✅ ALL ILLUSTRATIONS READY FOR DISPLAY!');
      console.log('='.repeat(80));
      console.log(`Scenes: ${sceneIllustrations.length}`);
      console.log(`Cover: 1`);
      console.log(`Total credits used: ${totalCreditsUsed}`);
      console.log('Background upload to Supabase: IN PROGRESS');
      console.log('='.repeat(80));
    } catch (error) {
      console.error('❌ Failed to generate illustrations:', error);
      throw new Error(`Failed to generate illustrations: ${error}`);
    }

    console.log('\n' + '='.repeat(80));
    console.log('BETA ILLUSTRATION GENERATION COMPLETED (FAST PATH)');
    console.log('='.repeat(80));
    console.log(`Total images generated: ${sceneIllustrations.length + 1}`);
    console.log(`Total credits used: ${totalCreditsUsed}`);
    console.log('Note: Supabase upload continues in background');
    console.log('='.repeat(80) + '\n');

    return {
      sceneIllustrations,
      coverIllustrationUrl,
      totalCreditsUsed,
    };
  }

  /**
   * Generate a single illustration using Leonardo AI
   * Returns Leonardo URL immediately (no download/upload)
   */
  private static async generateSingleIllustration(
    leonardoClient: LeonardoClient,
    aiConfig: any,
    prompt: string,
    userId: string,
    contentId: string,
    imageName: string
  ): Promise<{ leonardoUrl: string; creditsUsed: number; generationId: string }> {
    const singleImageStartTime = performance.now();

    // Build Leonardo configuration
    const leonardoConfig = AIConfigService.buildLeonardoConfig(aiConfig, prompt);

    console.log(`Initiating Leonardo generation for ${imageName}...`);

    // Start generation
    const { generationId, apiCreditCost } = await leonardoClient.generateImage(leonardoConfig);

    console.log(`  Generation ID: ${generationId}`);
    console.log(`  Estimated credit cost: ${apiCreditCost || 'unknown'}`);

    // Poll for completion
    console.log(`  Polling for completion...`);
    const generation = await leonardoClient.pollGeneration(generationId);

    if (!generation.images || generation.images.length === 0) {
      throw new Error('No images returned from Leonardo AI');
    }

    const image = generation.images[0];
    const actualCreditCost = generation.creditCost || apiCreditCost || 0;

    console.log(`  Generation complete!`);
    console.log(`  Actual credit cost: ${actualCreditCost}`);
    console.log(`  Leonardo URL: ${image.url}`);

    const singleImageDuration = performance.now() - singleImageStartTime;
    console.log(`⏱️  Single illustration (${imageName}): ${(singleImageDuration / 1000).toFixed(2)}s (${singleImageDuration.toFixed(0)}ms)`);

    // Return Leonardo URL immediately - no download/upload here
    return {
      leonardoUrl: image.url,
      creditsUsed: actualCreditCost,
      generationId,
    };
  }

  /**
   * Background upload to Supabase Storage
   * Downloads from Leonardo and uploads to Supabase for permanent storage
   */
  private static async uploadToSupabaseInBackground(
    userId: string,
    contentId: string,
    allResults: Array<{
      type: 'cover' | 'scene';
      sceneIndex?: number;
      leonardoUrl: string;
      creditsUsed: number;
      generationId: string;
      prompt: string;
    }>,
    aiConfig: any,
    leonardoClient: LeonardoClient
  ): Promise<void> {
    console.log('\n📤 BACKGROUND UPLOAD STARTED');
    const supabase = createAdminClient();
    const timestamp = Date.now();
    let successCount = 0;
    let failCount = 0;

    try {
      // Process all uploads concurrently
      const uploadPromises = allResults.map(async (result) => {
        const imageName = result.type === 'cover' ? 'cover' : `scene_${result.sceneIndex}`;

        try {
          console.log(`  📥 Downloading ${imageName} from Leonardo...`);
          const imageBlob = await leonardoClient.downloadImage(result.leonardoUrl);

          console.log(`  📤 Uploading ${imageName} to Supabase...`);
          const storagePath = `${userId}/stories/${timestamp}_${contentId}/${imageName}.png`;

          const { error: uploadError } = await supabase.storage
            .from('illustrations')
            .upload(storagePath, imageBlob, {
              contentType: 'image/png',
              upsert: false,
            });

          if (uploadError) {
            console.error(`  ❌ Upload error for ${imageName}:`, uploadError);
            failCount++;
            return null;
          }

          // Get public URL
          const { data: urlData } = supabase.storage
            .from('illustrations')
            .getPublicUrl(storagePath);

          const publicUrl = urlData.publicUrl;
          console.log(`  ✅ ${imageName} uploaded: ${publicUrl}`);

          // Log cost
          await AIConfigService.logGenerationCost(
            userId,
            null,
            aiConfig,
            result.creditsUsed,
            {
              prompt_used: result.prompt,
              actual_cost: result.creditsUsed,
              generation_id: result.generationId,
              image_name: imageName,
              storage_path: storagePath,
            },
            null,
            contentId
          );

          successCount++;
          return {
            type: result.type,
            sceneIndex: result.sceneIndex,
            supabaseUrl: publicUrl,
          };
        } catch (error) {
          console.error(`  ❌ Failed to upload ${imageName}:`, error);
          failCount++;
          return null;
        }
      });

      const uploadResults = await Promise.all(uploadPromises);
      const successfulUploads = uploadResults.filter(r => r !== null);

      // Update database with permanent Supabase URLs
      if (successfulUploads.length > 0) {
        // Get current story data
        const { data: story, error: fetchError } = await supabase
          .from('content')
          .select('story_scenes')
          .eq('id', contentId)
          .single();

        if (!fetchError && story) {
          const updatedScenes = [...(story.story_scenes || [])];
          let coverUrl = '';

          for (const upload of successfulUploads) {
            if (upload.type === 'cover') {
              coverUrl = upload.supabaseUrl;
            } else if (upload.sceneIndex !== undefined && updatedScenes[upload.sceneIndex]) {
              updatedScenes[upload.sceneIndex].illustrationUrl = upload.supabaseUrl;
            }
          }

          // Update with permanent URLs
          const updateData: any = {
            story_scenes: updatedScenes,
            illustration_upload_status: failCount === 0 ? 'complete' : 'failed',
          };

          if (coverUrl) {
            updateData.cover_illustration_url = coverUrl;
          }

          const { error: updateError } = await supabase
            .from('content')
            .update(updateData)
            .eq('id', contentId);

          if (updateError) {
            console.error('❌ Error updating permanent URLs:', updateError);
          } else {
            console.log('✅ Permanent URLs saved to database');
          }
        }
      }

      console.log(`\n📤 BACKGROUND UPLOAD COMPLETED: ${successCount} success, ${failCount} failed`);

      if (failCount > 0) {
        // Mark as failed for retry
        await supabase
          .from('content')
          .update({ illustration_upload_status: 'failed' })
          .eq('id', contentId);
      }
    } catch (error) {
      console.error('❌ Background upload failed:', error);

      // Mark as failed for retry
      await supabase
        .from('content')
        .update({ illustration_upload_status: 'failed' })
        .eq('id', contentId);
    }
  }

  /**
   * Update story with cover illustration URL immediately
   */
  static async updateStoryWithCover(contentId: string, coverUrl: string): Promise<void> {
    const supabase = createAdminClient();
    const { error } = await supabase
      .from('content')
      .update({
        cover_illustration_url: coverUrl,
      })
      .eq('id', contentId);

    if (error) {
      console.error('Error updating cover illustration:', error);
      throw new Error(`Failed to update cover: ${error.message}`);
    }
  }

  /**
   * Update a single scene with its illustration URL
   */
  static async updateSceneIllustration(
    contentId: string,
    sceneIndex: number,
    illustrationUrl: string
  ): Promise<void> {
    const supabase = createAdminClient();

    // First get the current scenes
    const { data: story, error: fetchError } = await supabase
      .from('content')
      .select('story_scenes')
      .eq('id', contentId)
      .single();

    if (fetchError || !story) {
      console.error('Error fetching story:', fetchError);
      return;
    }

    // Update the specific scene with its illustration URL
    const updatedScenes = story.story_scenes || [];
    if (updatedScenes[sceneIndex]) {
      updatedScenes[sceneIndex].illustrationUrl = illustrationUrl;
    }

    // Save back to database
    const { error: updateError } = await supabase
      .from('content')
      .update({
        story_scenes: updatedScenes,
      })
      .eq('id', contentId);

    if (updateError) {
      console.error(`Error updating scene ${sceneIndex} illustration:`, updateError);
    }
  }

  /**
   * Update story scenes with illustration URLs (batch update)
   */
  static async updateScenesWithIllustrations(
    contentId: string,
    scenes: Scene[],
    sceneIllustrations: { sceneIndex: number; illustrationUrl: string }[]
  ): Promise<void> {
    // Update scenes with illustration URLs
    const updatedScenes = scenes.map((scene, index) => {
      const illustration = sceneIllustrations.find(ill => ill.sceneIndex === index);
      return {
        ...scene,
        illustrationUrl: illustration?.illustrationUrl,
      };
    });

    // Update database
    const supabase = createAdminClient();
    const { error } = await supabase
      .from('content')
      .update({
        story_scenes: updatedScenes,
        generation_status: 'complete', // Mark as fully complete when all illustrations are done
      })
      .eq('id', contentId);

    if (error) {
      console.error('Error updating scenes with illustration URLs:', error);
      throw new Error(`Failed to update scenes: ${error.message}`);
    }

    console.log('✅ Scenes updated with illustration URLs');
  }

  /**
   * Update story with cover illustration URL
   */
  static async updateCoverIllustration(
    contentId: string,
    coverIllustrationUrl: string
  ): Promise<void> {
    const supabase = createAdminClient();
    const { error } = await supabase
      .from('content')
      .update({
        cover_illustration_url: coverIllustrationUrl,
      })
      .eq('id', contentId);

    if (error) {
      console.error('Error updating cover illustration URL:', error);
      throw new Error(`Failed to update cover: ${error.message}`);
    }

    console.log('✅ Cover illustration URL updated');
  }
}
