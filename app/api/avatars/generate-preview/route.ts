/**
 * Preview Avatar Generation API Endpoint
 * Generates avatar without requiring a saved character
 */

import { NextRequest, NextResponse } from 'next/server';
import { createClient } from '@/lib/supabase/server';
import { LeonardoClient } from '@/lib/leonardo/client';
import { AIConfigService } from '@/lib/services/ai-config';
import { generateAvatarPrompt } from '@/lib/prompt-builders';
import { ProfileType } from '@/lib/descriptors/types';

interface PreviewGenerationRequest {
  profileType: ProfileType;
  attributes: {
    age?: number;
    gender?: string;
    hairColor?: string;
    hairLength?: string;
    eyeColor?: string;
    skinTone?: string;
    bodyType?: string;
    hasGlasses?: boolean;
    species?: string;
    breed?: string;
    creatureType?: string;
  };
  configName?: string;
}

/**
 * POST /api/avatars/generate-preview
 * Generate avatar preview from form data (no character ID required)
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

    // Parse request body
    const body: PreviewGenerationRequest = await request.json();
    const { profileType, attributes, configName } = body;

    if (!profileType) {
      return NextResponse.json(
        { error: 'Profile type is required' },
        { status: 400 }
      );
    }

    // Get AI configuration
    const aiConfig = await AIConfigService.getAvatarGenerationConfig(configName);
    if (!aiConfig) {
      return NextResponse.json(
        { error: 'AI configuration not found' },
        { status: 500 }
      );
    }

    // Generate avatar prompt using form data
    console.log('Preview avatar prompt - Input:', {
      profileType,
      attributes,
    });

    const avatarPrompt = await generateAvatarPrompt(profileType, {
      age: attributes?.age,
      gender: attributes?.gender,
      hairColor: attributes?.hairColor,
      hairLength: attributes?.hairLength,
      eyeColor: attributes?.eyeColor,
      skinTone: attributes?.skinTone,
      bodyType: attributes?.bodyType,
      hasGlasses: attributes?.hasGlasses,
      species: attributes?.species,
      breed: attributes?.breed,
      creatureType: attributes?.creatureType,
    });

    console.log('Generated preview avatar prompt:', avatarPrompt);

    // Initialize Leonardo client
    const leonardo = new LeonardoClient();

    // Build Leonardo configuration
    const leonardoConfig = AIConfigService.buildLeonardoConfig(
      aiConfig,
      avatarPrompt
    );

    // Start generation
    const { generationId } = await leonardo.generateImage(leonardoConfig);

    // Create a temporary avatar cache entry (not linked to any character yet)
    // We'll use a special flag to indicate this is a preview
    const { data: avatarCache, error: cacheError } = await supabase
      .from('avatar_cache')
      .insert({
        character_profile_id: null, // No character yet - this is a preview
        leonardo_generation_id: generationId,
        ai_config_name: aiConfig.name,
        prompt_used: avatarPrompt,
        processing_status: 'processing',
        storage_path: null, // Will be set when Leonardo completes
        image_url: null, // Will be set when Leonardo completes
        style: 'default', // Default style for now
      })
      .select()
      .single();

    if (cacheError || !avatarCache) {
      console.error('Error creating preview avatar cache:', cacheError);
      return NextResponse.json(
        { error: 'Failed to create avatar cache entry' },
        { status: 500 }
      );
    }

    return NextResponse.json({
      generationId,
      avatarCacheId: avatarCache.id,
      status: 'processing',
      message: 'Preview avatar generation started',
    });
  } catch (error: any) {
    console.error('Preview avatar generation error:', error);
    return NextResponse.json(
      { error: error.message || 'Failed to generate preview avatar' },
      { status: 500 }
    );
  }
}

/**
 * GET /api/avatars/generate-preview?generationId=xxx
 * Poll for preview avatar generation status
 */
export async function GET(request: NextRequest) {
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

    const { searchParams } = new URL(request.url);
    const generationId = searchParams.get('generationId');

    if (!generationId) {
      return NextResponse.json(
        { error: 'Generation ID is required' },
        { status: 400 }
      );
    }

    // Initialize Leonardo client
    const leonardo = new LeonardoClient();

    // Check generation status
    const generationStatus = await leonardo.getGeneration(generationId);

    if (generationStatus.status === 'COMPLETE' && generationStatus.images && generationStatus.images.length > 0) {
      const imageUrl = generationStatus.images[0].url;
      // Get the avatar cache entry
      const { data: avatarCache } = await supabase
        .from('avatar_cache')
        .select('*')
        .eq('leonardo_generation_id', generationId)
        .single();

      if (!avatarCache) {
        return NextResponse.json(
          { error: 'Avatar cache not found' },
          { status: 404 }
        );
      }

      // Download and store the image in Supabase Storage
      // For preview, we'll use a temporary path: previews/{userId}/{generationId}.png
      const fileName = `previews/${user.id}/${generationId}.png`;

      try {
        // Download image from Leonardo
        const imageResponse = await fetch(imageUrl);
        const imageBlob = await imageResponse.blob();
        const imageBuffer = await imageBlob.arrayBuffer();

        // Upload to Supabase Storage
        const { error: uploadError } = await supabase.storage
          .from('avatars')
          .upload(fileName, imageBuffer, {
            contentType: 'image/png',
            upsert: true,
          });

        if (uploadError) {
          console.error('Error uploading preview avatar to storage:', uploadError);
          throw uploadError;
        }

        // Get public URL
        const { data: urlData } = supabase.storage
          .from('avatars')
          .getPublicUrl(fileName);

        // Update avatar cache with storage info
        await supabase
          .from('avatar_cache')
          .update({
            storage_path: fileName,
            processing_status: 'completed',
            image_url: urlData.publicUrl,
          })
          .eq('id', avatarCache.id);

        return NextResponse.json({
          status: 'complete',
          imageUrl: urlData.publicUrl,
          avatarCacheId: avatarCache.id,
        });
      } catch (storageError: any) {
        console.error('Storage error:', storageError);
        // Mark as failed
        await supabase
          .from('avatar_cache')
          .update({
            processing_status: 'failed',
            error_message: storageError.message,
          })
          .eq('id', avatarCache.id);

        return NextResponse.json({
          status: 'failed',
          error: 'Failed to store avatar image',
        });
      }
    } else if (generationStatus.status === 'FAILED') {
      // Update cache status
      const { data: avatarCache } = await supabase
        .from('avatar_cache')
        .select('id')
        .eq('leonardo_generation_id', generationId)
        .single();

      if (avatarCache) {
        await supabase
          .from('avatar_cache')
          .update({
            processing_status: 'failed',
            error_message: 'Leonardo generation failed',
          })
          .eq('id', avatarCache.id);
      }

      return NextResponse.json({
        status: 'failed',
        error: 'Avatar generation failed',
      });
    }

    // Still processing
    return NextResponse.json({
      status: 'processing',
    });
  } catch (error: any) {
    console.error('Preview avatar polling error:', error);
    return NextResponse.json(
      { error: error.message || 'Failed to check avatar status' },
      { status: 500 }
    );
  }
}
