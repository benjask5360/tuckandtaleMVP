/**
 * Billing Cycle Service
 * Handles billing cycle calculations and story usage tracking for subscribers
 */

import { createClient } from '@/lib/supabase/server'
import { PRICING_CONFIG } from '@/lib/config/pricing-config'

export interface BillingCycle {
  cycleStart: Date
  cycleEnd: Date
  daysRemaining: number
}

export interface StoriesRemainingResult {
  hasRemaining: boolean
  used: number
  limit: number
  remaining: number
}

export class BillingCycleService {
  /**
   * Get current billing cycle boundaries for a user
   * Uses subscription_starts_at as the anchor date
   */
  static async getCurrentBillingCycle(userId: string): Promise<BillingCycle | null> {
    const supabase = await createClient()

    const { data, error } = await supabase
      .from('user_profiles')
      .select('subscription_starts_at, subscription_status, subscription_tier_id')
      .eq('id', userId)
      .single()

    if (error || !data) {
      console.error('Error fetching subscription info:', error)
      return null
    }

    // Must have active subscription
    if (data.subscription_status !== 'active' || !data.subscription_starts_at) {
      return null
    }

    const subscriptionStartsAt = new Date(data.subscription_starts_at)
    return this.calculateBillingCycle(subscriptionStartsAt, true)
  }

  /**
   * Calculate billing cycle from an anchor date
   * @param subscriptionStartsAt - The original subscription start timestamp
   * @param useExactTimestamp - If true, use the exact timestamp for the first cycle (not midnight)
   */
  static calculateBillingCycle(subscriptionStartsAt: Date, useExactTimestamp: boolean = false): BillingCycle {
    const now = new Date()
    const anchorDay = subscriptionStartsAt.getDate()

    // Find the most recent occurrence of the anchor day
    let cycleStart = new Date(now.getFullYear(), now.getMonth(), anchorDay)

    // If anchor day hasn't happened this month yet, go back one month
    if (cycleStart > now) {
      cycleStart.setMonth(cycleStart.getMonth() - 1)
    }

    // Handle edge case: anchor day doesn't exist in month (e.g., 31st in February)
    // JavaScript automatically rolls over to next month, so we need to check
    if (cycleStart.getDate() !== anchorDay) {
      // Roll back to last day of the intended month
      // First, go to the first of next month, then subtract a day
      const intendedMonth = cycleStart.getMonth()
      cycleStart = new Date(cycleStart.getFullYear(), intendedMonth + 1, 0)
    }

    // Set time to start of day
    cycleStart.setHours(0, 0, 0, 0)

    // For the FIRST billing cycle (same month/year as subscription start),
    // use the exact subscription timestamp so pre-subscription stories don't count
    if (useExactTimestamp) {
      const subStartMidnight = new Date(subscriptionStartsAt)
      subStartMidnight.setHours(0, 0, 0, 0)

      // Check if we're still in the first billing cycle
      // (cycleStart matches the subscription start date)
      if (cycleStart.getTime() === subStartMidnight.getTime()) {
        // Use exact subscription timestamp, not midnight
        cycleStart = new Date(subscriptionStartsAt)
      }
    }

    // Calculate cycle end (one month after the anchor day at midnight)
    const cycleEnd = new Date(now.getFullYear(), now.getMonth(), anchorDay)
    if (cycleEnd <= now) {
      cycleEnd.setMonth(cycleEnd.getMonth() + 1)
    }

    // Handle end-of-month edge case for cycle end
    if (cycleEnd.getDate() !== anchorDay) {
      // Roll to last day of the month
      const intendedMonth = cycleEnd.getMonth()
      cycleEnd.setDate(0)
      cycleEnd.setMonth(intendedMonth)
    }

    // Calculate days remaining
    const msPerDay = 24 * 60 * 60 * 1000
    const daysRemaining = Math.ceil((cycleEnd.getTime() - now.getTime()) / msPerDay)

    return {
      cycleStart,
      cycleEnd,
      daysRemaining: Math.max(0, daysRemaining),
    }
  }

  /**
   * Get story count within current billing cycle
   */
  static async getStoriesInCurrentCycle(userId: string): Promise<number> {
    const cycle = await this.getCurrentBillingCycle(userId)

    if (!cycle) {
      return 0
    }

    const supabase = await createClient()

    const { count, error } = await supabase
      .from('content')
      .select('*', { count: 'exact', head: true })
      .eq('user_id', userId)
      .eq('content_type', 'story')
      .in('generation_status', ['complete', 'text_complete'])
      .gte('created_at', cycle.cycleStart.toISOString())
      .lt('created_at', cycle.cycleEnd.toISOString())
      .is('deleted_at', null)

    if (error) {
      console.error('Error counting stories in cycle:', error)
      return 0
    }

    return count || 0
  }

  /**
   * Check if user has stories remaining in their current billing cycle
   */
  static async hasStoriesRemaining(userId: string): Promise<StoriesRemainingResult> {
    const used = await this.getStoriesInCurrentCycle(userId)
    const limit = PRICING_CONFIG.SUBSCRIPTION_MONTHLY_LIMIT
    const remaining = Math.max(0, limit - used)

    return {
      hasRemaining: remaining > 0,
      used,
      limit,
      remaining,
    }
  }

  /**
   * Format billing cycle dates for display
   */
  static formatCycleDates(cycle: BillingCycle): {
    startFormatted: string
    endFormatted: string
    resetMessage: string
  } {
    const options: Intl.DateTimeFormatOptions = {
      month: 'short',
      day: 'numeric',
    }

    const startFormatted = cycle.cycleStart.toLocaleDateString('en-US', options)
    const endFormatted = cycle.cycleEnd.toLocaleDateString('en-US', options)

    let resetMessage: string
    if (cycle.daysRemaining === 0) {
      resetMessage = 'Resets today'
    } else if (cycle.daysRemaining === 1) {
      resetMessage = 'Resets tomorrow'
    } else {
      resetMessage = `Resets in ${cycle.daysRemaining} days`
    }

    return {
      startFormatted,
      endFormatted,
      resetMessage,
    }
  }
}
