'use client';

import { useSubscription } from '@/contexts/SubscriptionContext';

interface TierBadgeProps {
  className?: string;
  showQuota?: boolean;
}

export default function TierBadge({ className = '', showQuota = false }: TierBadgeProps) {
  const { tier, usage, loading } = useSubscription();

  if (loading || !tier) {
    return (
      <div className={`inline-flex items-center gap-2 px-4 py-2 bg-gray-100 rounded-full animate-pulse ${className}`}>
        <div className="h-4 w-24 bg-gray-200 rounded"></div>
      </div>
    );
  }

  const getTierColor = (tierId: string) => {
    switch (tierId) {
      case 'tier_free':
        return 'bg-gray-100 text-gray-700 border-gray-300';
      case 'tier_basic':
        return 'bg-blue-100 text-blue-700 border-blue-300';
      case 'tier_plus':
        return 'bg-purple-100 text-purple-700 border-purple-300';
      case 'tier_premium':
        return 'bg-gradient-to-r from-yellow-100 to-orange-100 text-orange-700 border-orange-300';
      default:
        return 'bg-gray-100 text-gray-700 border-gray-300';
    }
  };

  const illustratedRemaining = tier.illustrated_limit_month === null
    ? 'Unlimited'
    : `${usage?.illustrated.used || 0}/${tier.illustrated_limit_month}`;

  return (
    <div className={`inline-flex flex-col sm:flex-row items-center gap-2 px-4 py-2 border-2 rounded-full ${getTierColor(tier.id)} ${className}`}>
      <span className="font-semibold text-sm">{tier.name}</span>
      {showQuota && (
        <>
          <span className="hidden sm:inline">•</span>
          <span className="text-xs">
            {illustratedRemaining} illustrated/month
          </span>
        </>
      )}
    </div>
  );
}