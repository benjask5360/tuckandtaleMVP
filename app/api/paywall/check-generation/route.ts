/**
 * Check Generation Paywall API Route
 * Returns the user's paywall status for story generation
 */

import { NextResponse } from 'next/server'
import { createClient } from '@/lib/supabase/server'
import { PaywallService } from '@/lib/services/paywall-service'
import { StoryUsageLimitsService } from '@/lib/services/story-usage-limits'

export async function GET() {
  try {
    const supabase = await createClient()

    // Get authenticated user
    const { data: { user }, error: authError } = await supabase.auth.getUser()

    if (authError || !user) {
      return NextResponse.json(
        { error: 'Unauthorized' },
        { status: 401 }
      )
    }

    // Check if generation requires paywall
    const paywallResult = await PaywallService.requiresPaywallBeforeGeneration(user.id)

    // Get full usage info
    const canGenerate = await StoryUsageLimitsService.canGenerate(user.id, true)
    const usageStats = await StoryUsageLimitsService.getUsageStats(user.id)

    return NextResponse.json({
      // Paywall info
      requiresPaywall: paywallResult.required && !paywallResult.hasCredits,
      storyNumber: paywallResult.storyNumber,
      hasCredits: paywallResult.hasCredits,
      hasSubscription: paywallResult.hasSubscription,
      freeTrialAvailable: paywallResult.freeTrialAvailable,

      // Can generate result
      canGenerate: canGenerate.allowed,
      reason: canGenerate.reason,

      // Usage stats for subscribers
      hasActiveSubscription: usageStats.hasActiveSubscription,
      storiesUsedThisMonth: usageStats.storiesUsedThisMonth,
      storiesRemaining: usageStats.storiesRemaining,
      monthlyLimit: usageStats.monthlyLimit,
      daysUntilReset: usageStats.daysUntilReset,

      // Credits for non-subscribers
      generationCredits: usageStats.generationCredits,
    })
  } catch (error) {
    console.error('Error checking generation paywall:', error)
    return NextResponse.json(
      { error: 'Failed to check paywall status' },
      { status: 500 }
    )
  }
}
