/**
 * Story Completion Service
 * Tracks story completion, free trial usage, and generation credits
 */

import { createClient } from '@/lib/supabase/server'
import { PRICING_CONFIG } from '@/lib/config/pricing-config'

export type PaywallBehavior = 'free' | 'generate_then_paywall' | 'paywall_before_generate'

export interface PaywallBehaviorResult {
  storyNumber: number
  behavior: PaywallBehavior
  canGenerate: boolean
  hasCredits: boolean
  hasSubscription: boolean
  freeTrialUsed: boolean
}

export interface UserStoryStatus {
  totalStoriesGenerated: number
  freeTrialUsed: boolean
  generationCredits: number
  purchasedStoryCount: number
  hasActiveSubscription: boolean
  subscriptionTierId: string | null
}

export class StoryCompletionService {
  /**
   * Get the total number of completed stories for a user
   */
  static async getTotalCompletedStoryCount(userId: string): Promise<number> {
    const supabase = await createClient()

    const { data, error } = await supabase
      .from('user_profiles')
      .select('total_stories_generated')
      .eq('id', userId)
      .single()

    if (error || !data) {
      console.error('Error fetching story count:', error)
      return 0
    }

    return data.total_stories_generated || 0
  }

  /**
   * Check if user has used their free illustrated trial
   */
  static async hasUsedFreeTrial(userId: string): Promise<boolean> {
    const supabase = await createClient()

    const { data, error } = await supabase
      .from('user_profiles')
      .select('free_trial_used')
      .eq('id', userId)
      .single()

    if (error || !data) {
      console.error('Error checking free trial:', error)
      return false
    }

    return data.free_trial_used || false
  }

  /**
   * Increment the total story count for a user
   * Called when ANY story completes (illustrated or text-only)
   */
  static async incrementTotalStoryCount(userId: string): Promise<number> {
    const supabase = await createClient()

    const { data, error } = await supabase
      .rpc('increment_total_stories', { p_user_id: userId })

    if (error) {
      console.error('Error incrementing story count:', error)
      // Fallback: manual increment
      const current = await this.getTotalCompletedStoryCount(userId)
      await supabase
        .from('user_profiles')
        .update({ total_stories_generated: current + 1 })
        .eq('id', userId)
      return current + 1
    }

    return data || 0
  }

  /**
   * Mark the free trial as used
   * Called when first illustrated story completes successfully
   */
  static async markFreeTrialUsed(userId: string): Promise<void> {
    const supabase = await createClient()

    const { error } = await supabase
      .from('user_profiles')
      .update({ free_trial_used: true })
      .eq('id', userId)

    if (error) {
      console.error('Error marking free trial as used:', error)
      throw new Error('Failed to mark free trial as used')
    }
  }

  /**
   * Get the number of generation credits a user has
   */
  static async getGenerationCredits(userId: string): Promise<number> {
    const supabase = await createClient()

    const { data, error } = await supabase
      .from('user_profiles')
      .select('generation_credits')
      .eq('id', userId)
      .single()

    if (error || !data) {
      console.error('Error fetching generation credits:', error)
      return 0
    }

    return data.generation_credits || 0
  }

  /**
   * Use one generation credit (consume/deduct)
   * Returns true if successful, false if no credits available
   */
  static async consumeGenerationCredit(userId: string): Promise<boolean> {
    const supabase = await createClient()

    const { data, error } = await supabase
      .rpc('use_generation_credit', { p_user_id: userId })

    if (error) {
      console.error('Error using generation credit:', error)
      return false
    }

    return data === true
  }

  /**
   * Add generation credits to a user's account
   */
  static async addGenerationCredits(userId: string, amount: number = 1): Promise<void> {
    const supabase = await createClient()

    for (let i = 0; i < amount; i++) {
      const { error } = await supabase
        .rpc('increment_generation_credits', { p_user_id: userId })

      if (error) {
        console.error('Error adding generation credit:', error)
        throw new Error('Failed to add generation credit')
      }
    }
  }

  /**
   * Get complete user story status
   */
  static async getUserStoryStatus(userId: string): Promise<UserStoryStatus> {
    const supabase = await createClient()

    const { data, error } = await supabase
      .from('user_profiles')
      .select(`
        total_stories_generated,
        free_trial_used,
        generation_credits,
        purchased_story_count,
        subscription_status,
        subscription_tier_id
      `)
      .eq('id', userId)
      .single()

    if (error || !data) {
      console.error('Error fetching user story status:', error)
      return {
        totalStoriesGenerated: 0,
        freeTrialUsed: false,
        generationCredits: 0,
        purchasedStoryCount: 0,
        hasActiveSubscription: false,
        subscriptionTierId: null,
      }
    }

    console.log('[StoryCompletion] User status:', {
      userId,
      totalStories: data.total_stories_generated,
      freeTrialUsed: data.free_trial_used,
      credits: data.generation_credits,
      purchasedCount: data.purchased_story_count,
      status: data.subscription_status,
      tier: data.subscription_tier_id
    })

    const hasActiveSubscription =
      data.subscription_status === 'active' &&
      data.subscription_tier_id === PRICING_CONFIG.TIER_STORIES_PLUS

    return {
      totalStoriesGenerated: data.total_stories_generated || 0,
      freeTrialUsed: data.free_trial_used || false,
      generationCredits: data.generation_credits || 0,
      purchasedStoryCount: data.purchased_story_count || 0,
      hasActiveSubscription,
      subscriptionTierId: data.subscription_tier_id,
    }
  }

