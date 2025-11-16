'use client';

import Link from 'next/link';
import { useSubscription } from '@/contexts/SubscriptionContext';
import { Sparkles, ArrowRight } from 'lucide-react';

interface UpgradePromptProps {
  feature?: string;
  className?: string;
  variant?: 'banner' | 'card' | 'inline';
}

export default function UpgradePrompt({
  feature,
  className = '',
  variant = 'card'
}: UpgradePromptProps) {
  const { tier } = useSubscription();

  if (!tier || tier.id === 'tier_plus') {
    // Don't show upgrade prompt for highest tier
    return null;
  }

  const getMessage = () => {
    if (feature) {
      return `Upgrade to unlock ${feature}`;
    }
    if (tier.id === 'tier_free') {
      return 'Upgrade to create more stories and unlock premium features';
    }
    return 'Upgrade to Supernova for unlimited stories';
  };

  const getRecommendedTier = () => {
    if (tier.id === 'tier_free') {
      return { name: 'Starlight', id: 'tier_basic' };
    }
    return { name: 'Supernova', id: 'tier_plus' };
  };

  const recommended = getRecommendedTier();

  if (variant === 'banner') {
    return (
      <div className={`bg-gradient-primary text-white p-4 rounded-lg ${className}`}>
        <div className="flex items-center justify-between gap-4">
          <div className="flex items-center gap-3">
            <Sparkles className="w-5 h-5 flex-shrink-0" />
            <p className="text-sm font-medium">{getMessage()}</p>
          </div>
          <Link
            href="/pricing"
            className="px-4 py-2 bg-white text-primary-600 rounded-lg text-sm font-semibold hover:bg-gray-100 transition-colors whitespace-nowrap flex items-center gap-2"
          >
            Upgrade
            <ArrowRight className="w-4 h-4" />
          </Link>
        </div>
      </div>
    );
  }

  if (variant === 'inline') {
    return (
      <Link
        href="/pricing"
        className={`inline-flex items-center gap-2 text-sm text-primary-600 hover:text-primary-700 font-medium ${className}`}
      >
        <Sparkles className="w-4 h-4" />
        Upgrade to {recommended.name}
        <ArrowRight className="w-4 h-4" />
      </Link>
    );
  }

  // Card variant (default)
  return (
    <div className={`bg-gradient-to-br from-sky-50 to-primary-50 rounded-2xl p-6 text-center border-2 border-primary-200 ${className}`}>
      <div className="w-12 h-12 bg-gradient-primary rounded-full flex items-center justify-center mx-auto mb-4">
        <Sparkles className="w-6 h-6 text-white" />
      </div>
      <h3 className="text-lg font-bold text-gray-900 mb-2">
        {feature ? `Unlock ${feature}` : `Upgrade to ${recommended.name}`}
      </h3>
      <p className="text-gray-600 text-sm mb-4">
        {getMessage()}
      </p>
      <Link
        href="/pricing"
        className="inline-flex items-center gap-2 px-6 py-3 bg-gradient-primary text-white rounded-full font-semibold hover:opacity-90 transition-all shadow-lg hover:shadow-xl"
      >
        View Plans
        <ArrowRight className="w-4 h-4" />
      </Link>
    </div>
  );
}