'use client'

import { useState } from 'react'
import { useRouter } from 'next/navigation'
import Link from 'next/link'
import { Sparkles, BookOpen, Check, ArrowLeft } from 'lucide-react'
import { PRICING_CONFIG } from '@/lib/config/pricing-config'

interface PreGenerationPaywallProps {
  storyNumber: number
  generationCredits?: number
}

/**
 * Pre-generation paywall component for story #3+
 * Shown on /dashboard/stories/create when user must pay before generating
 */
export default function PreGenerationPaywall({
  storyNumber,
  generationCredits = 0,
}: PreGenerationPaywallProps) {
  const router = useRouter()
  const [processingCheckout, setProcessingCheckout] = useState<'single' | 'subscription' | null>(null)

  const handleSingleStoryPurchase = async () => {
    try {
      setProcessingCheckout('single')

      const response = await fetch('/api/stripe/create-story-checkout', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({}), // No storyId = generation credit
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
    <div className="min-h-screen bg-gray-50 py-12 px-4">
      <div className="max-w-4xl mx-auto">
        {/* Back Link */}
        <Link
          href="/dashboard"
          className="inline-flex items-center gap-2 text-gray-600 hover:text-gray-900 transition-colors mb-8"
        >
          <ArrowLeft className="w-4 h-4" />
          Back to Dashboard
        </Link>

        {/* Header */}
        <div className="text-center mb-12">
          <div className="inline-flex items-center justify-center w-16 h-16 bg-primary-100 rounded-full mb-6">
            <Sparkles className="w-8 h-8 text-primary-600" />
          </div>
          <h1 className="font-display font-bold text-3xl md:text-4xl text-gray-900 mb-4">
            Ready to Create Your Next Story?
          </h1>
          <p className="text-lg text-gray-600 max-w-2xl mx-auto">
            Choose how you&apos;d like to continue your storytelling journey.
          </p>
        </div>

        {/* Pricing Cards */}
        <div className="grid md:grid-cols-2 gap-6 max-w-3xl mx-auto">
          {/* Single Story Card */}
          <div className="bg-white rounded-2xl border-2 border-gray-200 p-6 md:p-8 hover:border-primary-200 transition-colors">
            <div className="flex items-center gap-3 mb-4">
              <div className="w-10 h-10 bg-gray-100 rounded-full flex items-center justify-center">
                <BookOpen className="w-5 h-5 text-gray-600" />
              </div>
              <h2 className="font-display font-bold text-xl text-gray-900">
                Single Story
              </h2>
            </div>

            <div className="mb-6">
              <span className="text-4xl font-bold text-gray-900">
                ${(PRICING_CONFIG.SINGLE_STORY_PRICE_CENTS / 100).toFixed(2)}
              </span>
              <span className="text-gray-500 ml-1">one-time</span>
            </div>

            <ul className="space-y-3 mb-8">
              <li className="flex items-start gap-3">
                <Check className="w-5 h-5 text-green-600 flex-shrink-0 mt-0.5" />
                <span className="text-gray-700">Generate one complete story</span>
              </li>
              <li className="flex items-start gap-3">
                <Check className="w-5 h-5 text-green-600 flex-shrink-0 mt-0.5" />
                <span className="text-gray-700">Beautiful custom illustrations</span>
              </li>
              <li className="flex items-start gap-3">
                <Check className="w-5 h-5 text-green-600 flex-shrink-0 mt-0.5" />
                <span className="text-gray-700">Keep forever in your library</span>
              </li>
            </ul>

            <button
              onClick={handleSingleStoryPurchase}
              disabled={processingCheckout !== null}
              className="w-full py-4 px-6 bg-gray-900 text-white rounded-xl font-semibold hover:bg-gray-800 transition-colors disabled:opacity-50 disabled:cursor-not-allowed flex items-center justify-center gap-2"
            >
              {processingCheckout === 'single' ? (
                <>
                  <div className="animate-spin rounded-full h-5 w-5 border-b-2 border-white" />
                  Processing...
                </>
              ) : (
                <>Buy One Story</>
              )}
            </button>
          </div>

          {/* Subscription Card */}
          <div className="bg-white rounded-2xl border-2 border-primary-400 p-6 md:p-8 relative overflow-hidden">
            {/* Best Value Badge */}
            <div className="absolute top-4 right-4 bg-gradient-primary text-white text-xs font-bold px-3 py-1 rounded-full">
              Best Value
            </div>

            <div className="flex items-center gap-3 mb-4">
              <div className="w-10 h-10 bg-primary-100 rounded-full flex items-center justify-center">
                <Sparkles className="w-5 h-5 text-primary-600" />
              </div>
              <h2 className="font-display font-bold text-xl text-gray-900">
                Stories Plus
              </h2>
            </div>

            <div className="mb-6">
              <span className="text-4xl font-bold text-gray-900">
                ${(PRICING_CONFIG.SUBSCRIPTION_PRICE_CENTS / 100).toFixed(2)}
              </span>
              <span className="text-gray-500 ml-1">/month</span>
            </div>

            <ul className="space-y-3 mb-8">
              <li className="flex items-start gap-3">
                <Check className="w-5 h-5 text-green-600 flex-shrink-0 mt-0.5" />
                <span className="text-gray-700">
                  <strong>{PRICING_CONFIG.SUBSCRIPTION_MONTHLY_LIMIT} stories</strong> per month
                </span>
              </li>
              <li className="flex items-start gap-3">
                <Check className="w-5 h-5 text-green-600 flex-shrink-0 mt-0.5" />
                <span className="text-gray-700">Full illustrations on every story</span>
              </li>
              <li className="flex items-start gap-3">
                <Check className="w-5 h-5 text-green-600 flex-shrink-0 mt-0.5" />
                <span className="text-gray-700">All genres and writing styles</span>
              </li>
              <li className="flex items-start gap-3">
                <Check className="w-5 h-5 text-green-600 flex-shrink-0 mt-0.5" />
                <span className="text-gray-700">Growth stories and life lessons</span>
              </li>
              <li className="flex items-start gap-3">
                <Check className="w-5 h-5 text-green-600 flex-shrink-0 mt-0.5" />
                <span className="text-gray-700">Priority support</span>
              </li>
            </ul>

            <button
              onClick={handleSubscription}
              disabled={processingCheckout !== null}
              className="w-full py-4 px-6 bg-gradient-primary text-white rounded-xl font-semibold hover:opacity-90 transition-all disabled:opacity-50 disabled:cursor-not-allowed flex items-center justify-center gap-2"
            >
              {processingCheckout === 'subscription' ? (
                <>
                  <div className="animate-spin rounded-full h-5 w-5 border-b-2 border-white" />
                  Processing...
                </>
              ) : (
                <>Subscribe Now</>
              )}
            </button>
          </div>
        </div>

        {/* Credits Info */}
        {generationCredits > 0 && (
          <div className="mt-8 text-center">
            <p className="text-gray-600">
              You have <strong>{generationCredits}</strong> story {generationCredits === 1 ? 'credit' : 'credits'} available.
            </p>
          </div>
        )}

        {/* Trust Indicators */}
        <div className="mt-12 text-center">
          <div className="flex flex-wrap justify-center gap-6 text-sm text-gray-500">
            <span>Secure payments via Stripe</span>
            <span>Cancel subscription anytime</span>
            <span>No hidden fees</span>
          </div>
        </div>
      </div>
    </div>
  )
}
