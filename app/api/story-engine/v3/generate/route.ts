/**
 * V3 Story Generation API Route
 *
 * POST /api/story-engine/v3/generate
 *
 * Generates a story using StoryEngine V3 (text-only in Phase 1).
 */

import { createClient } from '@/lib/supabase/server';
import { NextResponse } from 'next/server';
import { V3StoryGenerationService } from '@/lib/story-engine-v3/services/V3StoryGenerationService';
import { StoryUsageLimitsService } from '@/lib/services/story-usage-limits';
import { SubscriptionTierService } from '@/lib/services/subscription-tier';
import type { V3StoryGenerationParams } from '@/lib/story-engine-v3/types';

export async function POST(request: Request) {
  try {
    const supabase = await createClient();

    // Get authenticated user
    const {
      data: { user },
      error: authError,
    } = await supabase.auth.getUser();

    if (authError || !user) {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
    }

    // Parse request body with error handling
    let params: V3StoryGenerationParams;
    try {
      params = await request.json();
    } catch (jsonError) {
      console.error('Failed to parse request JSON:', jsonError);
      return NextResponse.json(
        {
          error: 'Invalid request format. Please ensure you are sending valid JSON.',
          details: jsonError instanceof Error ? jsonError.message : 'JSON parsing failed'
        },
        { status: 400 }
      );
    }

    // Validate required fields
    if (!params.heroId || !params.mode || !params.genreId || !params.toneId || !params.lengthId) {
      return NextResponse.json(
        { error: 'Missing required fields: heroId, mode, genreId, toneId, lengthId' },
        { status: 400 }
      );
    }

    // Get user's tier for feature validation
    const tier = await SubscriptionTierService.getUserTier(user.id);

    // Validate story mode permissions
    if (params.mode === 'fun' && !tier.allow_fun_stories) {
      return NextResponse.json(
        { error: 'Fun stories are not available on your plan' },
        { status: 403 }
      );
    }

    if (params.mode === 'growth' && !tier.allow_growth_stories) {
      return NextResponse.json(
        { error: 'Growth stories are not available on your plan' },
        { status: 403 }
      );
    }

    // Validate mode-specific requirements
    if (params.mode === 'growth') {
      if (!params.growthTopicId) {
        return NextResponse.json(
          { error: 'growthTopicId is required for growth mode stories' },
          { status: 400 }
        );
      }

      if (!tier.allow_growth_areas) {
        return NextResponse.json(
          { error: 'Growth stories are not available on your plan' },
          { status: 403 }
        );
      }
    }

    // Free tier default IDs
    const FREE_TIER_DEFAULTS = {
      genreId: '7359b854-532f-4761-bc1d-4a9ca434461d', // Adventure
      toneId: '486d23c1-f77e-4a5a-87de-6c7d25b75664', // Classic Bedtime
      lengthId: '4701edf9-497b-4483-b1a2-7be30de987d5', // Medium Story
    };

    // Genre validation
    if (params.genreId && !tier.allow_genres) {
      if (params.genreId !== FREE_TIER_DEFAULTS.genreId) {
        return NextResponse.json(
          { error: 'This genre is not available on your plan. Upgrade to access all genres.' },
          { status: 403 }
        );
      }
    }

    // Writing style validation
    if (params.toneId && !tier.allow_writing_styles) {
      if (params.toneId !== FREE_TIER_DEFAULTS.toneId) {
        return NextResponse.json(
          { error: 'This writing style is not available on your plan. Upgrade to access all styles.' },
          { status: 403 }
        );
      }
    }

    // Custom instructions validation
    if (params.customInstructions && !tier.allow_special_requests) {
      return NextResponse.json(
        { error: 'Custom instructions are not available on your plan' },
        { status: 403 }
      );
    }

    // Story length validation
    if (params.lengthId && !tier.allow_story_length) {
      if (params.lengthId !== FREE_TIER_DEFAULTS.lengthId) {
        return NextResponse.json(
          { error: 'This story length is not available on your plan. Upgrade to access all lengths.' },
          { status: 403 }
        );
      }
    }

    // Check usage limits - V3 Phase 1 is text-only
    const usageCheck = await StoryUsageLimitsService.canGenerate(user.id, false);
    if (!usageCheck.allowed) {
      return NextResponse.json(
        {
          error: 'Story generation limit reached',
          limits: usageCheck,
        },
        { status: 429 }
      );
    }

    // Generate story using V3 service
    const result = await V3StoryGenerationService.generateStory(user.id, params);

    // Increment usage counts - pass includeIllustrations flag
    await StoryUsageLimitsService.incrementUsage(user.id, params.includeIllustrations ?? false);

    // Return success response
    return NextResponse.json({
      success: true,
      storyId: result.storyId,
      story: result.story,
      usage: result.usage,
      message: 'Story generated successfully',
      redirect: `/dashboard/stories/v3/${result.storyId}`,
    });

  } catch (error: any) {
    console.error('Error generating V3 story:', error);

    // Handle JSON parsing errors
    if (error instanceof SyntaxError && error.message.includes('JSON')) {
      return NextResponse.json(
        {
          error: 'Failed to parse the AI response. The generated content may be malformed.',
          type: 'json_parsing_error',
          details: error.message
        },
        { status: 500 }
      );
    }

    // Handle timeout errors
    if (error.message.includes('timeout') || error.message.includes('timed out')) {
      return NextResponse.json(
        {
          error: 'Story generation timed out. The AI service may be experiencing high load. Please try again.',
          type: 'timeout_error',
          details: error.message
        },
        { status: 504 }
      );
    }

    // Handle rate limit errors
    if (error.status === 429 || error.message.includes('rate limit')) {
      return NextResponse.json(
        {
          error: 'The AI service is experiencing high demand. Please wait a moment and try again.',
          type: 'rate_limit_error',
          details: error.message
        },
        { status: 429 }
      );
    }

    // Handle AI config errors
    if (error.message.includes('No AI config found')) {
      return NextResponse.json(
        { error: 'Story generation service not configured' },
        { status: 503 }
      );
    }

    // Handle OpenAI API errors
    if (error.message.includes('OpenAI API')) {
      if (error.status === 502 || error.status === 503 || error.message.includes('Bad Gateway') || error.message.includes('Service Unavailable')) {
        return NextResponse.json(
          {
            error: 'The AI service is temporarily unavailable. Please try again in a few moments.',
            type: 'service_unavailable',
            details: error.message
          },
          { status: 503 }
        );
      }

      return NextResponse.json(
        { error: 'Story generation service temporarily unavailable. Please try again in a moment.' },
        { status: 503 }
      );
    }

    // Handle validation errors
    if (error.message.includes('validation failed') || error.message.includes('Invalid')) {
      return NextResponse.json(
        {
          error: 'The generated story did not meet quality standards. Please try again.',
          type: 'validation_error',
          details: error.message
        },
        { status: 500 }
      );
    }

    // Generic error fallback
    return NextResponse.json(
      {
        error: 'An unexpected error occurred while generating your story. Please try again.',
        type: 'unknown_error',
        details: error.message || 'Failed to generate story'
      },
      { status: 500 }
    );
  }
}
