/**
 * Story Usage Limits Service
 * Manages daily and monthly story generation limits based on subscription tiers
 * Now uses unified generation_usage table
 */

import { createClient } from '@/lib/supabase/server';
import type { UsageLimits } from '../types/story-types';

export class StoryUsageLimitsService {
  private static readonly GENERATION_TYPE = 'story';
  /**
   * Check if user can generate a story and return limit details
   */
  static async canGenerate(userId: string): Promise<UsageLimits> {
    const supabase = await createClient();

    // 1. Get user's subscription tier
    const { data: userProfile, error: profileError } = await supabase
      .from('user_profiles')
      .select(`
        id,
        subscription_tier_id,
        subscription_tiers (
          tier_name,
          stories_per_day,
          stories_per_month
        )
      `)
      .eq('id', userId)
      .single();

    console.log('🔍 Story Usage Check - User Profile Query:', {
      userId,
      profileError,
      userProfile,
      hasTier: !!userProfile?.subscription_tiers,
    });

    if (!userProfile || !userProfile.subscription_tiers) {
      console.log('⚠️ No user profile or tier found - defaulting to free tier limits');
      // Default to free tier limits
      return {
        allowed: false,
        dailyRemaining: 0,
        monthlyRemaining: 0,
        tier: 'free',
        dailyLimit: 2,
        monthlyLimit: 10,
      };
    }

    const tier = userProfile.subscription_tiers as any;
    const dailyLimit = tier.stories_per_day ?? null; // null = unlimited
    const monthlyLimit = tier.stories_per_month ?? null; // null = unlimited

    console.log('✅ Found subscription tier:', {
      tierName: tier.tier_name,
      dailyLimit,
      monthlyLimit,
    });

    // 2. Get or create usage record
    const monthYear = this.getCurrentMonthYear();
    let usage = await this.getOrCreateUsage(userId, monthYear, tier.tier_name);

    // 3. Reset daily if needed
    usage = await this.resetDailyIfNeeded(usage);

    // 4. Calculate remaining
    const dailyRemaining = dailyLimit === null
      ? Infinity
      : Math.max(0, dailyLimit - usage.daily_count);

    const monthlyRemaining = monthlyLimit === null
      ? Infinity
      : Math.max(0, monthlyLimit - usage.monthly_count);

    const allowed = dailyRemaining > 0 && monthlyRemaining > 0;

    console.log('📊 Usage calculation:', {
      usage: {
        daily: usage.daily_count,
        monthly: usage.monthly_count,
      },
      limits: {
        dailyLimit,
        monthlyLimit,
      },
      remaining: {
        dailyRemaining,
        monthlyRemaining,
      },
      allowed,
    });

    return {
      allowed,
      dailyRemaining: dailyLimit === null ? Infinity : dailyRemaining,
      monthlyRemaining: monthlyLimit === null ? Infinity : monthlyRemaining,
      tier: tier.tier_name,
      dailyLimit,
      monthlyLimit,
    };
  }

  /**
   * Increment usage count (atomic operation via database function)
   */
  static async incrementUsage(userId: string): Promise<void> {
    const supabase = await createClient();

    // Get subscription tier
    const { data: userProfile } = await supabase
      .from('user_profiles')
      .select(`
        subscription_tiers (
          tier_name
        )
      `)
      .eq('user_id', userId)
      .single();

    const tierName = (userProfile?.subscription_tiers as any)?.tier_name || 'free';

    // Call unified database function to increment atomically
    const monthYear = this.getCurrentMonthYear();
    const { error } = await supabase.rpc('increment_generation_usage', {
      p_user_id: userId,
      p_generation_type: this.GENERATION_TYPE,
      p_month_year: monthYear,
      p_subscription_tier: tierName,
    });

    if (error) {
      console.error('Error incrementing story usage:', error);
      throw new Error('Failed to update usage count');
    }
  }

  /**
   * Get usage statistics for display (dashboard, etc.)
   */
  static async getUsageStats(userId: string): Promise<{
    daily: { used: number; limit: number | null };
    monthly: { used: number; limit: number | null };
    tier: string;
  }> {
    const limits = await this.canGenerate(userId);
    const supabase = await createClient();

    const monthYear = this.getCurrentMonthYear();
    const { data: usage } = await supabase
      .from('generation_usage')
      .select('daily_count, monthly_count')
      .eq('user_id', userId)
      .eq('month_year', monthYear)
      .eq('generation_type', this.GENERATION_TYPE)
      .single();

    return {
      daily: {
        used: usage?.daily_count || 0,
        limit: limits.dailyLimit,
      },
      monthly: {
        used: usage?.monthly_count || 0,
        limit: limits.monthlyLimit,
      },
      tier: limits.tier,
    };
  }

  /**
   * Get or create usage record for current month
   */
  private static async getOrCreateUsage(
    userId: string,
    monthYear: string,
    tierName: string
  ) {
    const supabase = await createClient();

    // Try to get existing record
    let { data: usage, error } = await supabase
      .from('generation_usage')
      .select('*')
      .eq('user_id', userId)
      .eq('month_year', monthYear)
      .eq('generation_type', this.GENERATION_TYPE)
      .single();

    // Create if doesn't exist
    if (error && error.code === 'PGRST116') {
      const { data: newUsage, error: insertError } = await supabase
        .from('generation_usage')
        .insert({
          user_id: userId,
          generation_type: this.GENERATION_TYPE,
          month_year: monthYear,
          subscription_tier: tierName,
          daily_count: 0,
          monthly_count: 0,
          last_daily_reset_at: new Date().toISOString().split('T')[0],
        })
        .select()
        .single();

      if (insertError) {
        console.error('Error creating usage record:', insertError);
        // Return default
        return {
          id: '',
          user_id: userId,
          generation_type: this.GENERATION_TYPE,
          month_year: monthYear,
          daily_count: 0,
          monthly_count: 0,
          last_daily_reset_at: new Date().toISOString().split('T')[0],
          subscription_tier: tierName,
          last_generated_at: new Date().toISOString(),
          created_at: new Date().toISOString(),
          updated_at: new Date().toISOString(),
        };
      }

      usage = newUsage;
    }

    return usage!;
  }

  /**
   * Reset daily count if it's a new day
   */
  private static async resetDailyIfNeeded(usage: any) {
    const today = new Date().toISOString().split('T')[0];

    if (usage.last_daily_reset_at !== today) {
      const supabase = await createClient();

      const { data: updated, error } = await supabase
        .from('generation_usage')
        .update({
          daily_count: 0,
          last_daily_reset_at: today,
          updated_at: new Date().toISOString(),
        })
        .eq('id', usage.id)
        .select()
        .single();

      if (error) {
        console.error('Error resetting daily count:', error);
        return usage; // Return original on error
      }

      return updated;
    }

    return usage;
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
  static async hasUnlimitedStories(userId: string): Promise<boolean> {
    const supabase = await createClient();

    const { data: userProfile } = await supabase
      .from('user_profiles')
      .select(`
        subscription_tiers (
          stories_per_day,
          stories_per_month
        )
      `)
      .eq('user_id', userId)
      .single();

    const tier = userProfile?.subscription_tiers as any;

    // Unlimited if both are null
    return tier?.stories_per_day === null && tier?.stories_per_month === null;
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
