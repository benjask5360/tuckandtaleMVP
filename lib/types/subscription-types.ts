/**
 * Subscription Tier Types
 * Matches the exact database schema from subscription_tiers table
 * All values must come from database - no hardcoded defaults
 */

export interface SubscriptionTier {
  // Core identifiers
  id: string; // tier_free, tier_basic, tier_plus, tier_premium
  name: string; // Display name like "Moonlight (Free)"

  // Pricing fields
  price_monthly: number | null;
  price_monthly_promo: number | null;
  price_yearly: number | null;
  price_yearly_promo: number | null;
  promo_active: boolean;

  // Display metadata
  display_order: number;
  is_active: boolean;

  // Story generation limits
  illustrated_limit_total: number | null; // Lifetime cap, NULL = no cap
  illustrated_limit_month: number; // Monthly illustrated story quota
  text_limit_month: number; // Monthly text-only story quota

  // Profile limits
  child_profiles: number;
  other_character_profiles: number;

  // Avatar limits
  avatar_regenerations_month: number;

  // Character type permissions
  allow_pets: boolean;
  allow_magical_creatures: boolean;

  // Story mode permissions
  allow_fun_stories: boolean;
  allow_growth_stories: boolean;
  allow_growth_areas: boolean;

  // Customization permissions
  allow_genres: boolean;
  allow_writing_styles: boolean;
  allow_moral_lessons: boolean;
  allow_special_requests: boolean;
  allow_story_length: boolean;
  allow_advanced_customization: boolean;

  // Library features
  allow_library: boolean;
  allow_favorites: boolean;

  // Support and access
  early_access: boolean;
  support_level: 'standard' | 'priority' | 'premium';

  // Stripe Price IDs
  stripe_price_monthly: string | null;
  stripe_price_monthly_promo: string | null;
  stripe_price_yearly: string | null;
  stripe_price_yearly_promo: string | null;

  // Timestamps
  created_at: string;
  updated_at: string;
}

export interface EffectivePricing {
  monthly: number;
  yearly: number | null;
}

export interface TierLimits {
  illustrated_limit_total: number | null;
  illustrated_limit_month: number;
  text_limit_month: number;
  child_profiles: number;
  other_character_profiles: number;
  avatar_regenerations_month: number;
}

export interface TierFeatures {
  allow_pets: boolean;
  allow_magical_creatures: boolean;
  allow_fun_stories: boolean;
  allow_growth_stories: boolean;
  allow_growth_areas: boolean;
  allow_genres: boolean;
  allow_writing_styles: boolean;
  allow_moral_lessons: boolean;
  allow_special_requests: boolean;
  allow_story_length: boolean;
  allow_advanced_customization: boolean;
  allow_library: boolean;
  allow_favorites: boolean;
}

// User profile with subscription tier
export interface UserProfile {
  id: string;
  subscription_tier_id: string; // References subscription_tiers.id
  subscription_status: 'active' | 'inactive' | 'trialing' | 'past_due' | 'canceled';
  stripe_customer_id: string | null;
  stripe_subscription_id: string | null;
  subscription_starts_at: string | null;
  subscription_ends_at: string | null;
  created_at: string;
  updated_at: string;
}

// Billing period for subscription
export type BillingPeriod = 'monthly' | 'yearly';

// User preferences for email notifications and settings
export interface UserPreferences {
  id: string; // References auth.users.id
  email_marketing: boolean;
  email_product_updates: boolean;
  email_account_notifications: boolean;
  created_at: string;
  updated_at: string;
}

// Extended user profile data with preferences
export interface UserProfileData {
  email: string;
  full_name: string;
  created_at: string;
  email_verified: boolean;
  preferences: {
    email_marketing: boolean;
    email_product_updates: boolean;
    email_account_notifications: boolean;
  };
}