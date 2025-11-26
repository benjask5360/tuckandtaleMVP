/**
 * Retry Uploads API
 * Retries failed or stale illustration uploads to Supabase
 *
 * POST /api/illustrations/retry-uploads
 * - Finds stories with illustration_upload_status = 'failed' or 'pending' (older than 1 hour)
 * - Downloads images from Leonardo CDN URLs (tempUrl)
 * - Uploads to Supabase storage
 * - Updates database with permanent URLs
 */

import { NextRequest, NextResponse } from 'next/server';
import { createAdminClient } from '@/lib/supabase/admin';
import { LeonardoClient } from '@/lib/leonardo/client';
import { AIConfigService } from '@/lib/services/ai-config';

interface PendingStory {
  id: string;
  user_id: string;
  story_scenes: Array<{
    paragraph: string;
    charactersInScene: string[];
    illustrationPrompt: string;
    illustrationUrl?: string;
    tempUrl?: string;
  }>;
  temp_cover_url?: string;
  cover_illustration_url?: string;
  illustration_upload_status: string;
  created_at: string;
}

export async function POST(request: NextRequest) {
  console.log('\n📤 RETRY UPLOADS API CALLED');

  try {
    const supabase = createAdminClient();
    const leonardoClient = new LeonardoClient();

    // Find stories that need retry
    // - status = 'failed' (explicitly failed)
    // - status = 'uploading' and older than 1 hour (stale/stuck)
    // - status = 'pending' and older than 1 hour (never started)
    const oneHourAgo = new Date(Date.now() - 60 * 60 * 1000).toISOString();

    const { data: pendingStories, error: fetchError } = await supabase
      .from('content')
      .select('id, user_id, story_scenes, temp_cover_url, cover_illustration_url, illustration_upload_status, created_at')
      .eq('engine_version', 'beta')
      .or(`illustration_upload_status.eq.failed,and(illustration_upload_status.in.(uploading,pending),created_at.lt.${oneHourAgo})`)
      .limit(10); // Process max 10 at a time to avoid timeouts

    if (fetchError) {
      console.error('Error fetching pending stories:', fetchError);
      return NextResponse.json({ error: 'Failed to fetch pending stories' }, { status: 500 });
    }

    if (!pendingStories || pendingStories.length === 0) {
      console.log('No stories need retry');
      return NextResponse.json({
        message: 'No stories need retry',
        processed: 0
      });
    }

    console.log(`Found ${pendingStories.length} stories needing retry`);

    // Get AI config for cost logging
    const aiConfig = await AIConfigService.getBetaIllustrationConfig();

    let totalProcessed = 0;
    let totalSuccessful = 0;
    const results: Array<{ storyId: string; success: boolean; message: string }> = [];

    for (const story of pendingStories as PendingStory[]) {
      console.log(`\nProcessing story ${story.id}...`);

      try {
        // Mark as uploading
        await supabase
          .from('content')
          .update({ illustration_upload_status: 'uploading' })
          .eq('id', story.id);

        const timestamp = Date.now();
        let successCount = 0;
        let failCount = 0;
        const updatedScenes = [...(story.story_scenes || [])];
        let updatedCoverUrl = story.cover_illustration_url;

        // Process cover if it has tempUrl but no permanent URL
        if (story.temp_cover_url && !story.cover_illustration_url) {
          try {
            console.log(`  Uploading cover from temp URL...`);
            const imageBlob = await leonardoClient.downloadImage(story.temp_cover_url);
            const storagePath = `${story.user_id}/stories/${timestamp}_${story.id}/cover.png`;

            const { error: uploadError } = await supabase.storage
              .from('illustrations')
              .upload(storagePath, imageBlob, {
                contentType: 'image/png',
                upsert: true, // Allow overwrite in case of retry
              });

            if (!uploadError) {
              const { data: urlData } = supabase.storage
                .from('illustrations')
                .getPublicUrl(storagePath);

              updatedCoverUrl = urlData.publicUrl;
              successCount++;
              console.log(`  ✅ Cover uploaded`);
            } else {
              console.error(`  ❌ Cover upload failed:`, uploadError);
              failCount++;
            }
          } catch (error) {
            console.error(`  ❌ Cover download/upload failed:`, error);
            failCount++;
          }
        }

        // Process scenes that have tempUrl but no permanent URL
        for (let i = 0; i < updatedScenes.length; i++) {
          const scene = updatedScenes[i];

          if (scene.tempUrl && !scene.illustrationUrl) {
            try {
              console.log(`  Uploading scene ${i} from temp URL...`);
              const imageBlob = await leonardoClient.downloadImage(scene.tempUrl);
              const storagePath = `${story.user_id}/stories/${timestamp}_${story.id}/scene_${i}.png`;

              const { error: uploadError } = await supabase.storage
                .from('illustrations')
                .upload(storagePath, imageBlob, {
                  contentType: 'image/png',
                  upsert: true,
                });

              if (!uploadError) {
                const { data: urlData } = supabase.storage
                  .from('illustrations')
                  .getPublicUrl(storagePath);

                updatedScenes[i].illustrationUrl = urlData.publicUrl;
                successCount++;
                console.log(`  ✅ Scene ${i} uploaded`);
              } else {
                console.error(`  ❌ Scene ${i} upload failed:`, uploadError);
                failCount++;
              }
            } catch (error) {
              console.error(`  ❌ Scene ${i} download/upload failed:`, error);
              failCount++;
            }
          }
        }

        // Update database with results
        const newStatus = failCount === 0 ? 'complete' : 'failed';
        const updateData: any = {
          story_scenes: updatedScenes,
          illustration_upload_status: newStatus,
        };

        if (updatedCoverUrl && updatedCoverUrl !== story.cover_illustration_url) {
          updateData.cover_illustration_url = updatedCoverUrl;
        }

        await supabase
          .from('content')
          .update(updateData)
          .eq('id', story.id);

        totalProcessed++;
        if (failCount === 0) {
          totalSuccessful++;
        }

        results.push({
          storyId: story.id,
          success: failCount === 0,
          message: `${successCount} uploaded, ${failCount} failed`,
        });

        console.log(`  Story ${story.id}: ${successCount} uploaded, ${failCount} failed`);

      } catch (error) {
        console.error(`Error processing story ${story.id}:`, error);

        // Mark as failed
        await supabase
          .from('content')
          .update({ illustration_upload_status: 'failed' })
          .eq('id', story.id);

        results.push({
          storyId: story.id,
          success: false,
          message: `Error: ${error instanceof Error ? error.message : 'Unknown error'}`,
        });
      }
    }

    console.log(`\n📤 RETRY UPLOADS COMPLETE: ${totalSuccessful}/${totalProcessed} successful`);

    return NextResponse.json({
      message: 'Retry complete',
      processed: totalProcessed,
      successful: totalSuccessful,
      results,
    });

  } catch (error) {
    console.error('Retry uploads error:', error);
    return NextResponse.json(
      { error: 'Internal server error' },
      { status: 500 }
    );
  }
}

// GET endpoint to check status of pending uploads
export async function GET(request: NextRequest) {
  try {
    const supabase = createAdminClient();

    const { data: stats, error } = await supabase
      .from('content')
      .select('illustration_upload_status')
      .eq('engine_version', 'beta')
      .not('illustration_upload_status', 'is', null);

    if (error) {
      return NextResponse.json({ error: 'Failed to fetch stats' }, { status: 500 });
    }

    const statusCounts = (stats || []).reduce((acc: Record<string, number>, item) => {
      const status = item.illustration_upload_status || 'unknown';
      acc[status] = (acc[status] || 0) + 1;
      return acc;
    }, {});

    return NextResponse.json({
      total: stats?.length || 0,
      byStatus: statusCounts,
    });

  } catch (error) {
    console.error('Status check error:', error);
    return NextResponse.json(
      { error: 'Internal server error' },
      { status: 500 }
    );
  }
}
