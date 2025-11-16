'use client';

import { useSubscription } from '@/contexts/SubscriptionContext';

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

  const stats = type === 'illustrated' ? usage.illustrated : usage.text;
  const limit = type === 'illustrated' ? tier.illustrated_limit_month : tier.text_limit_month;

  const isUnlimited = limit === null;
  const percentage = isUnlimited ? 0 : Math.min(100, (stats.used / limit) * 100);
  const remaining = isUnlimited ? null : Math.max(0, limit - stats.used);

  const getColor = () => {
    if (isUnlimited) return 'bg-green-500';
    if (percentage >= 100) return 'bg-red-500';
    if (percentage >= 80) return 'bg-yellow-500';
    return 'bg-blue-500';
  };

  const label = type === 'illustrated' ? 'Illustrated Stories' : 'Text Stories';

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
                  {stats.used}
                </span>
                <span className="text-gray-400"> / {limit}</span>
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

      {!isUnlimited && remaining !== null && remaining <= 2 && remaining > 0 && (
        <p className="text-xs text-yellow-600 mt-1">
          Only {remaining} {remaining === 1 ? 'story' : 'stories'} remaining this month
        </p>
      )}

      {!isUnlimited && remaining === 0 && (
        <p className="text-xs text-red-600 mt-1">
          Monthly limit reached
        </p>
      )}
    </div>
  );
}