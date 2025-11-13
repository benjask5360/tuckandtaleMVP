/**
 * Story Illustration Generator Service
 * Generates illustrations for stories using Google Gemini 2.5 Flash Image
 */

import { createClient } from '@/lib/supabase/server';
import { createAdminClient } from '@/lib/supabase/admin';
import { AIConfigService } from './ai-config';
import { StoryImageSplicer } from './story-image-splicer';
import type { StoryIllustration } from '@/lib/types/story-types';

export class StoryIllustrationGenerator {
  /**
   * Generate a story illustration using Google Gemini
   * @param prompt The illustration prompt from OpenAI
   * @param userId User ID for tracking
   * @param contentId Content ID to associate illustration with
   * @returns StoryIllustration object with URL and metadata, plus timestamp
   */
  static async generateStoryIllustration(
    prompt: string,
    userId: string,
    contentId: string
  ): Promise<{ illustration: StoryIllustration; timestamp: number } | null> {
    try {
      console.log('Generating story illustration for content:', contentId);

      // 1. Get AI config for story illustration
      const aiConfig = await AIConfigService.getDefaultConfig('story_illustration');
      if (!aiConfig) {
        console.error('No AI config found for story_illustration purpose');
        return null;
      }

      // 2. Import and initialize Gemini client
      const { GeminiClient } = await import('@/lib/google/client');
      const gemini = new GeminiClient();

      // 3. Build Gemini generation config
      const geminiConfig = AIConfigService.buildGeminiConfig(aiConfig, prompt);

      // 4. Generate the image
      console.log('Calling Gemini API for image generation...');
      const result = await gemini.generateImage(geminiConfig);

      if (!result.imageData) {
        console.error('No image data returned from Gemini');
        return null;
      }

      // 5. Convert base64 to blob
      const imageBlob = await gemini.downloadImage(result.imageData, result.mimeType);

      // 6. Upload to Supabase storage
      const uploadResult = await this.uploadToStorage(imageBlob, userId, contentId, result.mimeType);
      if (!uploadResult) {
        console.error('Failed to upload image to storage');
        return null;
      }

      // 7. Get public URL
      const publicUrl = await this.getPublicUrl(uploadResult.storagePath);

      // 8. Log generation cost
      await AIConfigService.logGenerationCost(
        userId,
        null, // No character profile for story illustrations
        aiConfig,
        result.tokensUsed || 1290, // Default to 1290 tokens if not provided
        {
          content_id: contentId,
          prompt_used: prompt,
          operation: 'story_illustration_grid',
          actual_cost: result.tokensUsed || 1290 // Enable USD cost calculation
        }
      );

      // 9. Create and return illustration object with timestamp
      const illustration: StoryIllustration = {
        type: 'grid_3x3',
        url: publicUrl,
        generated_at: new Date().toISOString(),
        source: 'generated',
        metadata: {
          model: aiConfig.model_name,
          tokens_used: result.tokensUsed || 1290,
          aspect_ratio: aiConfig.settings.aspectRatio || '1:1',
          generation_id: `gemini_${Date.now()}`,
          provider: 'google'
        }
      };

      console.log('Story illustration generated successfully:', illustration);
      return { illustration, timestamp: uploadResult.timestamp };

    } catch (error) {
      console.error('Error generating story illustration:', error);
      return null;
    }
  }

  /**
   * Upload image blob to Supabase storage
   * Returns both storage path and timestamp for folder structure
   */
  private static async uploadToStorage(
    imageBlob: Blob,
    userId: string,
    contentId: string,
    mimeType: string
  ): Promise<{ storagePath: string; timestamp: number } | null> {
    try {
      const supabaseAdmin = createAdminClient();
      const timestamp = Date.now();
      const extension = mimeType.includes('png') ? 'png' : 'webp';
      // Use timestamp_contentId format so stories sort by most recent first
      const storagePath = `illustrations/${userId}/stories/${timestamp}_${contentId}/grid_3x3.${extension}`;

      console.log('Uploading to storage path:', storagePath);

      const { error: uploadError } = await supabaseAdmin.storage
        .from('illustrations')
        .upload(storagePath, imageBlob, {
          contentType: mimeType,
          upsert: true,
        });

      if (uploadError) {
        console.error('Storage upload error:', uploadError);
        return null;
      }

      return { storagePath, timestamp };
    } catch (error) {
      console.error('Error uploading to storage:', error);
      return null;
    }
  }

  /**
   * Get public URL for a storage path
   */
  private static async getPublicUrl(storagePath: string): Promise<string> {
    const supabaseAdmin = createAdminClient();
    const { data } = supabaseAdmin.storage
      .from('illustrations')
      .getPublicUrl(storagePath);

    return data.publicUrl;
  }

  /**
   * Update content record with illustration
   * @param contentId Content ID to update
   * @param illustration StoryIllustration object to add
   */
  static async updateContentWithIllustration(
    contentId: string,
    illustration: StoryIllustration
  ): Promise<boolean> {
    try {
      const supabase = await createClient();

      // Fetch existing illustrations
      const { data: content, error: fetchError } = await supabase
        .from('content')
        .select('story_illustrations')
        .eq('id', contentId)
        .single();

      if (fetchError) {
        console.error('Error fetching content:', fetchError);
        return false;
      }

      // Add new illustration to array
      const existingIllustrations = content?.story_illustrations || [];
      const updatedIllustrations = [...existingIllustrations, illustration];

      // Update content with new illustrations array
      const { error: updateError } = await supabase
        .from('content')
        .update({
          story_illustrations: updatedIllustrations
        })
        .eq('id', contentId);

      if (updateError) {
        console.error('Error updating content with illustration:', updateError);
        return false;
      }

      console.log('Content updated with illustration successfully');
      return true;
    } catch (error) {
      console.error('Error updating content with illustration:', error);
      return false;
    }
  }

  /**
   * Generate and save illustration for a story, then splice into scenes
   * Convenience method that combines generation, splicing, and database update
   */
  static async generateAndSaveIllustration(
    prompt: string,
    userId: string,
    contentId: string
  ): Promise<StoryIllustration | null> {
    // Generate the grid illustration
    const result = await this.generateStoryIllustration(prompt, userId, contentId);

    if (!result) {
      return null;
    }

    const { illustration: gridIllustration, timestamp } = result;

    // Update content with the grid illustration first
    const gridUpdated = await this.updateContentWithIllustration(contentId, gridIllustration);

    if (!gridUpdated) {
      console.warn('Grid illustration generated but failed to update content record');
    }

    // Splice the grid into 9 individual scenes
    try {
      console.log('Starting automatic image splicing...');

      const sceneIllustrations = await StoryImageSplicer.spliceGridIntoScenes(
        gridIllustration.url,
        userId,
        contentId,
        timestamp
      );

      if (sceneIllustrations.length > 0) {
        // Update content with spliced scenes
        const scenesUpdated = await StoryImageSplicer.updateContentWithScenes(
          contentId,
          sceneIllustrations
        );

        if (scenesUpdated) {
          console.log(`Successfully added ${sceneIllustrations.length} spliced scenes to content`);
        } else {
          console.warn('Scenes spliced but failed to update content record');
        }
      } else {
        console.warn('No scenes were spliced from the grid');
      }
    } catch (splicingError) {
      console.error('Error during image splicing:', splicingError);
      // Continue - we at least have the grid image
    }

    return gridIllustration;
  }
}

export default StoryIllustrationGenerator;