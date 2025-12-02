'use client'

import { useState } from 'react'
import { Sparkles, BookOpen, Check, Lock } from 'lucide-react'
import { PRICING_CONFIG } from '@/lib/config/pricing-config'

interface StoryPaywallProps {
  storyId: string
  storyTitle?: string
}

/**
 * Post-generation paywall component for story #2
 * Shows as an overlay after paragraph 3, blurring remaining content
 */
export default function StoryPaywall({ storyId, storyTitle }: StoryPaywallProps) {
  const [processingCheckout, setProcessingCheckout] = useState<'single' | 'subscription' | null>(null)

  const handleSingleStoryPurchase = async () => {
    try {
      setProcessingCheckout('single')

      const response = await fetch('/api/stripe/create-story-checkout', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ storyId }), // Unlock this specific story
      })

      if (!response.ok) {
        const error = await response.json()
        throw new Error(error.error || 'Failed to create checkout')
      }

      const { url } = await response.json()
      if (url) {
        window.location.href = url
      }
    } catch (error: any) {
      console.error('Checkout error:', error)
      alert(error.message || 'Failed to start checkout. Please try again.')
      setProcessingCheckout(null)
    }
  }

  const handleSubscription = async () => {
    try {
      setProcessingCheckout('subscription')

      const response = await fetch('/api/stripe/create-checkout', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          tierId: PRICING_CONFIG.TIER_STORIES_PLUS,
          billingPeriod: 'monthly',
        }),
      })

      if (!response.ok) {
        const error = await response.json()
        throw new Error(error.error || 'Failed to create checkout')
      }

      const { url } = await response.json()
      if (url) {
        window.location.href = url
      }
    } catch (error: any) {
      console.error('Checkout error:', error)
      alert(error.message || 'Failed to start checkout. Please try again.')
      setProcessingCheckout(null)
    }
  }

  return (
    <div className="relative my-8">
      {/* Blur overlay placeholder for remaining content */}
      <div className="h-64 bg-gradient-to-b from-transparent via-white/80 to-white relative overflow-hidden">
        {/* Fake blurred content lines */}
        <div className="space-y-4 p-6 filter blur-sm opacity-50">
          <div className="h-4 bg-gray-200 rounded w-full" />
          <div className="h-4 bg-gray-200 rounded w-11/12" />
          <div className="h-4 bg-gray-200 rounded w-full" />
          <div className="h-4 bg-gray-200 rounded w-10/12" />
          <div className="h-4 bg-gray-200 rounded w-full" />
          <div className="h-4 bg-gray-200 rounded w-9/12" />
        </div>
      </div>

      {/* Paywall Card */}
      <div className="bg-white rounded-2xl border-2 border-gray-200 shadow-xl p-6 md:p-8 max-w-2xl mx-auto -mt-32 relative z-10">
        <div className="text-center mb-6">
          <div className="inline-flex items-center justify-center w-14 h-14 bg-primary-100 rounded-full mb-4">
            <Lock className="w-7 h-7 text-primary-600" />
          </div>
          <h2 className="font-display font-bold text-2xl md:text-3xl text-gray-900 mb-2">
            Continue Reading?
          </h2>
          <p className="text-gray-600">
            Unlock the rest of {storyTitle ? `"${storyTitle}"` : 'this story'} to see how it ends!
          </p>
        </div>

        {/* Pricing Options */}
        <div className="grid md:grid-cols-2 gap-4 mb-6">
          {/* Single Story Option */}
          <div className="bg-gray-50 rounded-xl p-4 border border-gray-200">
            <div className="flex items-center gap-2 mb-2">
              <BookOpen className="w-5 h-5 text-gray-600" />
              <span className="font-semibold text-gray-900">Unlock This Story</span>
            </div>
            <div className="mb-3">
              <span className="text-2xl font-bold text-gray-900">
                ${(PRICING_CONFIG.SINGLE_STORY_PRICE_CENTS / 100).toFixed(2)}
              </span>
              <span className="text-gray-500 text-sm ml-1">one-time</span>
            </div>
            <ul className="space-y-1 mb-4 text-sm text-gray-600">
              <li className="flex items-center gap-2">
                <Check className="w-4 h-4 text-green-600" />
                Full story access
              </li>
              <li className="flex items-center gap-2">
                <Check className="w-4 h-4 text-green-600" />
                Keep forever
              </li>
            </ul>
            <button
              onClick={handleSingleStoryPurchase}
              disabled={processingCheckout !== null}
              className="w-full py-3 px-4 bg-gray-900 text-white rounded-xl font-semibold text-sm hover:bg-gray-800 transition-colors disabled:opacity-50 disabled:cursor-not-allowed flex items-center justify-center gap-2"
            >
              {processingCheckout === 'single' ? (
                <>
                  <div className="animate-spin rounded-full h-4 w-4 border-b-2 border-white" />
                  Processing...
                </>
              ) : (
                <>Unlock Story</>
              )}
            </button>
          </div>

          {/* Subscription Option */}
          <div className="bg-gradient-to-br from-primary-50 to-sky-50 rounded-xl p-4 border-2 border-primary-300 relative">
            <div className="absolute -top-2 -right-2 bg-gradient-primary text-white text-xs font-bold px-2 py-0.5 rounded-full">
              Best Value
            </div>
            <div className="flex items-center gap-2 mb-2">
              <Sparkles className="w-5 h-5 text-primary-600" />
              <span className="font-semibold text-gray-900">Stories Plus</span>
            </div>
            <div className="mb-3">
              <span className="text-2xl font-bold text-gray-900">
                ${(PRICING_CONFIG.SUBSCRIPTION_PRICE_CENTS / 100).toFixed(2)}
              </span>
              <span className="text-gray-500 text-sm ml-1">/month</span>
            </div>
            <ul className="space-y-1 mb-4 text-sm text-gray-600">
              <li className="flex items-center gap-2">
                <Check className="w-4 h-4 text-green-600" />
                {PRICING_CONFIG.SUBSCRIPTION_MONTHLY_LIMIT} stories/month
              </li>
              <li className="flex items-center gap-2">
                <Check className="w-4 h-4 text-green-600" />
                All features included
              </li>
            </ul>
            <button
              onClick={handleSubscription}
              disabled={processingCheckout !== null}
              className="w-full py-3 px-4 bg-gradient-primary text-white rounded-xl font-semibold text-sm hover:opacity-90 transition-all disabled:opacity-50 disabled:cursor-not-allowed flex items-center justify-center gap-2"
            >
              {processingCheckout === 'subscription' ? (
                <>
                  <div className="animate-spin rounded-full h-4 w-4 border-b-2 border-white" />
                  Processing...
                </>
              ) : (
                <>Subscribe & Unlock</>
              )}
            </button>
          </div>
        </div>

        <p className="text-center text-xs text-gray-500">
          Secure payments via Stripe. Cancel anytime.
        </p>
      </div>
    </div>
  )
}
