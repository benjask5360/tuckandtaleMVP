'use client';

import { useSubscription } from '@/contexts/SubscriptionContext';
import Link from 'next/link';

interface UsageMeterProps {
  type: 'illustrated' | 'text';
  className?: string;
  showLabel?: boolean;
}

export default function UsageMeter({ type, className = '', showLabel = true }: UsageMeterProps) {
  const { tier, usage, loading } = useSubscription();

  if (loading || !tier || !usage) {
    return (
      <div className={`animate-pulse ${className}`}>
        <div className="h-4 bg-gray-200 rounded mb-2"></div>
        <div className="h-2 bg-gray-200 rounded"></div>
      </div>
    );
  }

  // Type assertion to ensure TypeScript knows about all fields
  const stats = type === 'illustrated'
    ? usage.illustrated
    : { ...usage.text, lifetimeUsed: 0, lifetimeLimit: null };

  // Free tier illustrated stories use lifetime limit, not monthly
  const isFreeTierIllustrated = tier.id === 'tier_free' && type === 'illustrated';
  const usedCount = isFreeTierIllustrated ? stats.lifetimeUsed : stats.used;
  const limit = isFreeTierIllustrated
    ? stats.lifetimeLimit
    : (type === 'illustrated' ? tier.illustrated_limit_month : tier.text_limit_month);

  const isUnlimited = limit === null;
  const percentage = isUnlimited ? 0 : Math.min(100, (usedCount / limit) * 100);
  const remaining = isUnlimited ? null : Math.max(0, limit - usedCount);

  const getColor = () => {
    if (isUnlimited) return 'bg-green-500';
    if (percentage >= 100) return 'bg-red-500';
    if (percentage >= 80) return 'bg-yellow-500';
    return 'bg-blue-500';
  };

  const label = type === 'illustrated' ? 'Illustrated Stories' : 'Text Stories';

  // Get the appropriate limit text
  const limitText = isFreeTierIllustrated ? 'total' : 'monthly limit';

  return (
    <div className={className}>
      {showLabel && (
        <div className="flex justify-between items-center mb-2">
          <span className="text-sm font-medium text-gray-700">{label}</span>
          <span className="text-sm text-gray-600">
            {isUnlimited ? (
              <span className="text-green-600 font-semibold">Unlimited</span>
            ) : (
              <>
                <span className={percentage >= 80 ? 'text-yellow-600 font-semibold' : ''}>
                  {usedCount}
                </span>
                <span className="text-gray-400"> / {limit} {limitText}</span>
              </>
            )}
          </span>
        </div>
      )}

      {!isUnlimited && (
        <div className="w-full bg-gray-200 rounded-full h-2 overflow-hidden">
          <div
            className={`h-full transition-all duration-300 ${getColor()}`}
            style={{ width: `${percentage}%` }}
          />
        </div>
      )}

      {/* Warning for approaching limit */}
      {!isUnlimited && remaining !== null && remaining <= 2 && remaining > 0 && (
        <div className="mt-1">
          <p className="text-xs text-yellow-600">
            {isFreeTierIllustrated
              ? `Only ${remaining} free illustrated ${remaining === 1 ? 'story' : 'stories'} remaining`
              : `Only ${remaining} ${remaining === 1 ? 'story' : 'stories'} remaining this month`
            }
          </p>
          {isFreeTierIllustrated && (
            <Link
              href="/pricing"
              className="text-xs text-primary-600 hover:text-primary-700 underline"
            >
              Upgrade for 20 illustrated stories/month
            </Link>
          )}
        </div>
      )}

      {/* Limit reached message */}
      {!isUnlimited && remaining === 0 && (
        <div className="mt-1">
          <p className="text-xs text-red-600 font-medium">
            {isFreeTierIllustrated
              ? 'All free illustrated stories used'
              : 'Monthly limit reached'
            }
          </p>
          {isFreeTierIllustrated && (
            <Link
              href="/pricing"
              className="text-xs text-primary-600 hover:text-primary-700 underline font-medium"
            >
              Upgrade to Starlight for 20/month
            </Link>
          )}
        </div>
      )}
    </div>
  );
}