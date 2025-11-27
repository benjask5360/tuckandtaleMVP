/**
 * V3 Illustration Status API Route
 *
 * GET /api/story-engine/v3/illustrations/status?storyId=xxx
 *
 * Returns current illustration generation status for polling.
 */

import { createClient } from '@/lib/supabase/server';
import { getIllustrationStatus } from '@/lib/story-engine-v3/services/V3IllustrationService';

export const runtime = 'nodejs';
export const dynamic = 'force-dynamic';

export async function GET(request: Request) {
  try {
    // Get storyId from query params
    const url = new URL(request.url);
    const storyId = url.searchParams.get('storyId');

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

    // Get illustration status
    const status = await getIllustrationStatus(storyId, user.id);

    if (!status) {
      // No status means either story not found or no illustrations
      return Response.json({
        overall: 'pending',
        cover: { status: 'pending' },
        scenes: [],
      });
    }

    return Response.json(status);

  } catch (error: any) {
    console.error('[V3 Illustrations Status API] Error:', error);
    return Response.json(
      { error: error.message || 'Internal server error' },
      { status: 500 }
    );
  }
}
