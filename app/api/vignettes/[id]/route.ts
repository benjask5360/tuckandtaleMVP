/**
 * Vignette Story Fetch API Endpoint
 *
 * GET /api/vignettes/[id]
 * Fetches a single vignette story with all panels and metadata
 */

import { NextRequest, NextResponse } from 'next/server';
import { createClient } from '@/lib/supabase/server';

export async function GET(request: NextRequest, { params }: { params: { id: string } }) {
  try {
    // 1. Authenticate user
    const supabase = await createClient();
    const {
      data: { user },
      error: authError,
    } = await supabase.auth.getUser();

    if (authError || !user) {
      return NextResponse.json({ success: false, error: 'Unauthorized' }, { status: 401 });
    }

    // 2. Fetch vignette story with panels and characters
    console.log('[Vignette API] Fetching vignette:', params.id, 'for user:', user.id);

    const { data: vignette, error } = await supabase
      .from('content')
      .select(
        `
        id,
        title,
        body,
        theme,
        generation_metadata,
        vignette_helper_prompt,
        vignette_prompt,
        panel_count,
        source_story_id,
        is_favorite,
        created_at,
        vignette_panels (
          panel_number,
          image_url,
          storage_path
        ),
        content_characters (
          character_profiles (
            id,
            name
          )
        )
      `
      )
      .eq('id', params.id)
      .eq('user_id', user.id)
      .eq('content_type', 'vignette_story')
      .single();

    if (error || !vignette) {
      console.error('[Vignette API] Error fetching vignette:', {
        vignetteId: params.id,
        userId: user.id,
        error: error,
        errorCode: error?.code,
        errorMessage: error?.message,
      });
      return NextResponse.json({ success: false, error: 'Vignette not found' }, { status: 404 });
    }

    // 3. Format and sort panels
    const panels = (vignette.vignette_panels || []).sort(
      (a: any, b: any) => a.panel_number - b.panel_number
    );

    // 4. Extract characters
    const characters = (vignette.content_characters || []).map(
      (cc: any) => cc.character_profiles
    );

    // 5. Return formatted response
    return NextResponse.json({
      success: true,
      vignette: {
        id: vignette.id,
        title: vignette.title,
        summary: vignette.body,
        scenes: vignette.generation_metadata?.scenes || [],
        panels,
        characters,
        metadata: {
          mode: vignette.generation_metadata?.mode,
          genre: vignette.generation_metadata?.genre,
          tone: vignette.generation_metadata?.tone,
          hero_age: vignette.generation_metadata?.hero_age,
        },
        panel_count: vignette.panel_count,
        source_story_id: vignette.source_story_id,
        is_favorite: vignette.is_favorite,
        created_at: vignette.created_at,
        prompts: {
          helper: vignette.vignette_helper_prompt,
          leonardo: vignette.vignette_prompt,
        },
      },
    });
  } catch (error: any) {
    console.error('[Vignette API] Error:', error);
    return NextResponse.json(
      {
        success: false,
        error: error.message || 'Failed to fetch vignette story',
      },
      { status: 500 }
    );
  }
}
