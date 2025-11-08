/**
 * Link Preview Avatar API Endpoint
 * Links a preview avatar to a newly created character
 */

import { NextRequest, NextResponse } from 'next/server';
import { createClient } from '@/lib/supabase/server';

interface LinkPreviewRequest {
  characterId: string;
  avatarCacheId: string;
}

/**
 * POST /api/avatars/link-preview
 * Link a preview avatar to a character and move storage path
 */
export async function POST(request: NextRequest) {
  try {
    const supabase = await createClient();

    // Get authenticated user
    const { data: { user }, error: authError } = await supabase.auth.getUser();
    if (authError || !user) {
      return NextResponse.json(
        { error: 'Unauthorized' },
        { status: 401 }
      );
    }

    const body: LinkPreviewRequest = await request.json();
    const { characterId, avatarCacheId } = body;

    if (!characterId || !avatarCacheId) {
      return NextResponse.json(
        { error: 'Character ID and Avatar Cache ID are required' },
        { status: 400 }
      );
    }

    // Get the avatar cache entry
    const { data: avatarCache, error: cacheError } = await supabase
      .from('avatar_cache')
      .select('*')
      .eq('id', avatarCacheId)
      .single();

    if (cacheError || !avatarCache) {
      return NextResponse.json(
        { error: 'Avatar cache not found' },
        { status: 404 }
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
        { error: 'Character not found or unauthorized' },
        { status: 404 }
      );
    }

    // Move the avatar file from preview path to character path
    // Old path: previews/{userId}/{generationId}.png
    // New path: {userId}/{characterId}/{generationId}.png
    if (avatarCache.storage_path && avatarCache.storage_path.startsWith('previews/')) {
      const generationId = avatarCache.leonardo_generation_id;
      const oldPath = avatarCache.storage_path;
      const newPath = `${user.id}/${characterId}/${generationId}.png`;

      try {
        // Download from old location
        const { data: fileData, error: downloadError } = await supabase.storage
          .from('avatars')
          .download(oldPath);

        if (downloadError) {
          console.error('Error downloading preview avatar:', downloadError);
          throw downloadError;
        }

        // Upload to new location
        const { error: uploadError } = await supabase.storage
          .from('avatars')
          .upload(newPath, fileData, {
            contentType: 'image/png',
            upsert: true,
          });

        if (uploadError) {
          console.error('Error uploading to new path:', uploadError);
          throw uploadError;
        }

        // Delete old file
        const { error: deleteError } = await supabase.storage
          .from('avatars')
          .remove([oldPath]);

        if (deleteError) {
          console.error('Error deleting old preview:', deleteError);
          // Don't throw - new file is already uploaded
        }

        // Get new public URL
        const { data: urlData } = supabase.storage
          .from('avatars')
          .getPublicUrl(newPath);

        // Update avatar cache with new path and link to character
        const { error: updateError } = await supabase
          .from('avatar_cache')
          .update({
            character_profile_id: characterId,
            storage_path: newPath,
            image_url: urlData.publicUrl,
            is_current: true, // Set as current avatar
          })
          .eq('id', avatarCacheId);

        if (updateError) {
          console.error('Error updating avatar cache:', updateError);
          throw updateError;
        }

        // Update character's avatar_cache_id
        const { error: characterUpdateError } = await supabase
          .from('character_profiles')
          .update({
            avatar_cache_id: avatarCacheId,
          })
          .eq('id', characterId);

        if (characterUpdateError) {
          console.error('Error updating character avatar reference:', characterUpdateError);
          throw characterUpdateError;
        }

        return NextResponse.json({
          success: true,
          message: 'Preview avatar linked successfully',
          imageUrl: urlData.publicUrl,
        });
      } catch (storageError: any) {
        console.error('Storage operation error:', storageError);
        return NextResponse.json(
          { error: 'Failed to move avatar file: ' + storageError.message },
          { status: 500 }
        );
      }
    } else {
      // No storage path or not a preview - just link it
      const { error: updateError } = await supabase
        .from('avatar_cache')
        .update({
          character_profile_id: characterId,
          is_current: true,
        })
        .eq('id', avatarCacheId);

      if (updateError) {
        return NextResponse.json(
          { error: 'Failed to link avatar' },
          { status: 500 }
        );
      }

      // Update character's avatar_cache_id
      const { error: characterUpdateError } = await supabase
        .from('character_profiles')
        .update({
          avatar_cache_id: avatarCacheId,
        })
        .eq('id', characterId);

      if (characterUpdateError) {
        return NextResponse.json(
          { error: 'Failed to update character' },
          { status: 500 }
        );
      }

      return NextResponse.json({
        success: true,
        message: 'Avatar linked successfully',
      });
    }
  } catch (error: any) {
    console.error('Link preview avatar error:', error);
    return NextResponse.json(
      { error: error.message || 'Failed to link preview avatar' },
      { status: 500 }
    );
  }
}
