'use client'

import { PRICING_CONFIG } from '@/lib/config/pricing-config'

interface StoryUsageCounterProps {
  storiesUsed: number
  storiesLimit: number
  daysUntilReset?: number | null
  variant?: 'default' | 'compact' | 'detailed'
  className?: string
}

/**
 * Displays story usage for Stories Plus subscribers
 * Shows "X of 30 stories used" with a progress bar
 */
export default function StoryUsageCounter({
  storiesUsed,
  storiesLimit,
  daysUntilReset,
  variant = 'default',
  className = '',
}: StoryUsageCounterProps) {
  const remaining = Math.max(0, storiesLimit - storiesUsed)
  const percentage = Math.min(100, (storiesUsed / storiesLimit) * 100)
  const isNearLimit = remaining <= 5
  const isAtLimit = remaining === 0

  if (variant === 'compact') {
    return (
      <div className={`text-sm ${className}`}>
        <span className={`font-medium ${isAtLimit ? 'text-red-600' : isNearLimit ? 'text-amber-600' : 'text-gray-700'}`}>
          {remaining} {remaining === 1 ? 'story' : 'stories'} left
        </span>
        {daysUntilReset !== null && daysUntilReset !== undefined && (
          <span className="text-gray-500 ml-1">
            · resets in {daysUntilReset} {daysUntilReset === 1 ? 'day' : 'days'}
          </span>
        )}
      </div>
    )
  }

  if (variant === 'detailed') {
    return (
      <div className={`bg-white rounded-xl border border-gray-200 p-4 ${className}`}>
        <div className="flex items-center justify-between mb-2">
          <span className="text-sm font-medium text-gray-700">Monthly Stories</span>
          <span className={`text-sm font-semibold ${isAtLimit ? 'text-red-600' : isNearLimit ? 'text-amber-600' : 'text-gray-900'}`}>
            {storiesUsed} / {storiesLimit}
          </span>
        </div>

        {/* Progress Bar */}
        <div className="h-2 bg-gray-100 rounded-full overflow-hidden mb-2">
          <div
            className={`h-full rounded-full transition-all duration-300 ${
              isAtLimit
                ? 'bg-red-500'
                : isNearLimit
                ? 'bg-amber-500'
                : 'bg-gradient-primary'
            }`}
            style={{ width: `${percentage}%` }}
          />
        </div>

        <div className="flex items-center justify-between text-xs text-gray-500">
          <span>
            {remaining} {remaining === 1 ? 'story' : 'stories'} remaining
          </span>
          {daysUntilReset !== null && daysUntilReset !== undefined && (
            <span>Resets in {daysUntilReset} {daysUntilReset === 1 ? 'day' : 'days'}</span>
          )}
        </div>

        {isAtLimit && (
          <p className="mt-3 text-sm text-red-600 bg-red-50 rounded-lg p-2">
            You&apos;ve used all your stories this month. You can still unlock individual stories for ${(PRICING_CONFIG.SINGLE_STORY_PRICE_CENTS / 100).toFixed(2)}.
          </p>
        )}
      </div>
    )
  }

  // Default variant
  return (
    <div className={`${className}`}>
      <div className="flex items-center justify-between mb-1.5">
        <span className="text-sm text-gray-600">
          {storiesUsed} of {storiesLimit} stories used
        </span>
        {daysUntilReset !== null && daysUntilReset !== undefined && (
          <span className="text-xs text-gray-500">
            Resets in {daysUntilReset} {daysUntilReset === 1 ? 'day' : 'days'}
          </span>
        )}
      </div>

      {/* Progress Bar */}
      <div className="h-1.5 bg-gray-100 rounded-full overflow-hidden">
        <div
          className={`h-full rounded-full transition-all duration-300 ${
            isAtLimit
              ? 'bg-red-500'
              : isNearLimit
              ? 'bg-amber-500'
              : 'bg-gradient-primary'
          }`}
          style={{ width: `${percentage}%` }}
        />
      </div>

      {isAtLimit && (
        <p className="mt-2 text-xs text-red-600">
          Monthly limit reached. Unlock individual stories for ${(PRICING_CONFIG.SINGLE_STORY_PRICE_CENTS / 100).toFixed(2)}.
        </p>
      )}
    </div>
  )
}
