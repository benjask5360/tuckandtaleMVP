import { createClient } from '@/lib/supabase/server';
import { NextResponse } from 'next/server';

export async function POST(request: Request) {
  try {
    const supabase = await createClient();

    // Check authentication
    const {
      data: { user },
      error: authError,
    } = await supabase.auth.getUser();

    if (authError || !user) {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
    }

    const { characterId, avatarCacheId } = await request.json();

    if (!characterId || !avatarCacheId) {
      return NextResponse.json(
        { error: 'Missing characterId or avatarCacheId' },
        { status: 400 }
      );
    }

    // CRITICAL FIX: First verify the character exists and belongs to the user
    const { data: characterCheck, error: characterCheckError } = await supabase
      .from('character_profiles')
      .select('id, user_id')
      .eq('id', characterId)
      .eq('user_id', user.id)
      .single();

    if (characterCheckError || !characterCheck) {
      console.error('Character verification failed:', characterCheckError);
      return NextResponse.json(
        { error: 'Character not found or unauthorized' },
        { status: 404 }
      );
    }

    // Verify avatar exists and get its details
    const { data: avatar, error: avatarError } = await supabase
      .from('avatar_cache')
      .select('id, created_by_user_id, character_profile_id, storage_path, processing_status')
      .eq('id', avatarCacheId)
      .single();

    if (avatarError || !avatar) {
      console.error('Avatar not found:', avatarError);
      return NextResponse.json(
        { error: 'Avatar not found' },
        { status: 404 }
      );
    }

    // CRITICAL FIX: Verify the user owns this avatar
    if (avatar.created_by_user_id !== user.id) {
      console.error('User does not own this avatar');
      return NextResponse.json(
        { error: 'Unauthorized - you do not own this avatar' },
        { status: 403 }
      );
    }

    // Check if avatar is already linked
    if (avatar.character_profile_id) {
      console.log('Avatar already linked to character:', avatar.character_profile_id);
      // If it's already linked to the same character, that's fine
      if (avatar.character_profile_id === characterId) {
        return NextResponse.json({
          success: true,
          message: 'Avatar already linked to this character',
        });
      }
      // Otherwise, we need to unlink it first (optional - depends on business logic)
    }

    // Unset any existing current avatars for this character
    const { error: unsetError } = await supabase
      .from('avatar_cache')
      .update({ is_current: false })
      .eq('character_profile_id', characterId)
      .neq('id', avatarCacheId); // Don't unset the one we're about to set

    if (unsetError) {
      console.error('Error unsetting other avatars:', unsetError);
      // Continue anyway - not critical
    }

    // Handle preview avatars (those in preview/ folder)
    if (avatar.storage_path && avatar.storage_path.startsWith('preview/')) {
      try {
        const oldPath = avatar.storage_path;
        const newPath = oldPath.replace('preview/', `characters/${characterId}/`);

        // Move the file in storage
        const { data: fileData, error: downloadError } = await supabase.storage
          .from('avatars')
          .download(oldPath);

        if (downloadError) {
          console.error('Error downloading preview:', downloadError);
          throw downloadError;
        }

        const { error: uploadError } = await supabase.storage
          .from('avatars')
          .upload(newPath, fileData, {
            contentType: 'image/png',
            upsert: true,
          });

        if (uploadError) {
          console.error('Error uploading to new location:', uploadError);
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

        // CRITICAL FIX: Update avatar cache with explicit error handling
        const { data: updateData, error: updateError } = await supabase
          .from('avatar_cache')
          .update({
            character_profile_id: characterId,
            storage_path: newPath,
            image_url: urlData.publicUrl,
            is_current: true,
          })
          .eq('id', avatarCacheId)
          .eq('created_by_user_id', user.id) // Extra safety check
          .select()
          .single();

        if (updateError) {
          console.error('CRITICAL: Error updating avatar cache:', {
            error: updateError,
            avatarCacheId,
            characterId,
            userId: user.id,
            errorMessage: updateError.message,
            errorDetails: updateError.details,
            errorHint: updateError.hint,
          });

          // Try a simpler update without the storage path change
          const { error: fallbackError } = await supabase
            .from('avatar_cache')
            .update({
              character_profile_id: characterId,
              is_current: true,
            })
            .eq('id', avatarCacheId);

          if (fallbackError) {
            console.error('CRITICAL: Fallback update also failed:', fallbackError);
            return NextResponse.json(
              {
                error: 'Failed to link avatar to character. RLS policy may be blocking the update.',
                details: updateError.message
              },
              { status: 500 }
            );
          }

          console.log('Fallback update succeeded - avatar linked without moving file');
        }

        // Update character's avatar_cache_id
        const { error: characterUpdateError } = await supabase
          .from('character_profiles')
          .update({
            avatar_cache_id: avatarCacheId,
          })
          .eq('id', characterId)
          .eq('user_id', user.id); // Extra safety

        if (characterUpdateError) {
          console.error('Error updating character avatar reference:', characterUpdateError);
          // Don't fail completely - avatar is linked in avatar_cache
        }

        return NextResponse.json({
          success: true,
          message: 'Preview avatar linked successfully',
          imageUrl: urlData?.publicUrl || avatar.image_url,
        });
      } catch (storageError: any) {
        console.error('Storage operation error:', storageError);

        // Even if storage fails, try to link the avatar
        const { error: linkError } = await supabase
          .from('avatar_cache')
          .update({
            character_profile_id: characterId,
            is_current: true,
          })
          .eq('id', avatarCacheId);

        if (!linkError) {
          return NextResponse.json({
            success: true,
            message: 'Avatar linked (storage move failed but link succeeded)',
            warning: 'Avatar file remains in preview folder',
          });
        }

        return NextResponse.json(
          { error: 'Failed to move and link avatar: ' + storageError.message },
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
        .eq('id', avatarCacheId)
        .eq('created_by_user_id', user.id); // Extra safety check

      if (updateError) {
        console.error('Error linking non-preview avatar:', {
          error: updateError,
          avatarCacheId,
          characterId,
          userId: user.id,
        });
        return NextResponse.json(
          {
            error: 'Failed to link avatar',
            details: updateError.message
          },
          { status: 500 }
        );
      }

      // Update character's avatar_cache_id
      const { error: characterUpdateError } = await supabase
        .from('character_profiles')
        .update({
          avatar_cache_id: avatarCacheId,
        })
        .eq('id', characterId)
        .eq('user_id', user.id);

      if (characterUpdateError) {
        console.error('Error updating character:', characterUpdateError);
        // Don't fail - avatar is linked
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