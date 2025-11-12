/**
 * Story Image Splicer Service
 * Splits a 3x3 grid illustration into 9 individual scene images
 */

import sharp from 'sharp';
import { createAdminClient } from '@/lib/supabase/admin';
import type { StoryIllustration } from '@/lib/types/story-types';

export class StoryImageSplicer {
  /**
   * Splice a 3x3 grid image into 9 individual scene images
   * @param gridUrl URL of the grid image to splice
   * @param userId User ID for storage path
   * @param contentId Content ID for storage path
   * @param timestamp Timestamp for folder naming (passed from generator)
   * @returns Array of StoryIllustration objects for scenes 0-8
   */
  static async spliceGridIntoScenes(
    gridUrl: string,
    userId: string,
    contentId: string,
    timestamp: number
  ): Promise<StoryIllustration[]> {
    try {
      console.log('Starting image splicing for grid:', gridUrl);

      // 1. Download the grid image
      const imageBuffer = await this.downloadImage(gridUrl);

      // 2. Get image metadata
      const metadata = await sharp(imageBuffer).metadata();
      const width = metadata.width || 1024;
      const height = metadata.height || 1024;

      // 3. Calculate panel dimensions (3x3 grid)
      const panelWidth = Math.floor(width / 3);
      const panelHeight = Math.floor(height / 3);

      console.log(`Grid dimensions: ${width}x${height}, Panel size: ${panelWidth}x${panelHeight}`);

      // 4. Extract and upload each panel
      const sceneIllustrations: StoryIllustration[] = [];

      for (let row = 0; row < 3; row++) {
        for (let col = 0; col < 3; col++) {
          // Calculate scene number (0-8)
          // Grid position 1-9 maps to scene 0-8
          const sceneNumber = row * 3 + col;

          console.log(`Extracting scene ${sceneNumber} (row ${row}, col ${col})`);

          // Extract panel from grid
          const panelBuffer = await this.extractPanel(
            imageBuffer,
            row,
            col,
            panelWidth,
            panelHeight
          );

          // Upload to storage
          const storagePath = `illustrations/${userId}/stories/${timestamp}_${contentId}/scene_${sceneNumber}.png`;
          const publicUrl = await this.uploadPanel(panelBuffer, storagePath);

          // Create StoryIllustration object
          const illustration: StoryIllustration = {
            type: `scene_${sceneNumber}` as any,
            url: publicUrl,
            generated_at: new Date().toISOString(),
            source: 'spliced_from_grid',
            metadata: {
              parent_type: 'grid_3x3',
              panel_position: sceneNumber,
              width: 512,
              height: 512,
              original_position: {
                row,
                col,
                grid_number: sceneNumber + 1 // 1-9 for reference
              }
            }
          };

          sceneIllustrations.push(illustration);

          // Small delay to avoid rate limiting
          if (sceneNumber < 8) {
            await new Promise(resolve => setTimeout(resolve, 100));
          }
        }
      }

      console.log(`Successfully spliced grid into ${sceneIllustrations.length} scenes`);
      return sceneIllustrations;

    } catch (error) {
      console.error('Error splicing grid image:', error);
      return [];
    }
  }

  /**
   * Download image from URL and return as buffer
   */
  private static async downloadImage(url: string): Promise<Buffer> {
    try {
      const response = await fetch(url);
      if (!response.ok) {
        throw new Error(`Failed to download image: ${response.statusText}`);
      }

      const arrayBuffer = await response.arrayBuffer();
      return Buffer.from(arrayBuffer);
    } catch (error) {
      console.error('Error downloading image:', error);
      throw error;
    }
  }

  /**
   * Extract a panel from the grid image
   */
  private static async extractPanel(
    imageBuffer: Buffer,
    row: number,
    col: number,
    panelWidth: number,
    panelHeight: number
  ): Promise<Buffer> {
    try {
      // Extract the panel and resize to 512x512
      const panelBuffer = await sharp(imageBuffer)
        .extract({
          left: col * panelWidth,
          top: row * panelHeight,
          width: panelWidth,
          height: panelHeight,
        })
        .resize(512, 512, {
          fit: 'cover',
          kernel: 'lanczos3', // High-quality resampling
        })
        .png()
        .toBuffer();

      return panelBuffer;
    } catch (error) {
      console.error(`Error extracting panel at row ${row}, col ${col}:`, error);
      throw error;
    }
  }

  /**
   * Upload panel to Supabase storage
   */
  private static async uploadPanel(
    panelBuffer: Buffer,
    storagePath: string
  ): Promise<string> {
    try {
      const supabaseAdmin = createAdminClient();

      console.log('Uploading panel to:', storagePath);

      const { error: uploadError } = await supabaseAdmin.storage
        .from('illustrations')
        .upload(storagePath, panelBuffer, {
          contentType: 'image/png',
          upsert: true,
        });

      if (uploadError) {
        console.error('Storage upload error:', uploadError);
        throw uploadError;
      }

      // Get public URL
      const { data } = supabaseAdmin.storage
        .from('illustrations')
        .getPublicUrl(storagePath);

      return data.publicUrl;
    } catch (error) {
      console.error('Error uploading panel:', error);
      throw error;
    }
  }

  /**
   * Update content with spliced scene illustrations
   * Appends scenes to existing story_illustrations array
   */
  static async updateContentWithScenes(
    contentId: string,
    sceneIllustrations: StoryIllustration[]
  ): Promise<boolean> {
    try {
      const supabaseAdmin = createAdminClient();

      // Fetch existing illustrations
      const { data: content, error: fetchError } = await supabaseAdmin
        .from('content')
        .select('story_illustrations')
        .eq('id', contentId)
        .single();

      if (fetchError) {
        console.error('Error fetching content:', fetchError);
        return false;
      }

      // Append new scenes to existing array (grid should already be there)
      const existingIllustrations = content?.story_illustrations || [];
      const updatedIllustrations = [...existingIllustrations, ...sceneIllustrations];

      // Update content with all illustrations
      const { error: updateError } = await supabaseAdmin
        .from('content')
        .update({
          story_illustrations: updatedIllustrations
        })
        .eq('id', contentId);

      if (updateError) {
        console.error('Error updating content with scenes:', updateError);
        return false;
      }

      console.log(`Content updated with ${sceneIllustrations.length} spliced scenes`);
      return true;
    } catch (error) {
      console.error('Error updating content with scenes:', error);
      return false;
    }
  }
}

export default StoryImageSplicer;