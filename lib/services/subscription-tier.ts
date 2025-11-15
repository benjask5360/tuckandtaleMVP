/**
 * Central Subscription Tier Service
 * All tier data comes directly from database - no hardcoded values
 */

import { createClient } from '@/lib/supabase/server';
import type {
  SubscriptionTier,
  EffectivePricing,
  TierLimits,
  TierFeatures
} from '@/lib/types/subscription-types';

export class SubscriptionTierService {
  /**
   * Get a user's subscription tier data
   * Throws error if user or tier not found - no defaults
   */
  static async getUserTier(userId: string): Promise<SubscriptionTier> {
    const supabase = await createClient();

    // Get user's tier ID
    const { data: userProfile, error: userError } = await supabase
      .from('user_profiles')
      .select('subscription_tier_id')
      .eq('id', userId)
      .single();

    if (userError || !userProfile) {
      throw new Error(`User profile not found for user ${userId}`);
    }

    // Get full tier data
    const { data: tier, error: tierError } = await supabase
      .from('subscription_tiers')
      .select('*')
      .eq('id', userProfile.subscription_tier_id)
      .single();

    if (tierError || !tier) {
      throw new Error(`Subscription tier not found: ${userProfile.subscription_tier_id}`);
    }

    return tier as SubscriptionTier;
  }

  /**
   * Get tier by ID
   * Throws error if not found - no defaults
   */
  static async getTierById(tierId: string): Promise<SubscriptionTier> {
    const supabase = await createClient();

    const { data: tier, error } = await supabase
      .from('subscription_tiers')
      .select('*')
      .eq('id', tierId)
      .single();

    if (error || !tier) {
      throw new Error(`Subscription tier not found: ${tierId}`);
    }

    return tier as SubscriptionTier;
  }

  /**
   * Calculate effective pricing based on promo_active flag
   */
  static getEffectivePricing(tier: SubscriptionTier): EffectivePricing {
    return {
      monthly: tier.promo_active && tier.price_monthly_promo !== null
        ? tier.price_monthly_promo
        : tier.price_monthly || 0,
      yearly: tier.promo_active && tier.price_yearly_promo !== null
        ? tier.price_yearly_promo
        : tier.price_yearly
    };
  }

  /**
   * Get all limits for a tier
   */
  static getTierLimits(tier: SubscriptionTier): TierLimits {
    return {
      illustrated_limit_total: tier.illustrated_limit_total,
      illustrated_limit_month: tier.illustrated_limit_month,
      text_limit_month: tier.text_limit_month,
      child_profiles: tier.child_profiles,
      other_character_profiles: tier.other_character_profiles,
      avatar_regenerations_month: tier.avatar_regenerations_month
    };
  }

  /**
   * Get all features for a tier
   */
  static getTierFeatures(tier: SubscriptionTier): TierFeatures {
    return {
      allow_pets: tier.allow_pets,
      allow_magical_creatures: tier.allow_magical_creatures,
      allow_fun_stories: tier.allow_fun_stories,
      allow_growth_stories: tier.allow_growth_stories,
      allow_growth_areas: tier.allow_growth_areas,
      allow_genres: tier.allow_genres,
      allow_writing_styles: tier.allow_writing_styles,
      allow_moral_lessons: tier.allow_moral_lessons,
      allow_special_requests: tier.allow_special_requests,
      allow_story_length: tier.allow_story_length,
      allow_advanced_customization: tier.allow_advanced_customization,
      allow_library: tier.allow_library,
      allow_favorites: tier.allow_favorites
    };
  }

  /**
   * Check if user has access to a specific feature
   */
  static async validateFeatureAccess(userId: string, feature: keyof TierFeatures): Promise<boolean> {
    try {
      const tier = await this.getUserTier(userId);
      const features = this.getTierFeatures(tier);
      return features[feature] || false;
    } catch (error) {
      // If tier lookup fails, deny access
      return false;
    }
  }

  /**
   * Get user's tier limits
   */
  static async getUserTierLimits(userId: string): Promise<TierLimits> {
    const tier = await this.getUserTier(userId);
    return this.getTierLimits(tier);
  }

  /**
   * Check if a tier has unlimited stories (for a specific type)
   */
  static hasUnlimitedStories(tier: SubscriptionTier, storyType: 'illustrated' | 'text'): boolean {
    if (storyType === 'illustrated') {
      // Check monthly limit - null means unlimited
      // Note: illustrated_limit_total might still apply as lifetime cap
      return tier.illustrated_limit_month === null;
    } else {
      // Text stories only have monthly limit
      return tier.text_limit_month === null;
    }
  }

  /**
   * Get all active tiers (for pricing page, etc.)
   */
  static async getActiveTiers(): Promise<SubscriptionTier[]> {
    const supabase = await createClient();

    const { data: tiers, error } = await supabase
      .from('subscription_tiers')
      .select('*')
      .eq('is_active', true)
      .order('display_order');

    if (error) {
      throw new Error(`Failed to fetch active tiers: ${error.message}`);
    }

    return (tiers || []) as SubscriptionTier[];
  }
}