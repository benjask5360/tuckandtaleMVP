/**
 * Save Latest Avatar API Endpoint
 * Finds the most recent completed avatar and saves it to the character profile
 */

import { NextRequest, NextResponse } from 'next/server';
import { createClient } from '@/lib/supabase/server';
import { revalidatePath } from 'next/cache';

/**
 * POST /api/characters/[id]/save-latest-avatar
 * Find and save the most recent completed avatar
 */
export async function POST(
  request: NextRequest,
  { params }: { params: { id: string } }
) {
  try {
    const supabase = await createClient();
    const characterId = params.id;

    console.log('\n=== SAVE LATEST AVATAR API ===')
    console.log('Character ID:', characterId)

    // Get authenticated user
    const { data: { user }, error: authError } = await supabase.auth.getUser();
    if (authError || !user) {
      return NextResponse.json(
        { error: 'Unauthorized' },
        { status: 401 }
      );
    }

    // Verify character belongs to user
    const { data: character, error: characterError } = await supabase
      .from('character_profiles')
      .select('id, avatar_cache_id')
      .eq('id', characterId)
      .eq('user_id', user.id)
      .single();

    if (characterError || !character) {
      console.log('Character not found or error:', characterError)
      return NextResponse.json(
        { error: 'Character not found' },
        { status: 404 }
      );
    }

    console.log('Current avatar_cache_id on profile:', character.avatar_cache_id)

    // Find the most recent completed avatar for this character
    const { data: latestAvatar, error: avatarError } = await supabase
      .from('avatar_cache')
      .select('*')
      .eq('character_profile_id', characterId)
      .eq('processing_status', 'completed')
      .order('created_at', { ascending: false })
      .limit(1)
      .single();

    console.log('Latest completed avatar query result:', {
      found: !!latestAvatar,
      error: avatarError,
      avatar_id: latestAvatar?.id,
      image_url: latestAvatar?.image_url,
      created_at: latestAvatar?.created_at,
      is_current: latestAvatar?.is_current
    })

    if (avatarError || !latestAvatar) {
      console.log('No completed avatars found for character')
      return NextResponse.json({
        updated: false,
        message: 'No avatars found'
      });
    }

    // Check if the latest avatar is already set as current
    if (character.avatar_cache_id === latestAvatar.id) {
      console.log('Latest avatar is already current - no update needed')
      return NextResponse.json({
        updated: false,
        message: 'Latest avatar is already current',
        avatarCacheId: latestAvatar.id
      });
    }

    console.log('Need to update avatar from', character.avatar_cache_id, 'to', latestAvatar.id)

    // Set all other avatars as not current
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
      .eq('id', latestAvatar.id);

    if (setCurrentError) {
      console.error('Error setting avatar as current:', setCurrentError);
    }

    // Update character profile with the new avatar
    const { data: updatedCharacter, error: updateError } = await supabase
      .from('character_profiles')
      .update({
        avatar_cache_id: latestAvatar.id,
        updated_at: new Date().toISOString(),
      })
      .eq('id', characterId)
      .select()
      .single();

    if (updateError) {
      console.error('Error updating character profile:', updateError);
      return NextResponse.json(
        { error: 'Failed to update character profile', details: updateError },
        { status: 500 }
      );
    }

    console.log('Successfully updated character profile!')
    console.log('New avatar_cache_id:', updatedCharacter.avatar_cache_id)
    console.log('New image URL:', latestAvatar.image_url)

    // Revalidate the edit page to ensure fresh data on next visit
    revalidatePath(`/dashboard/my-children/${characterId}/edit`);
    revalidatePath('/dashboard/my-children');
    console.log('Revalidated paths')
    console.log('=== END SAVE LATEST AVATAR API ===\n')

    return NextResponse.json({
      updated: true,
      success: true,
      message: 'Latest avatar saved successfully',
      avatarCacheId: latestAvatar.id,
      imageUrl: latestAvatar.image_url
    });
  } catch (error: any) {
    console.error('Save latest avatar error:', error);
    return NextResponse.json(
      { error: error.message || 'Failed to save latest avatar' },
      { status: 500 }
    );
  }
}
