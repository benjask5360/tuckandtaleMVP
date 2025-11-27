/**
 * V3 Illustration Generation API Route
 *
 * POST /api/story-engine/v3/illustrations/generate
 *
 * Triggers illustration generation for a V3 story.
 * Returns immediately - illustrations are generated in the background.
 */

import { createClient } from '@/lib/supabase/server';
import { generateAllIllustrations } from '@/lib/story-engine-v3/services/V3IllustrationService';

export const runtime = 'nodejs';
export const dynamic = 'force-dynamic';
export const maxDuration = 300; // 5 minutes max for illustration generation

export async function POST(request: Request) {
  try {
    // Parse request body
    const body = await request.json();
    const { storyId } = body;

    if (!storyId) {
      return Response.json({ error: 'storyId is required' }, { status: 400 });
    }

    // Authenticate user
    const supabase = await createClient();
    const {
      data: { user },
      error: authError,
    } = await supabase.auth.getUser();

    if (authError || !user) {
      return Response.json({ error: 'Unauthorized' }, { status: 401 });
    }

    // Verify user owns this story
    const { data: story, error: storyError } = await supabase
      .from('content')
      .select('id, user_id, engine_version, include_illustrations')
      .eq('id', storyId)
      .single();

    if (storyError || !story) {
      return Response.json({ error: 'Story not found' }, { status: 404 });
    }

    if (story.user_id !== user.id) {
      return Response.json({ error: 'Unauthorized' }, { status: 403 });
    }

    // Verify it's a V3 story with illustrations enabled
    if (story.engine_version !== 'v3') {
      return Response.json(
        { error: 'Illustrations generation is only available for V3 stories' },
        { status: 400 }
      );
    }

    if (!story.include_illustrations) {
      return Response.json(
        { error: 'Illustrations are not enabled for this story' },
        { status: 400 }
      );
    }

    // Start generation (this will run in the background but we await it)
    // The function handles its own status updates
    const result = await generateAllIllustrations(storyId, user.id);

    if (!result.success) {
      return Response.json(
        { error: result.error || 'Failed to generate illustrations' },
        { status: 500 }
      );
    }

    return Response.json({
      success: true,
      illustrationCount: result.illustrationCount,
    });

  } catch (error: any) {
    console.error('[V3 Illustrations API] Error:', error);
    return Response.json(
      { error: error.message || 'Internal server error' },
      { status: 500 }
    );
  }
}
