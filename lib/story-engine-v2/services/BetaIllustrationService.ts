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
    let sceneIllustrations: { sceneIndex: number; illustrationUrl: string }[] = [];
    let coverIllustrationUrl = '';

    console.log(`\n${'='.repeat(80)}`);
    console.log('GENERATING ILLUSTRATIONS WITH PRIORITY ORDER');
    console.log('='.repeat(80));
    console.log(`Total images to generate: ${scenes.length + 1} (1 cover + ${scenes.length} scenes)`);
    console.log('Priority: Cover first → Scenes 1-2 → Remaining scenes');
    console.log('='.repeat(80) + '\n');

    try {
      // PRIORITY 1: Generate cover illustration first (most important for user experience)
      console.log('🎨 PRIORITY 1: Generating cover illustration...');
      const coverResult = await this.generateSingleIllustration(
        leonardoClient,
        aiConfig,
        coverPrompt,
        userId,
        contentId,
        'cover'
      );
      coverIllustrationUrl = coverResult.url;
      totalCreditsUsed += coverResult.creditsUsed;

      // Update database with cover immediately
      await this.updateStoryWithCover(contentId, coverIllustrationUrl);
      console.log('✅ Cover illustration complete and saved!\n');

      // PRIORITY 2: Generate first 2 scenes (what user sees first when scrolling)
      console.log('🎨 PRIORITY 2: Generating scenes 1-2 (first visible scenes)...');
      const firstScenePromises = scenes.slice(0, 2).map((scene, i) => {
        console.log(`  Starting scene ${i + 1} illustration...`);
        return this.generateSingleIllustration(
          leonardoClient,
          aiConfig,
          scene.illustrationPrompt,
          userId,
          contentId,
          `scene_${i}`
        ).then(result => ({
          sceneIndex: i,
          illustrationUrl: result.url,
          creditsUsed: result.creditsUsed,
        }));
      });

      const firstSceneResults = await Promise.all(firstScenePromises);

      // Update database with first scenes
      for (const result of firstSceneResults) {
        await this.updateSceneIllustration(contentId, result.sceneIndex, result.illustrationUrl);
        sceneIllustrations.push({
          sceneIndex: result.sceneIndex,
          illustrationUrl: result.illustrationUrl,
        });
        totalCreditsUsed += result.creditsUsed;
      }
      console.log('✅ First 2 scenes complete!\n');

      // PRIORITY 3: Generate remaining scenes concurrently (background)
      if (scenes.length > 2) {
        console.log(`🎨 PRIORITY 3: Generating remaining ${scenes.length - 2} scenes in background...`);
        const remainingScenePromises = scenes.slice(2).map((scene, i) => {
          const actualIndex = i + 2; // Adjust index since we're starting from scene 3
          console.log(`  Starting scene ${actualIndex + 1} illustration...`);
          return this.generateSingleIllustration(
            leonardoClient,
            aiConfig,
            scene.illustrationPrompt,
            userId,
            contentId,
            `scene_${actualIndex}`
          ).then(result => ({
            sceneIndex: actualIndex,
            illustrationUrl: result.url,
            creditsUsed: result.creditsUsed,
          }));
        });

        const remainingResults = await Promise.all(remainingScenePromises);

        // Update database with remaining scenes
        for (const result of remainingResults) {
          await this.updateSceneIllustration(contentId, result.sceneIndex, result.illustrationUrl);
          sceneIllustrations.push({
            sceneIndex: result.sceneIndex,
            illustrationUrl: result.illustrationUrl,
          });
          totalCreditsUsed += result.creditsUsed;
        }
        console.log('✅ All remaining scenes complete!');
      }

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
