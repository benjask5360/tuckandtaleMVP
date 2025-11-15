import { createClient } from '@/lib/supabase/server';
import { NextResponse } from 'next/server';
import { StoryGenerationService } from '@/lib/services/story-generation';
import { StoryUsageLimitsService } from '@/lib/services/story-usage-limits';
import { SubscriptionTierService } from '@/lib/services/subscription-tier';
import type { StoryGenerationParams } from '@/lib/types/story-types';

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

    // Parse request body
    const params: StoryGenerationParams = await request.json();

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

      // Check if growth areas are enabled for this tier
      if (params.growthAreaId && !tier.allow_growth_areas) {
        return NextResponse.json(
          { error: 'Growth area selection is not available on your plan' },
          { status: 403 }
        );
      }
    }

    // Validate feature permissions
    if (params.genreId && !tier.allow_genres) {
      return NextResponse.json(
        { error: 'Genre selection is not available on your plan' },
        { status: 403 }
      );
    }

    if (params.writingStyleId && !tier.allow_writing_styles) {
      return NextResponse.json(
        { error: 'Writing style selection is not available on your plan' },
        { status: 403 }
      );
    }

    if (params.moralLessonId && !tier.allow_moral_lessons) {
      return NextResponse.json(
        { error: 'Moral lesson selection is not available on your plan' },
        { status: 403 }
      );
    }

    if (params.specialRequest && !tier.allow_special_requests) {
      return NextResponse.json(
        { error: 'Special requests are not available on your plan' },
        { status: 403 }
      );
    }

    // Validate story length permission (default to 'medium' if not allowed)
    if (params.lengthId && params.lengthId !== 'medium' && !tier.allow_story_length) {
      return NextResponse.json(
        { error: 'Story length selection is not available on your plan' },
        { status: 403 }
      );
    }

    // Check usage limits - pass includeIllustrations flag
    const includeIllustrations = params.includeIllustrations || false;
    const usageCheck = await StoryUsageLimitsService.canGenerate(user.id, includeIllustrations);
    if (!usageCheck.allowed) {
      return NextResponse.json(
        {
          error: 'Story generation limit reached',
          limits: usageCheck,
        },
        { status: 429 }
      );
    }

    // Generate story (synchronous for MVP)
    const story = await StoryGenerationService.generateStory(user.id, params);

    // Increment usage counts - pass includeIllustrations flag
    await StoryUsageLimitsService.incrementUsage(user.id, includeIllustrations);

    // Get updated usage stats
    const updatedUsage = await StoryUsageLimitsService.getUsageStats(user.id);

    return NextResponse.json({
      success: true,
      story,
      usage: updatedUsage,
      message: 'Story generated successfully',
    });
  } catch (error: any) {
    console.error('Error generating story:', error);

    // Handle specific error types
    if (error.message.includes('No AI config found')) {
      return NextResponse.json(
        { error: 'Story generation service not configured' },
        { status: 503 }
      );
    }

    if (error.message.includes('OpenAI API')) {
      return NextResponse.json(
        { error: 'Story generation service temporarily unavailable' },
        { status: 503 }
      );
    }

    return NextResponse.json(
      { error: error.message || 'Failed to generate story' },
      { status: 500 }
    );
  }
}
