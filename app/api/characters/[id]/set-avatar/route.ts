/**
 * Set Avatar API Endpoint
 * Saves a generated avatar to the character profile
 */

import { NextRequest, NextResponse } from 'next/server';
import { createClient } from '@/lib/supabase/server';

interface SetAvatarRequest {
  avatarUrl: string;
}

/**
 * POST /api/characters/[id]/set-avatar
 * Save the pending avatar to character profile
 */
export async function POST(
  request: NextRequest,
  { params }: { params: { id: string } }
) {
  try {
    const supabase = await createClient();
    const characterId = params.id;

    // Get authenticated user
    const { data: { user }, error: authError } = await supabase.auth.getUser();
    if (authError || !user) {
      return NextResponse.json(
        { error: 'Unauthorized' },
        { status: 401 }
      );
    }

    // Parse request body
    const body: SetAvatarRequest = await request.json();
    const { avatarUrl } = body;

    if (!avatarUrl) {
      return NextResponse.json(
        { error: 'Avatar URL is required' },
        { status: 400 }
      );
    }

    // Verify character belongs to user
    const { data: character, error: characterError } = await supabase
      .from('character_profiles')
      .select('id')
      .eq('id', characterId)
      .eq('user_id', user.id)
      .single();

    if (characterError || !character) {
      return NextResponse.json(
        { error: 'Character not found' },
        { status: 404 }
      );
    }

    console.log('Looking for avatar with URL:', avatarUrl);

    // Find the avatar_cache entry with this URL
    const { data: avatarCache, error: cacheError } = await supabase
      .from('avatar_cache')
      .select('*')
      .eq('character_profile_id', characterId)
      .eq('image_url', avatarUrl)
      .eq('processing_status', 'completed')
      .single();

    console.log('Avatar cache lookup result:', { avatarCache, cacheError });

    if (cacheError || !avatarCache) {
      // Try to find ANY completed avatar for this character for debugging
      const { data: allAvatars } = await supabase
        .from('avatar_cache')
        .select('id, image_url, processing_status')
        .eq('character_profile_id', characterId)
        .eq('processing_status', 'completed');

      console.log('All completed avatars for this character:', allAvatars);

      return NextResponse.json(
        {
          error: 'Avatar not found in cache',
          debug: {
            searchedUrl: avatarUrl,
            availableAvatars: allAvatars?.map(a => ({ id: a.id, url: a.image_url }))
          }
        },
        { status: 404 }
      );
    }

    // Set all other avatars for this character as not current
    const { error: unsetError } = await supabase
      .from('avatar_cache')
      .update({ is_current: false })
      .eq('character_profile_id', characterId);

    if (unsetError) {
      console.error('Error unsetting other avatars:', unsetError);
    }

    // Set this avatar as current
    const { error: setCurrentError } = await supabase
      .from('avatar_cache')
      .update({ is_current: true })
      .eq('id', avatarCache.id);

    if (setCurrentError) {
      console.error('Error setting avatar as current:', setCurrentError);
    }

    console.log('Updating character profile with avatar_cache_id:', avatarCache.id);

    // Update character profile with the new avatar
    const { data: updatedCharacter, error: updateError } = await supabase
      .from('character_profiles')
      .update({
        avatar_cache_id: avatarCache.id,
        updated_at: new Date().toISOString(),
      })
      .eq('id', characterId)
      .select()
      .single();

    console.log('Character profile update result:', { updatedCharacter, updateError });

    if (updateError) {
      console.error('Error updating character profile:', updateError);
      return NextResponse.json(
        { error: 'Failed to update character profile', details: updateError },
        { status: 500 }
      );
    }

    return NextResponse.json({
      success: true,
      message: 'Avatar saved successfully',
      avatarCacheId: avatarCache.id,
    });
  } catch (error: any) {
    console.error('Set avatar error:', error);
    return NextResponse.json(
      { error: error.message || 'Failed to save avatar' },
      { status: 500 }
    );
  }
}
