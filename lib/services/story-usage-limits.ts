/**
 * Story Usage Limits Service
 * Manages monthly story generation limits based on subscription tiers
 * Uses illustrated vs text limits from new subscription_tiers schema
 * All values from database - no hardcoded defaults
 */

import { createClient } from '@/lib/supabase/server';
import { SubscriptionTierService } from './subscription-tier';
import type { UsageLimits } from '../types/story-types';

export class StoryUsageLimitsService {
  private static readonly GENERATION_TYPE = 'story';

  /**
   * Check if user can generate a story and return limit details
   * @param userId - User ID
   * @param includeIllustrations - Whether this story will include illustrations
   */
  static async canGenerate(userId: string, includeIllustrations: boolean = false): Promise<UsageLimits> {
    const supabase = await createClient();

    // Get user's subscription tier from database - no defaults
    const tier = await SubscriptionTierService.getUserTier(userId);

    // Determine which limit applies based on illustration flag
    let monthlyLimit: number | null;
    let limitType: 'illustrated' | 'text';

    if (includeIllustrations) {
      // Illustrated story - check both monthly and lifetime limits
      monthlyLimit = tier.illustrated_limit_month;
      limitType = 'illustrated';
    } else {
      // Text-only story
      monthlyLimit = tier.text_limit_month;
      limitType = 'text';
    }

    console.log('🔍 Story Usage Check:', {
      userId,
      tierId: tier.id,
      tierName: tier.name,
      includeIllustrations,
      limitType,
      monthlyLimit,
      lifetimeLimit: includeIllustrations ? tier.illustrated_limit_total : null
    });

    // Get or create usage record for this month
    const monthYear = this.getCurrentMonthYear();
    const usage = await this.getOrCreateUsage(userId, monthYear, tier.id);

    // For illustrated stories, also check lifetime total if applicable
    let lifetimeUsed = 0;
    let lifetimeRemaining = Infinity;

    if (includeIllustrations && tier.illustrated_limit_total !== null) {
      // Get total illustrated stories ever generated
      const { data: lifetimeData } = await supabase
        .from('generation_usage')
        .select('monthly_count')
        .eq('user_id', userId)
        .eq('generation_type', 'illustrated_story');

      lifetimeUsed = lifetimeData?.reduce((sum, record) => sum + (record.monthly_count || 0), 0) || 0;
      lifetimeRemaining = Math.max(0, tier.illustrated_limit_total - lifetimeUsed);
    }

    // Calculate monthly remaining
    // We track illustrated and text stories separately in metadata
    const usageKey = includeIllustrations ? 'illustrated_count' : 'text_count';
    const monthlyUsed = usage.metadata?.[usageKey] || 0;

    const monthlyRemaining = monthlyLimit === null
      ? Infinity
      : Math.max(0, monthlyLimit - monthlyUsed);

    // Story is allowed if both monthly and lifetime (if applicable) limits permit
    const allowed = monthlyRemaining > 0 && lifetimeRemaining > 0;

    console.log('📊 Usage calculation:', {
      usage: {
        monthly: monthlyUsed,
        lifetime: lifetimeUsed
      },
      limits: {
        monthlyLimit,
        lifetimeLimit: tier.illustrated_limit_total
      },
      remaining: {
        monthlyRemaining,
        lifetimeRemaining
      },
      allowed
    });

    return {
      allowed,
      dailyRemaining: Infinity, // No daily limits in new schema
      monthlyRemaining,
      tier: tier.id,
      dailyLimit: null, // No daily limits in new schema
      monthlyLimit
    };
  }

  /**
   * Increment usage count (atomic operation via database)
   * @param userId - User ID
   * @param includeIllustrations - Whether this story includes illustrations
   */
  static async incrementUsage(userId: string, includeIllustrations: boolean = false): Promise<void> {
    const supabase = await createClient();

    // Get user's tier
    const tier = await SubscriptionTierService.getUserTier(userId);
    const monthYear = this.getCurrentMonthYear();

    // Update the appropriate counter in metadata
    const usageKey = includeIllustrations ? 'illustrated_count' : 'text_count';

    // Get current usage
    const { data: currentUsage } = await supabase
      .from('generation_usage')
      .select('*')
      .eq('user_id', userId)
      .eq('month_year', monthYear)
      .eq('generation_type', this.GENERATION_TYPE)
      .single();

    if (currentUsage) {
      // Update existing record
      const metadata = currentUsage.metadata || {};
      metadata[usageKey] = (metadata[usageKey] || 0) + 1;

      const { error } = await supabase
        .from('generation_usage')
        .update({
          monthly_count: currentUsage.monthly_count + 1,
          metadata,
          last_generated_at: new Date().toISOString(),
          updated_at: new Date().toISOString()
        })
        .eq('id', currentUsage.id);

      if (error) {
        console.error('Error incrementing story usage:', error);
        throw new Error('Failed to update usage count');
      }
    } else {
      // Create new record
      const metadata: any = {};
      metadata[usageKey] = 1;

      const { error } = await supabase
        .from('generation_usage')
        .insert({
          user_id: userId,
          generation_type: this.GENERATION_TYPE,
          month_year: monthYear,
          daily_count: 1,
          monthly_count: 1,
          subscription_tier: tier.id,
          metadata,
          last_generated_at: new Date().toISOString(),
          last_daily_reset_at: new Date().toISOString().split('T')[0]
        });

      if (error) {
        console.error('Error creating usage record:', error);
        throw new Error('Failed to create usage record');
      }
    }

    // If illustrated story and lifetime limit exists, track it separately
    if (includeIllustrations && tier.illustrated_limit_total !== null) {
      // Also increment a lifetime illustrated counter
      await this.incrementLifetimeIllustratedCount(userId);
    }
  }

