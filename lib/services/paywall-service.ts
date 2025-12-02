/**
 * Paywall Service
 * Handles paywall logic for story access and generation
 */

import { createClient } from '@/lib/supabase/server'
import { PRICING_CONFIG } from '@/lib/config/pricing-config'
import { StoryCompletionService } from './story-completion'
import { BillingCycleService } from './billing-cycle'

export interface PaywallViewingResult {
  required: boolean
  isUnlocked: boolean
}

export interface PaywallGenerationResult {
  required: boolean
  storyNumber: number
  hasCredits: boolean
  hasSubscription: boolean
  freeTrialAvailable: boolean
}

export interface SubscriptionStatus {
  hasActiveSubscription: boolean
  storiesRemaining: number
  storiesUsedThisMonth: number
  billingCycleStart: Date | null
  billingCycleEnd: Date | null
  daysUntilReset: number | null
}

export class PaywallService {
  /**
   * Check if a story requires paywall for viewing (story #2 case)
   * Returns whether paywall should be shown and if story is already unlocked
   */
  static async requiresPaywallForViewing(
    userId: string,
    storyId: string
  ): Promise<PaywallViewingResult> {
    const supabase = await createClient()

    // First check if user has active subscription - they can view everything
    const hasSubscription = await StoryCompletionService.hasActiveSubscription(userId)
    if (hasSubscription) {
      return { required: false, isUnlocked: true }
    }

    // Check story's paywall status
    const { data: story, error } = await supabase
      .from('content')
      .select('requires_paywall, is_unlocked, user_id')
      .eq('id', storyId)
      .single()

    if (error || !story) {
      console.error('Error checking story paywall status:', error)
      return { required: false, isUnlocked: true }
    }

    // Verify story belongs to user
    if (story.user_id !== userId) {
      return { required: true, isUnlocked: false }
    }

    // If story doesn't require paywall, allow viewing
    if (!story.requires_paywall) {
      return { required: false, isUnlocked: true }
    }

    // Story requires paywall - check if it's been unlocked
    return {
      required: true,
      isUnlocked: story.is_unlocked || false,
    }
  }

  /**
   * Check if user must pay BEFORE generating (story 3+ case)
   */
  static async requiresPaywallBeforeGeneration(
    userId: string
  ): Promise<PaywallGenerationResult> {
    const status = await StoryCompletionService.getUserStoryStatus(userId)
    const storyNumber = status.totalStoriesGenerated + 1

    // Subscribers don't need paywall (but may hit 30/month limit - checked separately)
    if (status.hasActiveSubscription) {
      return {
        required: false,
        storyNumber,
        hasCredits: false,
        hasSubscription: true,
        freeTrialAvailable: !status.freeTrialUsed,
      }
    }

    // Has generation credits
    if (status.generationCredits > 0) {
      return {
        required: false,
        storyNumber,
        hasCredits: true,
        hasSubscription: false,
        freeTrialAvailable: !status.freeTrialUsed,
      }
    }

    // Story 1: No paywall needed (free trial or text-only allowed)
    if (storyNumber === 1) {
      return {
        required: false,
        storyNumber,
        hasCredits: false,
        hasSubscription: false,
        freeTrialAvailable: !status.freeTrialUsed,
      }
    }

    // Story 2: No pre-generation paywall (paywall shown after generation)
    if (storyNumber === 2) {
      return {
        required: false,
        storyNumber,
        hasCredits: false,
        hasSubscription: false,
        freeTrialAvailable: !status.freeTrialUsed,
      }
    }

    // Story 3+: Paywall required before generation
    return {
      required: true,
      storyNumber,
      hasCredits: false,
      hasSubscription: false,
      freeTrialAvailable: !status.freeTrialUsed,
    }
  }

  /**
   * Check if a specific story is unlocked (via purchase or subscription)
   */
  static async isStoryUnlocked(userId: string, storyId: string): Promise<boolean> {
    const result = await this.requiresPaywallForViewing(userId, storyId)
    return result.isUnlocked
  }

  /**
   * Unlock a story after payment
   */
  static async unlockStory(
    userId: string,
    storyId: string,
    purchaseId: string
  ): Promise<void> {
    const supabase = await createClient()

    // Verify story belongs to user
    const { data: story, error: fetchError } = await supabase
      .from('content')
      .select('user_id')
      .eq('id', storyId)
      .single()

    if (fetchError || !story) {
      throw new Error('Story not found')
    }

    if (story.user_id !== userId) {
      throw new Error('Story does not belong to user')
    }

    // Update story to mark as unlocked
    const { error: updateError } = await supabase
      .from('content')
      .update({
        is_unlocked: true,
        unlock_purchase_id: purchaseId,
      })
      .eq('id', storyId)

    if (updateError) {
      console.error('Error unlocking story:', updateError)
      throw new Error('Failed to unlock story')
    }
  }

  /**
   * Get comprehensive subscription status for user
   */
  static async getSubscriptionStatus(userId: string): Promise<SubscriptionStatus> {
    const hasSubscription = await StoryCompletionService.hasActiveSubscription(userId)

    if (!hasSubscription) {
      return {
        hasActiveSubscription: false,
        storiesRemaining: 0,
        storiesUsedThisMonth: 0,
        billingCycleStart: null,
        billingCycleEnd: null,
        daysUntilReset: null,
      }
    }

    // Get billing cycle info
    const cycleInfo = await BillingCycleService.getCurrentBillingCycle(userId)

    if (!cycleInfo) {
      return {
        hasActiveSubscription: true,
        storiesRemaining: PRICING_CONFIG.SUBSCRIPTION_MONTHLY_LIMIT,
        storiesUsedThisMonth: 0,
        billingCycleStart: null,
        billingCycleEnd: null,
        daysUntilReset: null,
      }
    }

    const usage = await BillingCycleService.hasStoriesRemaining(userId)

    return {
      hasActiveSubscription: true,
      storiesRemaining: usage.remaining,
      storiesUsedThisMonth: usage.used,
      billingCycleStart: cycleInfo.cycleStart,
      billingCycleEnd: cycleInfo.cycleEnd,
      daysUntilReset: cycleInfo.daysRemaining,
    }
  }

  /**
   * Check if subscriber has reached their monthly limit
   */
  static async hasReachedSubscriptionLimit(userId: string): Promise<boolean> {
    const hasSubscription = await StoryCompletionService.hasActiveSubscription(userId)

    if (!hasSubscription) {
      return false // Not applicable for non-subscribers
    }

    const usage = await BillingCycleService.hasStoriesRemaining(userId)
    return !usage.hasRemaining
  }
}
