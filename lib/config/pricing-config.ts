/**
 * Pricing Configuration
 * Central configuration for the new hybrid pricing model
 */

export const PRICING_CONFIG = {
  // Free trial settings
  FREE_TRIAL_STORIES: 1, // Number of free illustrated stories
  TRIAL_PERIOD_DAYS: 7, // 7-day free trial for subscription

  // Paywall settings
  PAYWALL_PARAGRAPH_INDEX: 3, // Show paywall after this paragraph (0-indexed, so after 3rd paragraph)

  // Pricing (in cents for Stripe)
  SINGLE_STORY_PRICE_CENTS: 499, // $4.99
  SUBSCRIPTION_PRICE_CENTS: 1499, // $14.99/month
  ORIGINAL_PRICE_CENTS: 2999, // $29.99 (display only, for strikethrough)

  // Subscription limits
  SUBSCRIPTION_MONTHLY_LIMIT: 30, // Stories per month for subscribers

  // Tier IDs
  TIER_FREE: 'tier_free',
  TIER_STORIES_PLUS: 'tier_stories_plus',
} as const

// Display prices (for UI)
export const DISPLAY_PRICES = {
  SINGLE_STORY: '$4.99',
  SUBSCRIPTION_MONTHLY: '$14.99',
  SUBSCRIPTION_MONTHLY_VALUE: 14.99,
  ORIGINAL_MONTHLY: '$29.99', // For strikethrough display
  TRIAL_PERIOD: '7 days free',
} as const

// Stripe Price IDs (to be updated after creating in Stripe Dashboard)
// TODO: Update these after creating products in Stripe
export const STRIPE_PRICE_IDS = {
  STORIES_PLUS_MONTHLY: process.env.STRIPE_PRICE_STORIES_PLUS_MONTHLY || '',
  SINGLE_STORY: process.env.STRIPE_PRICE_SINGLE_STORY || '',
} as const

export type PricingTier = typeof PRICING_CONFIG.TIER_FREE | typeof PRICING_CONFIG.TIER_STORIES_PLUS
