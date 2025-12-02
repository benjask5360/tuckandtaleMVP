/**
 * Regeneration Limits Service
 * Manages monthly avatar regeneration limits
 *
 * Uses unified generation_usage table for tracking monthly counts
 * Uses api_cost_logs for detailed generation history and AI config tracking
 *
 * Note: With the new hybrid pricing model, regeneration limits are generous
 * for all users since paywall controls story access, not features.
 */

import { createClient } from '@/lib/supabase/server';

// Default generous limit for all users
const DEFAULT_REGENERATION_LIMIT = 50;

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
      throw new Error(`Failed to get regeneration status: ${error.message}`);
    }

    const result = data?.[0];
    if (!result) {
      // Return generous default limit for all users
      return {
        used: 0,
        limit: DEFAULT_REGENERATION_LIMIT,
        remaining: DEFAULT_REGENERATION_LIMIT,
        resetsInDays: this.getDaysUntilReset(),
      };
    }

    // Get last config used from api_cost_logs
    const { data: costLog } = await supabase
      .from('api_cost_logs')
      .select('ai_config_name')
      .eq('user_id', userId)
      .eq('character_profile_id', characterProfileId)
      .eq('operation', 'avatar_generation')
      .order('created_at', { ascending: false })
      .limit(1)
      .maybeSingle();

    return {
      used: result.used || 0,
      limit: result.limit_count || 0,
      remaining: result.remaining || 0,
      resetsInDays: result.resets_in_days || this.getDaysUntilReset(),
      lastConfigUsed: costLog?.ai_config_name,
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

    // Get avatar generation history from api_cost_logs
    const { data, error } = await supabase
      .from('api_cost_logs')
      .select('*')
      .eq('user_id', userId)
      .eq('character_profile_id', characterProfileId)
      .eq('operation', 'avatar_generation')
      .order('created_at', { ascending: false });

    if (error) {
      console.error('Error fetching usage history:', error);
      return [];
    }

    return data || [];
  }

  /**
   * Get regeneration limit for user
   * Returns generous default for all users since paywall controls story access
   */
  static async getTierLimit(userId: string): Promise<number> {
    return DEFAULT_REGENERATION_LIMIT;
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

  // REMOVED: getTierLimitByName() method - all limits must come from database
}