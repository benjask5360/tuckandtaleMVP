'use client';

import { Check, Sparkles } from 'lucide-react';
import type { SubscriptionTier } from '@/lib/types/subscription-types';

interface PricingCardProps {
  tier: SubscriptionTier;
  billingPeriod: 'monthly' | 'yearly';
  isCurrentPlan?: boolean;
  isPopular?: boolean;
  onSelectPlan: (tierId: string, billingPeriod: 'monthly' | 'yearly') => void;
}

export default function PricingCard({
  tier,
  billingPeriod,
  isCurrentPlan = false,
  isPopular = false,
  onSelectPlan
}: PricingCardProps) {

  const getPrice = () => {
    if (tier.id === 'tier_free') return 0;

    const usePromo = tier.promo_active;

    if (billingPeriod === 'monthly') {
      return usePromo ? tier.price_monthly_promo : tier.price_monthly;
    } else {
      return usePromo ? tier.price_yearly_promo : tier.price_yearly;
    }
  };

  const getOriginalPrice = () => {
    if (!tier.promo_active) return null;

    if (billingPeriod === 'monthly') {
      return tier.price_monthly;
    } else {
      return tier.price_yearly;
    }
  };

  const price = getPrice();
  const originalPrice = getOriginalPrice();
  const monthlyEquivalent = billingPeriod === 'yearly' && price ? (price / 12).toFixed(2) : null;

  const features = [
    tier.illustrated_limit_month === null
      ? 'Unlimited illustrated stories'
      : `${tier.illustrated_limit_month} illustrated stories/month`,
    tier.text_limit_month === null
      ? 'Unlimited text stories'
      : `${tier.text_limit_month} text stories/month`,
    `${tier.child_profiles} child ${tier.child_profiles === 1 ? 'profile' : 'profiles'}`,
    `${tier.other_character_profiles} character ${tier.other_character_profiles === 1 ? 'profile' : 'profiles'}`,
  ];

  if (tier.allow_pets) features.push('Pet characters');
  if (tier.allow_magical_creatures) features.push('Magical creatures');
  if (tier.allow_growth_stories) features.push('Growth & learning stories');
  if (tier.allow_genres) features.push('Genre selection');
  if (tier.allow_story_length) features.push('Custom story length');

  // Library and favorites - show appropriate text based on what's allowed
  if (tier.allow_library && tier.allow_favorites) {
    features.push('Story library & favorites');
  } else if (tier.allow_library) {
    features.push('Story library');
  }

  if (tier.early_access) features.push('Early access to new features');

  const isFree = tier.id === 'tier_free';

  return (
    <div
      className={`relative flex flex-col p-6 rounded-2xl border-2 transition-all ${
        isPopular
          ? 'border-primary-500 shadow-2xl scale-105 bg-gradient-to-br from-sky-50 to-primary-50'
          : isCurrentPlan
          ? 'border-primary-500 bg-primary-50'
          : 'border-gray-200 bg-white hover:border-gray-300 hover:shadow-lg'
      }`}
    >
      {isPopular && (
        <div className="absolute -top-4 left-1/2 transform -translate-x-1/2">
          <div className="bg-gradient-primary text-white px-4 py-1 rounded-full text-sm font-semibold flex items-center gap-1 shadow-lg">
            <Sparkles className="w-4 h-4" />
            Most Popular
          </div>
        </div>
      )}

      {isCurrentPlan && (
        <div className="absolute -top-4 left-1/2 transform -translate-x-1/2">
          <div className="bg-primary-600 text-white px-4 py-1 rounded-full text-sm font-semibold shadow-lg">
            Current Plan
          </div>
        </div>
      )}

      <div className="flex-grow">
        <h3 className="text-2xl font-bold text-gray-900 mb-2">{tier.name}</h3>

        <div className="mb-6">
          {isFree ? (
            <div className="flex items-baseline gap-2">
              <span className="text-4xl font-bold text-gray-900">Free</span>
            </div>
          ) : (
            <>
              <div className="flex items-baseline gap-2 mb-2">
                {originalPrice && (
                  <span className="text-2xl text-gray-400 line-through">
                    ${originalPrice}
                  </span>
                )}
                <span className="text-4xl font-bold text-gray-900">${price}</span>
                <span className="text-gray-600">/{billingPeriod === 'monthly' ? 'month' : 'year'}</span>
              </div>
              {billingPeriod === 'yearly' && monthlyEquivalent && (
                <p className="text-sm text-gray-500">
                  (${monthlyEquivalent}/month)
                </p>
              )}
            </>
          )}
        </div>

        <ul className="space-y-3 mb-6">
          {features.map((feature, index) => (
            <li key={index} className="flex items-start gap-3">
              <Check className="w-5 h-5 text-green-500 flex-shrink-0 mt-0.5" />
              <span className="text-gray-700 text-sm">{feature}</span>
            </li>
          ))}
        </ul>
      </div>

      <button
        onClick={() => onSelectPlan(tier.id, billingPeriod)}
        disabled={isCurrentPlan || isFree}
        className={`w-full px-6 py-3 rounded-xl font-semibold text-sm transition-all ${
          isCurrentPlan
            ? 'bg-primary-100 text-primary-600 cursor-default'
            : isFree
            ? 'bg-gray-200 text-gray-500 cursor-default'
            : isPopular
            ? 'bg-gradient-primary text-white hover:opacity-90 shadow-lg hover:shadow-xl'
            : 'bg-gray-900 text-white hover:bg-gray-800'
        }`}
      >
        {isCurrentPlan ? 'Current Plan' : isFree ? 'Free Forever' : 'Select Plan'}
      </button>
    </div>
  );
}