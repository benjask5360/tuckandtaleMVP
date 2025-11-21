import { createClient } from '@/lib/supabase/server';
import { NextResponse } from 'next/server';
import { BetaStoryGenerationService } from '@/lib/story-engine-v2/services/BetaStoryGenerationService';
import { StoryUsageLimitsService } from '@/lib/services/story-usage-limits';

export async function PUT(
  request: Request,
  { params }: { params: { id: string } }
) {
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

    const storyId = params.id;

    // Fetch the original story to get generation params
    const { data: originalStory, error: fetchError } = await supabase
      .from('content')
      .select('generation_metadata, user_id')
      .eq('id', storyId)
      .eq('content_type', 'story')
      .is('deleted_at', null)
      .single();

    if (fetchError || !originalStory) {
      return NextResponse.json(
        { error: 'Story not found' },
        { status: 404 }
      );
    }

    // Verify ownership
    if (originalStory.user_id !== user.id) {
      return NextResponse.json(
        { error: 'Unauthorized' },
        { status: 403 }
      );
    }

    // Get generation parameters from api_cost_logs (has the full params)
    const { data: costLog } = await supabase
      .from('api_cost_logs')
      .select('generation_params')
      .eq('content_id', storyId)
      .in('operation', ['story_fun', 'story_growth'])
      .order('created_at', { ascending: false })
      .limit(1)
      .single();

    if (!costLog?.generation_params) {
      return NextResponse.json(
        { error: 'Cannot regenerate: original generation parameters not found' },
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

    // Soft delete the old story
    await supabase
      .from('content')
      .update({ deleted_at: new Date().toISOString() })
      .eq('id', storyId);

    // Generate new story with same parameters using Beta engine
    const newStory = await BetaStoryGenerationService.generateStory(
      user.id,
      costLog.generation_params
    );

    // Increment usage counts
    await StoryUsageLimitsService.incrementUsage(user.id);

    // Get updated usage stats
    const updatedUsage = await StoryUsageLimitsService.getUsageStats(user.id);

    return NextResponse.json({
      success: true,
      story: newStory,
      usage: updatedUsage,
      message: 'Story regenerated successfully',
    });
  } catch (error: any) {
    console.error('Error regenerating story:', error);

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
      { error: error.message || 'Failed to regenerate story' },
      { status: 500 }
    );
  }
}
