'use client';

import { ReactNode } from 'react';
import { useSubscription } from '@/contexts/SubscriptionContext';
import { Lock } from 'lucide-react';
import Link from 'next/link';

interface FeatureGateProps {
  feature: string; // Feature key like 'allow_pets', 'allow_growth_stories', etc.
  children: ReactNode;
  fallback?: ReactNode;
  showLock?: boolean;
}

export default function FeatureGate({
  feature,
  children,
  fallback,
  showLock = true
}: FeatureGateProps) {
  const { canUseFeature, loading } = useSubscription();

  if (loading) {
    return (
      <div className="animate-pulse bg-gray-100 rounded-lg p-4">
        <div className="h-4 bg-gray-200 rounded w-3/4 mb-2"></div>
        <div className="h-4 bg-gray-200 rounded w-1/2"></div>
      </div>
    );
  }

  // Check if user has access to this feature
  // eslint-disable-next-line @typescript-eslint/no-explicit-any
  const hasAccess = canUseFeature(feature as any);

  if (hasAccess) {
    return <>{children}</>;
  }

  // If fallback is provided, use it
  if (fallback) {
    return <>{fallback}</>;
  }

  // Default locked state
  if (!showLock) {
    return null;
  }

  const getFeatureName = (key: string) => {
    const names: Record<string, string> = {
      allow_pets: 'Pet Characters',
      allow_magical_creatures: 'Magical Creatures',
      allow_growth_stories: 'Growth Stories',
      allow_growth_areas: 'Growth Topics',
      allow_genres: 'Genre Selection',
      allow_writing_styles: 'Writing Styles',
      allow_moral_lessons: 'Moral Lessons',
      allow_special_requests: 'Custom Instructions',
      allow_story_length: 'Story Length Options',
      allow_advanced_customization: 'Advanced Customization',
    };
    return names[key] || 'This Feature';
  };

  return (
    <div className="relative opacity-60 pointer-events-none select-none">
      <div className="absolute inset-0 bg-gray-100 bg-opacity-50 backdrop-blur-sm rounded-lg z-10 flex items-center justify-center">
        <div className="bg-white rounded-lg shadow-lg p-4 text-center">
          <div className="w-10 h-10 bg-purple-100 rounded-full flex items-center justify-center mx-auto mb-2">
            <Lock className="w-5 h-5 text-purple-600" />
          </div>
          <p className="text-sm font-semibold text-gray-900 mb-1">
            {getFeatureName(feature)}
          </p>
          <Link
            href="/pricing"
            className="text-xs text-purple-600 hover:text-purple-700 font-medium pointer-events-auto"
          >
            Upgrade to unlock
          </Link>
        </div>
      </div>
      <div className="blur-sm">{children}</div>
    </div>
  );
}