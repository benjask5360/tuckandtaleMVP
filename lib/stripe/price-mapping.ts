/**
 * Stripe Price ID Mapping
 * Maps Stripe price IDs to subscription tiers for the new pricing model
 *
 * New model:
 * - Stories Plus: $14.99/month subscription (30 stories)
 * - Single Story: $4.99 one-time purchase
 */

import { PRICING_CONFIG } from '@/lib/config/pricing-config'

// Environment variables for Stripe Price IDs
// These should be set after creating the products in Stripe Dashboard
const STORIES_PLUS_MONTHLY_PRICE_ID = process.env.STRIPE_PRICE_STORIES_PLUS_MONTHLY || ''
const SINGLE_STORY_PRICE_ID = process.env.STRIPE_PRICE_SINGLE_STORY || ''

// Map of Stripe Price IDs to tier IDs
const PRICE_TO_TIER_MAP: Record<string, string> = {
  // Stories Plus - Monthly subscription
  [STORIES_PLUS_MONTHLY_PRICE_ID]: PRICING_CONFIG.TIER_STORIES_PLUS,
}

// Pricing details for the new model
export const STRIPE_PRICES = {
  // Stories Plus subscription
  stories_plus: {
    monthly: {
      id: STORIES_PLUS_MONTHLY_PRICE_ID,
      amount: PRICING_CONFIG.SUBSCRIPTION_PRICE_CENTS, // $14.99 in cents
    },
  },

  // Single story one-time purchase
  single_story: {
    id: SINGLE_STORY_PRICE_ID,
    amount: PRICING_CONFIG.SINGLE_STORY_PRICE_CENTS, // $4.99 in cents
  },
} as const

/**
 * Get tier ID from Stripe price ID
 */
export function getTierFromPriceId(priceId: string): string | null {
  return PRICE_TO_TIER_MAP[priceId] || null
}

/**
 * Check if a price ID is for a subscription
 */
export function isSubscriptionPriceId(priceId: string): boolean {
  return priceId === STRIPE_PRICES.stories_plus.monthly.id
}

/**
 * Check if a price ID is for a single story purchase
 */
export function isSingleStoryPriceId(priceId: string): boolean {
  return priceId === STRIPE_PRICES.single_story.id
}

/**
 * Check if a price ID is valid (either subscription or single story)
 */
export function isValidPriceId(priceId: string): boolean {
  return isSubscriptionPriceId(priceId) || isSingleStoryPriceId(priceId)
}

/**
 * Get the Stories Plus subscription price ID
 */
export function getStoriesPlusPriceId(): string {
  if (!STRIPE_PRICES.stories_plus.monthly.id) {
    console.warn('STRIPE_PRICE_STORIES_PLUS_MONTHLY environment variable not set')
  }
  return STRIPE_PRICES.stories_plus.monthly.id
}

/**
 * Get the single story price ID
 */
export function getSingleStoryPriceId(): string {
  if (!STRIPE_PRICES.single_story.id) {
    console.warn('STRIPE_PRICE_SINGLE_STORY environment variable not set')
  }
  return STRIPE_PRICES.single_story.id
}

/**
 * Get human-readable tier name
 */
export function getTierDisplayName(tierId: string): string {
  const names: Record<string, string> = {
    [PRICING_CONFIG.TIER_FREE]: 'Free',
    [PRICING_CONFIG.TIER_STORIES_PLUS]: 'Stories Plus',
  }

  return names[tierId] || tierId
}

/**
 * Get display price for a product
 */
export function getDisplayPrice(product: 'stories_plus' | 'single_story'): string {
  if (product === 'stories_plus') {
    return '$14.99/month'
  }
  return '$4.99'
}
