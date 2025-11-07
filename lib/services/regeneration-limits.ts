/**
 * Regeneration Limits Service
 * Manages monthly avatar regeneration limits based on subscription tiers
 */

import { createClient } from '@/lib/supabase/server';

export interface RegenerationStatus {
  used: number;
  limit: number;
  remaining: number;
  resetsInDays: number;
  lastConfigUsed?: string;
}

export class RegenerationLimitsService {
  /**
   * Get remaining regenerations for a character
   */
  static async getRemainingGenerations(
    userId: string,
    characterProfileId: string
  ): Promise<RegenerationStatus> {
    const supabase = await createClient();

    // Call the database function that calculates remaining regenerations
    const { data, error } = await supabase.rpc('get_remaining_regenerations', {
      p_user_id: userId,
      p_character_profile_id: characterProfileId,
    });

    if (error) {
      console.error('Error fetching remaining regenerations:', error);
      // Return default values on error
      return {
        used: 0,
        limit: 1,
        remaining: 1,
        resetsInDays: 30,
      };
    }

    const result = data?.[0];
    if (!result) {
      return {
        used: 0,
        limit: 1,
        remaining: 1,
        resetsInDays: 30,
      };
    }

    // Get last config used
    const monthYear = this.getCurrentMonthYear();
    const { data: usageData } = await supabase
      .from('avatar_generation_usage')
      .select('ai_config_name')
      .eq('user_id', userId)
      .eq('character_profile_id', characterProfileId)
      .eq('month_year', monthYear)
      .single();

    return {
      used: result.used || 0,
      limit: result.limit_count || 1,
      remaining: result.remaining || 0,
      resetsInDays: result.resets_in_days || 30,
      lastConfigUsed: usageData?.ai_config_name,
    };
  }

  /**
   * Check if user can generate an avatar
   */
  static async canGenerate(
    userId: string,
    characterProfileId: string
  ): Promise<boolean> {
    const status = await this.getRemainingGenerations(userId, characterProfileId);
    return status.remaining > 0;
  }

  /**
   * Increment generation count
   */
  static async incrementUsage(
    userId: string,
    characterProfileId: string,
    aiConfigName: string
  ): Promise<boolean> {
    const supabase = await createClient();

    // Call the database function to increment usage
    const { data, error } = await supabase.rpc('increment_avatar_generation', {
      p_user_id: userId,
      p_character_profile_id: characterProfileId,
      p_ai_config_name: aiConfigName,
    });

    if (error) {
      console.error('Error incrementing avatar generation usage:', error);
      return false;
    }

    return data || false;
  }

  /**
   * Get current month-year string
   */
  static getCurrentMonthYear(): string {
    const now = new Date();
    const year = now.getFullYear();
    const month = (now.getMonth() + 1).toString().padStart(2, '0');
    return `${year}-${month}`;
  }

  /**
   * Calculate days until month reset
   */
  static getDaysUntilReset(): number {
    const now = new Date();
    const nextMonth = new Date(now.getFullYear(), now.getMonth() + 1, 1);
    const diffTime = Math.abs(nextMonth.getTime() - now.getTime());
    const diffDays = Math.ceil(diffTime / (1000 * 60 * 60 * 24));
    return diffDays;
  }

  /**
   * Get usage history for a character
   */
  static async getUsageHistory(
    userId: string,
    characterProfileId: string
  ): Promise<any[]> {
    const supabase = await createClient();

    const { data, error } = await supabase
      .from('avatar_generation_usage')
      .select('*')
      .eq('user_id', userId)
      .eq('character_profile_id', characterProfileId)
      .order('created_at', { ascending: false });

    if (error) {
      console.error('Error fetching usage history:', error);
      return [];
    }

    return data || [];
  }

  /**
   * Get user's subscription tier regeneration limit
   */
  static async getTierLimit(userId: string): Promise<number> {
    const supabase = await createClient();

    const { data, error } = await supabase
      .from('user_profiles')
      .select(`
        subscription_tiers (
          avatar_regenerations_per_month
        )
      `)
      .eq('id', userId)
      .single();

    if (error || !data) {
      console.error('Error fetching tier limit:', error);
      return 1; // Default to free tier limit
    }

    // Supabase returns related records as an object, not an array
    const subscriptionTiers = data.subscription_tiers as any;
    return subscriptionTiers?.avatar_regenerations_per_month || 1;
  }

  /**
   * Format limit message for UI
   */
  static formatLimitMessage(status: RegenerationStatus): string {
    if (status.remaining === 0) {
      return `Monthly limit reached. Resets in ${status.resetsInDays} day${
        status.resetsInDays !== 1 ? 's' : ''
      }`;
    }

    if (status.remaining === 1) {
      return 'You can regenerate 1 more time this month';
    }

    return `You can regenerate ${status.remaining} more times this month`;
  }

  /**
   * Get regeneration limit by tier name
   */
  static getTierLimitByName(tierName: string): number {
    const limits: Record<string, number> = {
      free: 1,
      moonlight: 5,
      starlight: 10,
      supernova: 999, // Effectively unlimited
    };

    return limits[tierName] || 1;
  }
}