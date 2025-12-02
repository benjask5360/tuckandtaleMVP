import { createClient } from '@/lib/supabase/server';
import { StoryUsageLimitsService } from '@/lib/services/story-usage-limits';
import { NextResponse } from 'next/server';

// Force dynamic rendering
export const dynamic = 'force-dynamic';

export async function GET() {
  try {
    const supabase = await createClient();

    // Check authentication
    const {
      data: { user },
      error: authError,
    } = await supabase.auth.getUser();

    if (authError || !user) {
      return NextResponse.json(
        { error: 'Authentication required' },
        { status: 401 }
      );
    }

    // Get usage statistics
    const stats = await StoryUsageLimitsService.getUsageStats(user.id);

    return NextResponse.json({
      // For subscribers
      storiesUsedThisMonth: stats.storiesUsedThisMonth,
      storiesRemaining: stats.storiesRemaining,
      monthlyLimit: stats.monthlyLimit,
      daysUntilReset: stats.daysUntilReset,

      // For non-subscribers
      totalStoriesGenerated: stats.totalStoriesGenerated,
      freeTrialUsed: stats.freeTrialUsed,
      generationCredits: stats.generationCredits,

      // Common
      hasActiveSubscription: stats.hasActiveSubscription,
    });
  } catch (error: any) {
    console.error('Usage stats error:', error);
    return NextResponse.json(
      { error: error.message || 'Failed to fetch usage statistics' },
      { status: 500 }
    );
  }
}
