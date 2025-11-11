/**
 * Vignette Story Generation API Endpoint
 *
 * NEW SYSTEM: Generates visual storyboard descriptions + panoramic images
 * This is SEPARATE from the text-based story generation system.
 *
 * POST /api/vignette-stories/generate
 * Body: Same as regular story generation (StoryGenerationParams)
 *
 * Returns: {
 *   success: boolean,
 *   data?: {
 *     storyId: string,
 *     title: string,
 *     summary: string,
 *     scenes: string[],
 *     panels: VignettePanel[]
 *   },
 *   error?: string
 * }
 */

import { NextRequest, NextResponse } from 'next/server';
import { createClient } from '@/lib/supabase/server';
import { VignetteSplicerService } from '@/lib/services/vignette-splicer';
import type { VignetteStoryParams } from '@/lib/prompt-builders/vignetteStoryPromptBuilder';
import type { StoryGenerationParams } from '@/lib/types/story-types';
import { z } from 'zod';

// ============================================================================
// REQUEST VALIDATION
// ============================================================================

const RequestSchema = z.object({
  heroId: z.string().uuid(),
  characterIds: z.array(z.string().uuid()).optional().default([]),
  adHocCharacters: z.array(z.object({ name: z.string(), role: z.string().optional() })).optional().default([]),
  mode: z.enum(['fun', 'growth']),
  genreId: z.string().uuid(),
  toneId: z.string().uuid(),
  lengthId: z.string().uuid(),
  growthTopicId: z.string().uuid().optional(),
  customInstructions: z.string().optional(),
});

// ============================================================================
// POST HANDLER - Generate Vignette Story
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
      return NextResponse.json({ success: false, error: 'Unauthorized' }, { status: 401 });
    }

    // 2. Parse and validate request
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

    const params: StoryGenerationParams = validation.data;

    console.log('[Vignette Story API] Starting generation...');
    console.log('[Vignette Story API] Mode:', params.mode);
    console.log('[Vignette Story API] Hero ID:', params.heroId);

    // 3. Fetch story parameters (genre, tone, etc.)
    const { data: storyParams, error: paramsError } = await supabase
      .from('story_parameters')
      .select('*')
      .in('id', [params.genreId, params.toneId, params.lengthId, params.growthTopicId].filter(Boolean));

    if (paramsError || !storyParams) {
      throw new Error('Failed to fetch story parameters');
    }

    const genre = storyParams.find((p) => p.id === params.genreId);
    const tone = storyParams.find((p) => p.id === params.toneId);

    if (!genre || !tone) {
      throw new Error('Genre or tone not found');
    }

    // 4. Fetch hero character
    const { data: hero, error: heroError } = await supabase
      .from('character_profiles')
      .select('id, name, character_type, attributes, appearance_description')
      .eq('id', params.heroId)
      .eq('user_id', user.id)
      .single();

    if (heroError || !hero) {
      throw new Error('Hero character not found');
    }

    // 5. Fetch additional characters
    const additionalCharacters = [];
    if (params.characterIds.length > 0) {
      const { data: chars, error: charsError } = await supabase
        .from('character_profiles')
        .select('id, name, character_type, attributes, appearance_description')
        .in('id', params.characterIds)
        .eq('user_id', user.id);

      if (!charsError && chars) {
        additionalCharacters.push(...chars);
      }
    }

    // 6. Build character list with descriptions
    const characters = [hero, ...additionalCharacters].map((char) => ({
      id: char.id,
      name: char.name,
      profileType: char.character_type as any,
      description: char.appearance_description || 'Character in the story',
      attributes: char.attributes,
    }));

    // Add ad-hoc characters
    if (params.adHocCharacters.length > 0) {
      characters.push(
        ...params.adHocCharacters.map((char) => ({
          id: undefined, // Ad-hoc characters have no database ID
          name: char.name,
          description: `${char.role || 'Character'} in the story`,
          profileType: 'storybook_character' as any,
          attributes: {},
          role: char.role as any,
        }))
      );
    }

    // 7. Build vignette story params
    const vignetteParams: VignetteStoryParams = {
      characters,
      genre: genre.display_name,
      tone: tone.display_name,
      mode: params.mode,
      customInstructions: params.customInstructions,
      heroAge: hero.attributes?.age || 6,
    };

    console.log('[Vignette Story API] Generating vignette story...');

    // 8. Generate vignette story (OpenAI + Leonardo + Slicing)
    const result = await VignetteSplicerService.generateVignetteStoryFromScratch(
      vignetteParams,
      user.id
    );

    console.log('[Vignette Story API] Success! Story ID:', result.storyId);

    // 9. Return success response
    return NextResponse.json({
      success: true,
      data: {
        storyId: result.storyId,
        title: result.title,
        summary: result.summary,
        scenes: result.scenes,
        panels: result.panels,
        message: `Successfully generated vignette story with ${result.panels.length} panels`,
      },
    });
  } catch (error: any) {
    console.error('[Vignette Story API] Error:', error);

    return NextResponse.json(
      {
        success: false,
        error: error.message || 'Failed to generate vignette story',
      },
      { status: 500 }
    );
  }
}
