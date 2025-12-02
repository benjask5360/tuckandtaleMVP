/**
 * Story Usage Limits Service
 * Manages story generation limits for the new hybrid pricing model
 *
 * New model:
 * - Free trial: First illustrated story free
 * - Story #2: Generate then paywall
 * - Story #3+: Paywall before generation
 * - Subscribers: 30 stories per billing cycle
 */

import { StoryCompletionService, type PaywallBehaviorResult } from './story-completion'
import { BillingCycleService, type StoriesRemainingResult } from './billing-cycle'
import { PRICING_CONFIG } from '@/lib/config/pricing-config'

export interface CanGenerateResult {
  allowed: boolean
  reason?: 'subscription_limit_reached' | 'paywall_required' | 'no_access'
  storiesRemaining?: number
  paywallBehavior?: PaywallBehaviorResult
  billingCycleInfo?: {
    used: number
    limit: number
    remaining: number
    daysUntilReset: number
  }
}

export interface UsageStats {
  // For subscribers
  storiesUsedThisMonth: number
  storiesRemaining: number
  monthlyLimit: number
  daysUntilReset: number | null

  // For non-subscribers
  totalStoriesGenerated: number
  freeTrialUsed: boolean
  generationCredits: number

  // Common
  hasActiveSubscription: boolean
}

export class StoryUsageLimitsService {
  /**
   * Check if user can generate a story
   * Main entry point for generation permission checks
   */
  static async canGenerate(
    userId: string,
    includeIllustrations: boolean = true
  ): Promise<CanGenerateResult> {
    // Get paywall behavior which includes subscription check
    const paywallBehavior = await StoryCompletionService.getPaywallBehavior(
      userId,
      includeIllustrations
    )

    // If user has subscription, check billing cycle limits
    if (paywallBehavior.hasSubscription) {
      const cycleUsage = await BillingCycleService.hasStoriesRemaining(userId)
      const cycleInfo = await BillingCycleService.getCurrentBillingCycle(userId)

      if (!cycleUsage.hasRemaining) {
        return {
          allowed: false,
          reason: 'subscription_limit_reached',
          storiesRemaining: 0,
          paywallBehavior,
          billingCycleInfo: {
            used: cycleUsage.used,
            limit: cycleUsage.limit,
            remaining: 0,
            daysUntilReset: cycleInfo?.daysRemaining || 0,
          },
        }
      }

      return {
        allowed: true,
        storiesRemaining: cycleUsage.remaining,
        paywallBehavior,
        billingCycleInfo: {
          used: cycleUsage.used,
          limit: cycleUsage.limit,
          remaining: cycleUsage.remaining,
          daysUntilReset: cycleInfo?.daysRemaining || 0,
        },
      }
    }

    // Non-subscriber: check paywall behavior
    if (!paywallBehavior.canGenerate) {
      return {
        allowed: false,
        reason: 'paywall_required',
        paywallBehavior,
      }
    }

    // Can generate (free trial, story #2, or has credits)
    return {
      allowed: true,
      paywallBehavior,
    }
  }

  /**
   * Get usage statistics for display in UI
   */
  static async getUsageStats(userId: string): Promise<UsageStats> {
    const status = await StoryCompletionService.getUserStoryStatus(userId)

    if (status.hasActiveSubscription) {
      const cycleUsage = await BillingCycleService.hasStoriesRemaining(userId)
      const cycleInfo = await BillingCycleService.getCurrentBillingCycle(userId)

      return {
        storiesUsedThisMonth: cycleUsage.used,
        storiesRemaining: cycleUsage.remaining,
        monthlyLimit: PRICING_CONFIG.SUBSCRIPTION_MONTHLY_LIMIT,
        daysUntilReset: cycleInfo?.daysRemaining || null,
        totalStoriesGenerated: status.totalStoriesGenerated,
        freeTrialUsed: status.freeTrialUsed,
        generationCredits: status.generationCredits,
        hasActiveSubscription: true,
      }
    }

    return {
      storiesUsedThisMonth: 0,
      storiesRemaining: 0,
      monthlyLimit: 0,
      daysUntilReset: null,
      totalStoriesGenerated: status.totalStoriesGenerated,
      freeTrialUsed: status.freeTrialUsed,
      generationCredits: status.generationCredits,
      hasActiveSubscription: false,
    }
  }

  /**
   * Increment usage after successful story generation
   * Handles both story count increment and credit deduction
   */
  static async incrementUsage(
    userId: string,
    options: {
      includeIllustrations: boolean
      usedCredit: boolean
      storyId: string
    }
  ): Promise<{
    newStoryCount: number
    shouldMarkPaywall: boolean
  }> {
    const { includeIllustrations, usedCredit, storyId } = options

    // Get current state before increment
    const statusBefore = await StoryCompletionService.getUserStoryStatus(userId)

    // Increment total story count
    const newStoryCount = await StoryCompletionService.incrementTotalStoryCount(userId)

    // If used a generation credit, deduct it
    if (usedCredit) {
      await StoryCompletionService.consumeGenerationCredit(userId)
    }

    // Determine if this story should be marked as requiring paywall
    // Story #2 for non-subscribers gets the paywall
    const shouldMarkPaywall =
      newStoryCount === 2 &&
      !statusBefore.hasActiveSubscription &&
      !usedCredit

    if (shouldMarkPaywall) {
      await StoryCompletionService.markStoryRequiresPaywall(storyId)
    }

    // If this was the first illustrated story, mark free trial as used
    if (
      newStoryCount === 1 &&
      includeIllustrations &&
      !statusBefore.freeTrialUsed
    ) {
      await StoryCompletionService.markFreeTrialUsed(userId)
    }

    return {
      newStoryCount,
      shouldMarkPaywall,
    }
  }

  /**
   * Get a human-readable message about the user's story allowance
   */
  static async getUsageMessage(userId: string): Promise<string> {
    const stats = await this.getUsageStats(userId)

    if (stats.hasActiveSubscription) {
      if (stats.storiesRemaining === 0) {
        return `You've used all ${stats.monthlyLimit} stories this month. Your limit resets in ${stats.daysUntilReset} days.`
      }
      return `${stats.storiesRemaining} of ${stats.monthlyLimit} stories remaining this month`
    }

    if (stats.generationCredits > 0) {
      return `${stats.generationCredits} story credit${stats.generationCredits === 1 ? '' : 's'} available`
    }

    if (stats.totalStoriesGenerated === 0 && !stats.freeTrialUsed) {
      return 'Your first illustrated story is free!'
    }

    if (stats.totalStoriesGenerated === 1) {
      return 'Create one more story to try our service'
    }

    return 'Subscribe to create unlimited stories'
  }
}
