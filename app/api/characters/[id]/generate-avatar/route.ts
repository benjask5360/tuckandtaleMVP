/**
 * Avatar Generation API Endpoint
 * Handles avatar generation via Leonardo AI
 */

import { NextRequest, NextResponse } from 'next/server';
import { createClient } from '@/lib/supabase/server';
import { LeonardoClient } from '@/lib/leonardo/client';
import { AIConfigService } from '@/lib/services/ai-config';
import { RegenerationLimitsService } from '@/lib/services/regeneration-limits';
import { generateAvatarPrompt } from '@/lib/prompt-builders';

interface GenerationRequest {
  configName?: string; // Optional specific config, otherwise use default
  regenerate?: boolean; // Is this a regeneration?
}

/**
 * POST /api/characters/[id]/generate-avatar
 * Initiate avatar generation
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
    const body: GenerationRequest = await request.json();

    // Get character profile
    const { data: character, error: characterError } = await supabase
      .from('character_profiles')
      .select('*')
      .eq('id', characterId)
      .eq('user_id', user.id)
      .single();

    if (characterError || !character) {
      return NextResponse.json(
        { error: 'Character not found' },
        { status: 404 }
      );
    }

    // Check regeneration limits
    const canGenerate = await RegenerationLimitsService.canGenerate(
      user.id,
      characterId
    );

    if (!canGenerate) {
      const status = await RegenerationLimitsService.getRemainingGenerations(
        user.id,
        characterId
      );

      return NextResponse.json(
        {
          error: 'Monthly regeneration limit reached',
          message: `Monthly limit reached. Resets in ${status.resetsInDays} days`,
          status,
        },
        { status: 429 }
      );
    }

    // Get AI configuration
    const aiConfig = await AIConfigService.getAvatarGenerationConfig(body.configName);
    if (!aiConfig) {
      return NextResponse.json(
        { error: 'AI configuration not found' },
        { status: 500 }
      );
    }

    // Generate avatar prompt using existing prompt builder
    console.log('Character data for prompt:', {
      character_type: character.character_type,
      attributes: character.attributes,
    });

    const avatarPrompt = await generateAvatarPrompt(
      character.character_type,
      {
        age: character.attributes?.age,
        gender: character.attributes?.gender,
        hairColor: character.attributes?.hairColor,
        hairLength: character.attributes?.hairLength,
        hairType: character.attributes?.hairType,
        eyeColor: character.attributes?.eyeColor,
        skinTone: character.attributes?.skinTone,
        bodyType: character.attributes?.bodyType,
        hasGlasses: character.attributes?.hasGlasses,
        species: character.attributes?.species,
        breed: character.attributes?.breed,
        primaryColor: character.attributes?.primaryColor,
        creatureType: character.attributes?.creatureType,
        color: character.attributes?.color, // Magical creature color
      }
    );

    console.log('Generated avatar prompt:', avatarPrompt);

    // Initialize Leonardo client
    const leonardo = new LeonardoClient();

    // Build Leonardo configuration
    const leonardoConfig = AIConfigService.buildLeonardoConfig(
      aiConfig,
      avatarPrompt
    );

    // Start generation
    const { generationId, apiCreditCost } = await leonardo.generateImage(leonardoConfig);

    console.log('Leonardo POST response - generationId:', generationId, 'apiCreditCost:', apiCreditCost);

    // Create avatar cache entry
    // Storage path follows RLS policy: {userId}/{characterId}/{generationId}.png
    const fileName = `${user.id}/${characterId}/${generationId}.png`;
    const { data: avatarCache, error: cacheError } = await supabase
      .from('avatar_cache')
      .insert({
        character_profile_id: characterId,
        leonardo_generation_id: generationId,
        leonardo_model_id: aiConfig.model_id,
        ai_config_id: aiConfig.id,
        ai_config_name: aiConfig.name,
        prompt_used: avatarPrompt,
        storage_path: fileName, // Set the expected path upfront
        image_url: '', // Will be set when processing completes
        style: 'classic', // Default style for children's book illustrations
        processing_status: 'processing',
        generation_metadata: {
          config: leonardoConfig,
          timestamp: new Date().toISOString(),
          initial_api_credit_cost: apiCreditCost, // Store the cost from initial POST response
        },
      })
      .select()
      .single();

    if (cacheError) {
      console.error('Error creating avatar cache entry:', cacheError);
    }

    // Increment usage count
    await RegenerationLimitsService.incrementUsage(
      user.id,
      characterId,
      aiConfig.name
    );

    // Get updated regeneration status
    const regenerationStatus = await RegenerationLimitsService.getRemainingGenerations(
      user.id,
      characterId
    );

    return NextResponse.json({
      generationId,
      avatarCacheId: avatarCache?.id,
      estimatedTime: 20, // 20 seconds average
      regenerationStatus,
      message: 'Avatar generation started',
    });
  } catch (error: any) {
    console.error('Avatar generation error:', error);
    return NextResponse.json(
      { error: error.message || 'Failed to generate avatar' },
      { status: 500 }
    );
  }
}

/**
 * GET /api/characters/[id]/generate-avatar?generationId=xxx
 * Poll for generation status
 */