  /**
   * Check if user has an active Stories Plus subscription
   */
  static async hasActiveSubscription(userId: string): Promise<boolean> {
    const supabase = await createClient()

    const { data, error } = await supabase
      .from('user_profiles')
      .select('subscription_status, subscription_tier_id')
      .eq('id', userId)
      .single()

    if (error || !data) {
      return false
    }

    return (
      data.subscription_status === 'active' &&
      data.subscription_tier_id === PRICING_CONFIG.TIER_STORIES_PLUS
    )
  }

  /**
   * Determine paywall behavior based on user's story count and status
   * This is the core logic that determines what happens when a user tries to generate a story
   */
  static async getPaywallBehavior(
    userId: string,
    includeIllustrations: boolean
  ): Promise<PaywallBehaviorResult> {
    const status = await this.getUserStoryStatus(userId)
    const storyNumber = status.totalStoriesGenerated + 1

    // Subscribers can always generate (limit checked separately by billing cycle service)
    if (status.hasActiveSubscription) {
      return {
        storyNumber,
        behavior: 'free',
        canGenerate: true,
        hasCredits: false,
        hasSubscription: true,
        freeTrialUsed: status.freeTrialUsed,
      }
    }

    // Has generation credits from $4.99 purchase
    if (status.generationCredits > 0) {
      return {
        storyNumber,
        behavior: 'free',
        canGenerate: true,
        hasCredits: true,
        hasSubscription: false,
        freeTrialUsed: status.freeTrialUsed,
      }
    }

    // Story 1 with illustrations and trial not used: Free trial
    if (storyNumber === 1 && includeIllustrations && !status.freeTrialUsed) {
      return {
        storyNumber,
        behavior: 'free',
        canGenerate: true,
        hasCredits: false,
        hasSubscription: false,
        freeTrialUsed: false,
      }
    }

    // Story 1 without illustrations: Allow (counts toward total, doesn't use trial)
    if (storyNumber === 1 && !includeIllustrations) {
      return {
        storyNumber,
        behavior: 'free',
        canGenerate: true,
        hasCredits: false,
        hasSubscription: false,
        freeTrialUsed: status.freeTrialUsed,
      }
    }

    // Story 2 (or story 1 with illustrations after trial used): Generate, then show paywall
    // Also applies if user is on story 2+ and their free trial wasn't used yet (they skipped illustrations)
    if (storyNumber === 2 || (storyNumber === 1 && includeIllustrations && status.freeTrialUsed)) {
      // Special case: If on story 1 but trial is used, this shouldn't happen in normal flow
      // But handle it as story 2 behavior
      return {
        storyNumber,
        behavior: 'generate_then_paywall',
        canGenerate: true,
        hasCredits: false,
        hasSubscription: false,
        freeTrialUsed: status.freeTrialUsed,
      }
    }

    // Story 3+: Check if they've unlocked this preview slot
    const maxAllowedPreviewStory = 2 + status.purchasedStoryCount

    if (storyNumber <= maxAllowedPreviewStory) {
      // They've unlocked preview for this story slot
      return {
        storyNumber,
        behavior: 'generate_then_paywall',
        canGenerate: true,
        hasCredits: false,
        hasSubscription: false,
        freeTrialUsed: status.freeTrialUsed,
      }
    }

    // Beyond their unlocked preview slots: paywall before generation
    return {
      storyNumber,
      behavior: 'paywall_before_generate',
      canGenerate: false,
      hasCredits: false,
      hasSubscription: false,
      freeTrialUsed: status.freeTrialUsed,
    }
  }

  /**
   * Mark a story as requiring paywall (for story #2)
   */
  static async markStoryRequiresPaywall(storyId: string): Promise<void> {
    const supabase = await createClient()

    const { error } = await supabase
      .from('content')
      .update({ requires_paywall: true })
      .eq('id', storyId)

    if (error) {
      console.error('Error marking story as requiring paywall:', error)
      throw new Error('Failed to mark story as requiring paywall')
    }
  }

  /**
   * Check if a story requires paywall
   */
  static async storyRequiresPaywall(storyId: string): Promise<boolean> {
    const supabase = await createClient()

    const { data, error } = await supabase
      .from('content')
      .select('requires_paywall')
      .eq('id', storyId)
      .single()

    if (error || !data) {
      return false
    }

    return data.requires_paywall || false
  }
}
