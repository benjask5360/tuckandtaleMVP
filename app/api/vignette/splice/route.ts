/**
 * Vignette Splice API Endpoint
 *
 * Test endpoint for generating panoramic vignette images and slicing them
 * into 9 individual panels for story visualization.
 *
 * POST /api/vignette/splice
 * Body: { storyId: string }
 *
 * Returns: {
 *   success: boolean,
 *   data?: {
 *     storyId: string,
 *     panels: VignettePanel[],
 *     panoramicImageUrl: string,
 *     leonardoGenerationId: string
 *   },
 *   error?: string
 * }
 */

import { NextRequest, NextResponse } from 'next/server';
import { createClient } from '@/lib/supabase/server';
import { VignetteSplicerService } from '@/lib/services/vignette-splicer';
import { z } from 'zod';

// ============================================================================
// REQUEST VALIDATION
// ============================================================================

const RequestSchema = z.object({
  storyId: z.string().uuid('Story ID must be a valid UUID'),
});

// ============================================================================
// POST HANDLER - Generate and Slice Vignettes
// ============================================================================

export async function POST(request: NextRequest) {
  try {
    // 1. Authenticate user
    const supabase = await createClient();
    const {
      data: { user },
      error: authError,
    } = await supabase.auth.getUser();

    if (authError || !user) {
      return NextResponse.json(
        { success: false, error: 'Unauthorized' },
        { status: 401 }
      );
    }

    // 2. Parse and validate request body
    const body = await request.json();
    const validation = RequestSchema.safeParse(body);

    if (!validation.success) {
      return NextResponse.json(
        {
          success: false,
          error: 'Invalid request',
          details: validation.error.issues,
        },
        { status: 400 }
      );
    }

    const { storyId } = validation.data;

    // 3. Verify story exists and user owns it
    const { data: story, error: storyError } = await supabase
      .from('content')
      .select('id, user_id, title')
      .eq('id', storyId)
      .eq('user_id', user.id)
      .eq('content_type', 'story')
      .single();

    if (storyError || !story) {
      return NextResponse.json(
        { success: false, error: 'Story not found or access denied' },
        { status: 404 }
      );
    }

    console.log(`[Vignette Splice] Starting generation for story: ${story.title} (${storyId})`);

    // 4. Generate vignettes
    const result = await VignetteSplicerService.generateStoryVignettes(
      storyId,
      user.id
    );

    console.log(`[Vignette Splice] Successfully generated ${result.panels.length} panels`);

    // 5. Return success response
    return NextResponse.json({
      success: true,
      data: {
        storyId: result.storyId,
        panels: result.panels,
        panoramicImageUrl: result.panoramicImageUrl,
        leonardoGenerationId: result.leonardoGenerationId,
        message: `Successfully generated ${result.panels.length} vignette panels`,
      },
    });
  } catch (error: any) {
    console.error('[Vignette Splice] Error:', error);

    return NextResponse.json(
      {
        success: false,
        error: error.message || 'Failed to generate vignettes',
      },
      { status: 500 }
    );
  }
}

// ============================================================================
// GET HANDLER - Retrieve Existing Vignette Panels
// ============================================================================

export async function GET(request: NextRequest) {
  try {
    // 1. Authenticate user
    const supabase = await createClient();
    const {
      data: { user },
      error: authError,
    } = await supabase.auth.getUser();

    if (authError || !user) {
      return NextResponse.json(
        { success: false, error: 'Unauthorized' },
        { status: 401 }
      );
    }

    // 2. Get storyId from query params
    const { searchParams } = new URL(request.url);
    const storyId = searchParams.get('storyId');

    if (!storyId) {
      return NextResponse.json(
        { success: false, error: 'storyId query parameter is required' },
        { status: 400 }
      );
    }

    // 3. Verify story ownership
    const { data: story, error: storyError } = await supabase
      .from('content')
      .select('id, title')
      .eq('id', storyId)
      .eq('user_id', user.id)
      .eq('content_type', 'story')
      .single();

    if (storyError || !story) {
      return NextResponse.json(
        { success: false, error: 'Story not found or access denied' },
        { status: 404 }
      );
    }

    // 4. Fetch existing panels
    const { data: panels, error: panelsError } = await supabase
      .from('vignette_panels')
      .select('panel_number, image_url, storage_path, created_at')
      .eq('story_id', storyId)
      .order('panel_number', { ascending: true });

    if (panelsError) {
      throw panelsError;
    }

    // 5. Return panels
    return NextResponse.json({
      success: true,
      data: {
        storyId,
        storyTitle: story.title,
        panels: panels || [],
        count: panels?.length || 0,
      },
    });
  } catch (error: any) {
    console.error('[Vignette Splice] Error fetching panels:', error);

    return NextResponse.json(
      {
        success: false,
        error: error.message || 'Failed to fetch vignette panels',
      },
      { status: 500 }
    );
  }
}
