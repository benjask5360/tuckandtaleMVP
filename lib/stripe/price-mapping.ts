/**
 * Stripe Price ID Mapping
 * Maps Stripe price IDs to subscription tiers
 */

import type { BillingPeriod } from '@/lib/types/subscription-types';

// Map of Stripe Price IDs to tier IDs
const PRICE_TO_TIER_MAP: Record<string, string> = {
  // Starlight (tier_basic) - Monthly
  'price_1SToQlAxMZBrawG595QKRUBc': 'tier_basic', // $19.95/mo regular
  'price_1SToSUAxMZBrawG5yJ8vLfMJ': 'tier_basic', // $9.95/mo promo

  // Starlight (tier_basic) - Annual
  'price_1SToTaAxMZBrawG5PQkClHVQ': 'tier_basic', // $149.95/yr regular
  'price_1SToU8AxMZBrawG5xltV8kU2': 'tier_basic', // $99.95/yr promo

  // Supernova (tier_plus) - Monthly
  'price_1SToVKAxMZBrawG5KYNsYeir': 'tier_plus', // $29.95/mo regular
  'price_1SToVmAxMZBrawG5jxKtnzVK': 'tier_plus', // $14.95/mo promo

  // Supernova (tier_plus) - Annual
  'price_1SToWGAxMZBrawG5nmBD4cDM': 'tier_plus', // $249.95/yr regular
  'price_1SToWYAxMZBrawG5DRWZhdLp': 'tier_plus', // $149.95/yr promo
};

// Pricing details for reference
export const STRIPE_PRICES = {
  tier_basic: {
    monthly: {
      regular: {
        id: 'price_1SToQlAxMZBrawG595QKRUBc',
        amount: 1995, // $19.95 in cents
      },
      promo: {
        id: 'price_1SToSUAxMZBrawG5yJ8vLfMJ',
        amount: 995, // $9.95 in cents
      },
    },
    yearly: {
      regular: {
        id: 'price_1SToTaAxMZBrawG5PQkClHVQ',
        amount: 14995, // $149.95 in cents
      },
      promo: {
        id: 'price_1SToU8AxMZBrawG5xltV8kU2',
        amount: 9995, // $99.95 in cents
      },
    },
  },
  tier_plus: {
    monthly: {
      regular: {
        id: 'price_1SToVKAxMZBrawG5KYNsYeir',
        amount: 2995, // $29.95 in cents
      },
      promo: {
        id: 'price_1SToVmAxMZBrawG5jxKtnzVK',
        amount: 1495, // $14.95 in cents
      },
    },
    yearly: {
      regular: {
        id: 'price_1SToWGAxMZBrawG5nmBD4cDM',
        amount: 24995, // $249.95 in cents
      },
      promo: {
        id: 'price_1SToWYAxMZBrawG5DRWZhdLp',
        amount: 14995, // $149.95 in cents
      },
    },
  },
} as const;

/**
 * Get tier ID from Stripe price ID
 */
export function getTierFromPriceId(priceId: string): string | null {
  return PRICE_TO_TIER_MAP[priceId] || null;
}

/**
 * Check if a price ID is valid
 */
export function isValidPriceId(priceId: string): boolean {
  return priceId in PRICE_TO_TIER_MAP;
}

/**
 * Get price ID for a tier
 */
export function getPriceIdForTier(
  tierId: string,
  period: BillingPeriod,
  isPromo: boolean
): string | null {
  const tierPrices = STRIPE_PRICES[tierId as keyof typeof STRIPE_PRICES];
  if (!tierPrices) return null;

  const periodPrices = tierPrices[period];
  if (!periodPrices) return null;

  return isPromo ? periodPrices.promo.id : periodPrices.regular.id;
}

/**
 * Determine billing period from price ID
 */
export function getBillingPeriodFromPriceId(priceId: string): BillingPeriod | null {
  // Monthly price IDs
  const monthlyPrices = [
    'price_1SToQlAxMZBrawG595QKRUBc', // tier_basic regular
    'price_1SToSUAxMZBrawG5yJ8vLfMJ', // tier_basic promo
    'price_1SToVKAxMZBrawG5KYNsYeir', // tier_plus regular
    'price_1SToVmAxMZBrawG5jxKtnzVK', // tier_plus promo
  ];

  // Yearly price IDs
  const yearlyPrices = [
    'price_1SToTaAxMZBrawG5PQkClHVQ', // tier_basic regular
    'price_1SToU8AxMZBrawG5xltV8kU2', // tier_basic promo
    'price_1SToWGAxMZBrawG5nmBD4cDM', // tier_plus regular
    'price_1SToWYAxMZBrawG5DRWZhdLp', // tier_plus promo
  ];

  if (monthlyPrices.includes(priceId)) return 'monthly';
  if (yearlyPrices.includes(priceId)) return 'yearly';
  return null;
}

/**
 * Check if price ID is promotional
 */
export function isPromoPriceId(priceId: string): boolean {
  const promoPrices = [
    'price_1SToSUAxMZBrawG5yJ8vLfMJ', // tier_basic monthly promo
    'price_1SToU8AxMZBrawG5xltV8kU2', // tier_basic yearly promo
    'price_1SToVmAxMZBrawG5jxKtnzVK', // tier_plus monthly promo
    'price_1SToWYAxMZBrawG5DRWZhdLp', // tier_plus yearly promo
  ];

  return promoPrices.includes(priceId);
}

/**
 * Get human-readable tier name
 */
export function getTierDisplayName(tierId: string): string {
  const names: Record<string, string> = {
    tier_free: 'Moonlight (Free)',
    tier_basic: 'Starlight',
    tier_plus: 'Supernova',
    tier_premium: 'Premium',
  };

  return names[tierId] || tierId;
}