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

      // Check if growth topics are enabled for this tier
      if (!tier.allow_growth_areas) {
        return NextResponse.json(
          { error: 'Growth stories are not available on your plan' },
          { status: 403 }
        );
      }
    }

    // Validate feature permissions
    // Free tier default IDs
    const FREE_TIER_DEFAULTS = {
      genreId: '7359b854-532f-4761-bc1d-4a9ca434461d', // Adventure
      toneId: '486d23c1-f77e-4a5a-87de-6c7d25b75664', // Classic Bedtime
      lengthId: '4701edf9-497b-4483-b1a2-7be30de987d5', // Medium Story
    };

    // Genre validation - allow free tier to use Adventure only
    if (params.genreId && !tier.allow_genres) {
      if (params.genreId !== FREE_TIER_DEFAULTS.genreId) {
        return NextResponse.json(
          { error: 'This genre is not available on your plan. Upgrade to access all genres.' },
          { status: 403 }
        );
      }
    }

    // Writing style validation - allow free tier to use Classic Bedtime only
    if (params.toneId && !tier.allow_writing_styles) {
      if (params.toneId !== FREE_TIER_DEFAULTS.toneId) {
        return NextResponse.json(
          { error: 'This writing style is not available on your plan. Upgrade to access all styles.' },
          { status: 403 }
        );
      }
    }

    // Custom instructions - completely blocked for free tier
    if (params.customInstructions && !tier.allow_special_requests) {
      return NextResponse.json(
        { error: 'Custom instructions are not available on your plan' },
        { status: 403 }
      );
    }

    // Story length validation - allow free tier to use Medium only
    if (params.lengthId && !tier.allow_story_length) {
      if (params.lengthId !== FREE_TIER_DEFAULTS.lengthId) {
        return NextResponse.json(
          { error: 'This story length is not available on your plan. Upgrade to access all lengths.' },
          { status: 403 }
        );
      }
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