export async function GET(
  request: NextRequest,
  { params }: { params: { id: string } }
) {
  try {
    const supabase = await createClient();
    const characterId = params.id;
    const searchParams = request.nextUrl.searchParams;
    const generationId = searchParams.get('generationId');

    if (!generationId) {
      return NextResponse.json(
        { error: 'Generation ID required' },
        { status: 400 }
      );
    }

    // Get authenticated user
    const { data: { user }, error: authError } = await supabase.auth.getUser();
    if (authError || !user) {
      return NextResponse.json(
        { error: 'Unauthorized' },
        { status: 401 }
      );
    }

    // Get avatar cache entry
    const { data: avatarCache, error: cacheError } = await supabase
      .from('avatar_cache')
      .select('*')
      .eq('leonardo_generation_id', generationId)
      .eq('character_profile_id', characterId)
      .single();

    if (cacheError || !avatarCache) {
      return NextResponse.json(
        { error: 'Generation not found' },
        { status: 404 }
      );
    }

    // If already complete, return cached result
    if (avatarCache.processing_status === 'completed' && avatarCache.image_url) {
      return NextResponse.json({
        status: 'complete',
        progress: 100,
        imageUrl: avatarCache.image_url,
        storagePath: avatarCache.storage_path,
        message: 'Avatar ready!',
      });
    }

    // If failed, return error
    if (avatarCache.processing_status === 'failed') {
      return NextResponse.json({
        status: 'failed',
        progress: 0,
        error: avatarCache.error_message || 'Generation failed',
        message: 'Generation failed. Please try again.',
      });
    }

    // Poll Leonardo for status
    const leonardo = new LeonardoClient();
    const generation = await leonardo.getGeneration(generationId);

    if (generation.status === 'COMPLETE' && generation.images?.[0]) {
      // Download and upload to Supabase
      const imageUrl = generation.images[0].url;
      const imageBlob = await leonardo.downloadImage(imageUrl);

      // Convert blob to array buffer
      const arrayBuffer = await imageBlob.arrayBuffer();
      const buffer = Buffer.from(arrayBuffer);

      // Upload to Supabase Storage
      // Use the storage_path from avatar_cache which follows RLS policy
      const fileName = avatarCache.storage_path;
      const { error: uploadError } = await supabase.storage
        .from('avatars')
        .upload(fileName, buffer, {
          contentType: 'image/png',
          upsert: true,
        });

      if (uploadError) {
        console.error('Error uploading avatar:', uploadError);
        throw new Error('Failed to upload avatar');
      }

      // Get public URL
      const { data: { publicUrl } } = supabase.storage
        .from('avatars')
        .getPublicUrl(fileName);

      // Get AI config for logging
      const aiConfigForCost = await AIConfigService.getConfigByName(avatarCache.ai_config_name);

      // Use the apiCreditCost stored from the initial POST response
      const initialApiCreditCost = avatarCache.generation_metadata?.initial_api_credit_cost;
      const actualCost = initialApiCreditCost ?? 1; // Fallback to 1 credit if not available

      console.log('Cost calculation:', {
        initialApiCreditCost,
        actualCostUsed: actualCost,
        source: initialApiCreditCost !== undefined ? 'leonardo_initial_post' : 'fallback',
      });

      // Update avatar cache
      await supabase
        .from('avatar_cache')
        .update({
          processing_status: 'completed',
          image_url: publicUrl,
          storage_path: fileName,
          leonardo_api_credits_used: actualCost,
          generation_metadata: {
            ...avatarCache.generation_metadata,
            leonardo_response: generation,
            completed_at: new Date().toISOString(),
          },
        })
        .eq('id', avatarCache.id);

      // NOTE: We don't auto-save the avatar to character profile here
      // The user must click "Update Profile" to save the new avatar
      // This allows them to regenerate multiple times or cancel if they don't like it

      // Mark this avatar as the latest generated (but not necessarily current)
      await supabase
        .from('avatar_cache')
        .update({ is_current: false })
        .eq('character_profile_id', characterId)
        .eq('is_current', true);

      // The avatar is ready but not set as current - user must save the form to apply it

      // Log cost (reuse the actualCost calculated above)
      const aiConfig = await AIConfigService.getConfigByName(avatarCache.ai_config_name);

      console.log('Logging API cost for generation:', {
        userId: user.id,
        characterId,
        aiConfigName: avatarCache.ai_config_name,
        creditCost: actualCost,
      });

      if (aiConfig) {
        await AIConfigService.logGenerationCost(
          user.id,
          characterId,
          aiConfig,
          actualCost,
          {
            generation_id: generationId,
            actual_cost: initialApiCreditCost, // Pass the real Leonardo cost from initial POST
          }
        );
        console.log('API cost logged successfully');
      } else {
        console.error('Failed to get AI config for cost logging:', avatarCache.ai_config_name);
      }

      return NextResponse.json({
        status: 'complete',
        progress: 100,
        imageUrl: publicUrl,
        storagePath: fileName,
        message: 'Avatar generated successfully!',
      });
    }

    // Still processing
    const progress = generation.status === 'PROCESSING' ? 60 : 30;
    const message =
      generation.status === 'PROCESSING'
        ? 'Generating your unique avatar...'
        : 'Starting avatar generation...';

    return NextResponse.json({
      status: 'processing',
      progress,
      message,
    });
  } catch (error: any) {
    console.error('Avatar status check error:', error);

    // Update cache entry with error
    const supabase = await createClient();
    const generationId = request.nextUrl.searchParams.get('generationId');

    if (generationId) {
      await supabase
        .from('avatar_cache')
        .update({
          processing_status: 'failed',
          error_message: error.message,
        })
        .eq('leonardo_generation_id', generationId);
    }

    return NextResponse.json(
      { error: error.message || 'Failed to check generation status' },
      { status: 500 }
    );
  }
}