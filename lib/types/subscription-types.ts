/**
 * Subscription Types
 * Types for the new hybrid pricing model
 */

// User profile subscription status
export interface UserSubscriptionStatus {
  subscription_tier_id: string; // tier_free or tier_stories_plus
  subscription_status: 'active' | 'inactive' | 'trialing' | 'past_due' | 'canceled' | null;
  stripe_customer_id: string | null;
  stripe_subscription_id: string | null;
  subscription_starts_at: string | null;
  subscription_ends_at: string | null;
}

// Extended user profile data with preferences for API responses
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

// Billing period for subscription
export type BillingPeriod = 'monthly' | 'yearly';

// Paywall behavior types
export type PaywallBehavior = 'free' | 'generate_then_paywall' | 'paywall_before_generate';

// Story paywall status
export interface StoryPaywallStatus {
  required: boolean;
  isUnlocked: boolean;
  storyTitle?: string;
  paywallParagraphIndex?: number;
}

// Pre-generation paywall status
export interface GenerationPaywallStatus {
  requiresPaywall: boolean;
  storyNumber: number;
  hasCredits: boolean;
  hasSubscription: boolean;
  storiesUsedThisMonth?: number;
  storiesRemaining?: number;
  daysUntilReset?: number;
  freeTrialUsed?: boolean;
}
