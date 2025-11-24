/**
 * Beta Illustration Service
 * Generates individual scene illustrations using Leonardo AI
 * Creates 9 images: 8 scene illustrations + 1 cover illustration
 */

import { AIConfigService } from '@/lib/services/ai-config';
import { LeonardoClient } from '@/lib/leonardo/client';
import { createAdminClient } from '@/lib/supabase/admin';
import type { Scene } from '../types/beta-story-types';

export interface BetaIllustrationResult {
  sceneIllustrations: {
    sceneIndex: number;
    illustrationUrl: string;
  }[];
  coverIllustrationUrl: string;
  totalCreditsUsed: number;
}

export class BetaIllustrationService {
  /**
   * Generate all illustrations for a Beta story
   * Creates 8 scene images + 1 cover image
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
          url: result.url,
          creditsUsed: result.creditsUsed,
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
            url: result.url,
            creditsUsed: result.creditsUsed,
          }))
        )
      ];

      console.log(`Waiting for ${allPromises.length} illustrations to complete...`);
      const allResults = await Promise.all(allPromises);
      const illustrationDuration = performance.now() - illustrationStartTime;
      console.log('✅ All illustrations generated!');
      console.log(`⏱️  All illustrations (${allPromises.length} concurrent): ${(illustrationDuration / 1000).toFixed(2)}s (${illustrationDuration.toFixed(0)}ms)\n`);

      // Update database with all results CONCURRENTLY
      console.log('Saving all illustrations to database concurrently...');

      // Prepare all database update promises
      const updatePromises = allResults.map(result => {
        if (result.type === 'cover') {
          return this.updateStoryWithCover(contentId, result.url).then(() => {
            coverIllustrationUrl = result.url;
            console.log('  ✓ Cover saved');
          });
        } else {
          return this.updateSceneIllustration(contentId, result.sceneIndex, result.url).then(() => {
            sceneIllustrations.push({
              sceneIndex: result.sceneIndex,
              illustrationUrl: result.url,
            });
            console.log(`  ✓ Scene ${result.sceneIndex + 1} saved`);
          });
        }
      });

      // Execute all database updates concurrently
      await Promise.all(updatePromises);

      // Calculate total credits
      totalCreditsUsed = allResults.reduce((sum, result) => sum + result.creditsUsed, 0);

      console.log('\n' + '='.repeat(80));
      console.log('✅ ALL ILLUSTRATIONS COMPLETED!');
      console.log('='.repeat(80));
      console.log(`Scenes: ${sceneIllustrations.length}`);
      console.log(`Cover: 1`);
      console.log(`Total credits used: ${totalCreditsUsed}`);
      console.log('='.repeat(80));
    } catch (error) {
      console.error('❌ Failed to generate illustrations:', error);
      throw new Error(`Failed to generate illustrations: ${error}`);
    }

    console.log('\n' + '='.repeat(80));
    console.log('BETA ILLUSTRATION GENERATION COMPLETED');
    console.log('='.repeat(80));
    console.log(`Total images generated: ${sceneIllustrations.length + 1}`);
    console.log(`Total credits used: ${totalCreditsUsed}`);
    console.log('='.repeat(80) + '\n');

    return {
      sceneIllustrations,
      coverIllustrationUrl,
      totalCreditsUsed,
    };
  }

  /**
   * Generate a single illustration using Leonardo AI
   */
  private static async generateSingleIllustration(
    leonardoClient: LeonardoClient,
    aiConfig: any,
    prompt: string,
    userId: string,
    contentId: string,
    imageName: string
  ): Promise<{ url: string; creditsUsed: number }> {
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

    // Download image
    console.log(`  Downloading image...`);
    const imageBlob = await leonardoClient.downloadImage(image.url);

    // Upload to Supabase Storage
    console.log(`  Uploading to Supabase Storage...`);
    const storagePath = `${userId}/stories/${Date.now()}_${contentId}/${imageName}.png`;
    const supabase = createAdminClient();

    const { data: uploadData, error: uploadError } = await supabase.storage
      .from('illustrations')
      .upload(storagePath, imageBlob, {
        contentType: 'image/png',
        upsert: false,
      });

    if (uploadError) {
      console.error(`  Upload error:`, uploadError);
      throw new Error(`Failed to upload image to storage: ${uploadError.message}`);
    }

    // Get public URL
    const { data: urlData } = supabase.storage
      .from('illustrations')
      .getPublicUrl(storagePath);

    const publicUrl = urlData.publicUrl;
    console.log(`  Upload complete: ${publicUrl}`);

    // Log cost
    console.log(`  Logging cost to database...`);
    await AIConfigService.logGenerationCost(
      userId,
      null, // No character profile for story illustrations
      aiConfig,
      actualCreditCost,
      {
        prompt_used: prompt,
        actual_cost: actualCreditCost,
        generation_id: generationId,
        image_name: imageName,
        storage_path: storagePath,
      },
      null, // No existing cost log ID
      contentId
    );

    const singleImageDuration = performance.now() - singleImageStartTime;
    console.log(`⏱️  Single illustration (${imageName}): ${(singleImageDuration / 1000).toFixed(2)}s (${singleImageDuration.toFixed(0)}ms)`);

    return {
      url: publicUrl,
      creditsUsed: actualCreditCost,
    };
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
