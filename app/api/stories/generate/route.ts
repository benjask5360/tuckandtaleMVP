import { createClient } from '@/lib/supabase/server';
import { NextResponse } from 'next/server';
import { StoryGenerationService } from '@/lib/services/story-generation';
import { StoryUsageLimitsService } from '@/lib/services/story-usage-limits';
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

    // Validate mode-specific requirements
    if (params.mode === 'growth' && !params.growthTopicId) {
      return NextResponse.json(
        { error: 'growthTopicId is required for growth mode stories' },
        { status: 400 }
      );
    }

    // Check usage limits
    const usageCheck = await StoryUsageLimitsService.canGenerate(user.id);
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

    // Increment usage counts
    await StoryUsageLimitsService.incrementUsage(user.id);

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