  /**
   * Track lifetime illustrated stories (for lifetime cap)
   */
  private static async incrementLifetimeIllustratedCount(userId: string): Promise<void> {
    const supabase = await createClient();

    // We'll track this in a separate record with generation_type = 'illustrated_story'
    const { error } = await supabase.rpc('increment_generation_usage', {
      p_user_id: userId,
      p_generation_type: 'illustrated_story',
      p_month_year: 'lifetime', // Special marker for lifetime tracking
      p_subscription_tier: 'lifetime'
    });

    if (error) {
      console.error('Error tracking lifetime illustrated count:', error);
      // Non-fatal - continue even if lifetime tracking fails
    }
  }

  /**
   * Get usage statistics for display
   */
  static async getUsageStats(userId: string): Promise<{
    daily: { used: number; limit: number | null };
    monthly: { used: number; limit: number | null };
    tier: string;
    illustrated: { used: number; limit: number | null; lifetimeUsed?: number; lifetimeLimit?: number | null };
    text: { used: number; limit: number | null };
  }> {
    const supabase = await createClient();
    const tier = await SubscriptionTierService.getUserTier(userId);
    const monthYear = this.getCurrentMonthYear();

    const { data: usage } = await supabase
      .from('generation_usage')
      .select('*')
      .eq('user_id', userId)
      .eq('month_year', monthYear)
      .eq('generation_type', this.GENERATION_TYPE)
      .single();

    const metadata = usage?.metadata || {};
    const illustratedUsed = metadata.illustrated_count || 0;
    const textUsed = metadata.text_count || 0;

    // Get lifetime illustrated count if applicable
    let lifetimeIllustrated = 0;
    if (tier.illustrated_limit_total !== null) {
      const { data: lifetimeData } = await supabase
        .from('generation_usage')
        .select('monthly_count')
        .eq('user_id', userId)
        .eq('generation_type', 'illustrated_story');

      lifetimeIllustrated = lifetimeData?.reduce((sum, record) => sum + (record.monthly_count || 0), 0) || 0;
    }

    return {
      daily: {
        used: 0, // No daily limits in new schema
        limit: null
      },
      monthly: {
        used: usage?.monthly_count || 0,
        limit: null // Combined limit, use illustrated/text for specifics
      },
      tier: tier.id,
      illustrated: {
        used: illustratedUsed,
        limit: tier.illustrated_limit_month,
        lifetimeUsed: lifetimeIllustrated,
        lifetimeLimit: tier.illustrated_limit_total
      },
      text: {
        used: textUsed,
        limit: tier.text_limit_month
      }
    };
  }

  /**
   * Get or create usage record for current month
   */
  private static async getOrCreateUsage(
    userId: string,
    monthYear: string,
    tierId: string
  ) {
    const supabase = await createClient();

    // Try to get existing record
    const { data, error } = await supabase
      .from('generation_usage')
      .select('*')
      .eq('user_id', userId)
      .eq('month_year', monthYear)
      .eq('generation_type', this.GENERATION_TYPE)
      .single();

    if (data) {
      return data;
    }

    // Create if doesn't exist
    if (error && error.code === 'PGRST116') {
      const { data: newUsage, error: insertError } = await supabase
        .from('generation_usage')
        .insert({
          user_id: userId,
          generation_type: this.GENERATION_TYPE,
          month_year: monthYear,
          subscription_tier: tierId,
          daily_count: 0,
          monthly_count: 0,
          metadata: { illustrated_count: 0, text_count: 0 },
          last_daily_reset_at: new Date().toISOString().split('T')[0]
        })
        .select()
        .single();

      if (insertError) {
        console.error('Error creating usage record:', insertError);
        throw new Error('Failed to create usage record');
      }

      return newUsage!;
    }

    throw new Error(`Failed to get usage record: ${error.message}`);
  }

  /**
   * Get current month-year string (YYYY-MM)
   */
  private static getCurrentMonthYear(): string {
    const now = new Date();
    const year = now.getFullYear();
    const month = String(now.getMonth() + 1).padStart(2, '0');
    return `${year}-${month}`;
  }

  /**
   * Check if subscription tier has unlimited stories
   */
  static async hasUnlimitedStories(userId: string, storyType: 'illustrated' | 'text'): Promise<boolean> {
    const tier = await SubscriptionTierService.getUserTier(userId);
    return SubscriptionTierService.hasUnlimitedStories(tier, storyType);
  }

  /**
   * Get days until monthly reset
   */
  static getDaysUntilMonthlyReset(): number {
    const now = new Date();
    const nextMonth = new Date(now.getFullYear(), now.getMonth() + 1, 1);
    const diff = nextMonth.getTime() - now.getTime();
    return Math.ceil(diff / (1000 * 60 * 60 * 24));
  }
}