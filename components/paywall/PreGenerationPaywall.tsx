'use client'

import { useState } from 'react'
import Link from 'next/link'
import { Sparkles, Check, ArrowLeft, Shield, Clock } from 'lucide-react'
import { PRICING_CONFIG, DISPLAY_PRICES } from '@/lib/config/pricing-config'

interface PreGenerationPaywallProps {
  storyNumber?: number
  generationCredits?: number
}

/**
 * Pre-generation paywall component
 * Shown when user without active trial/subscription tries to create a story
 */
export default function PreGenerationPaywall({
  storyNumber: _storyNumber,
  generationCredits: _generationCredits,
}: PreGenerationPaywallProps) {
  const [processingCheckout, setProcessingCheckout] = useState(false)

  const handleStartTrial = async () => {
    try {
      setProcessingCheckout(true)

      const response = await fetch('/api/stripe/create-trial-checkout', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
      })

      if (!response.ok) {
        const error = await response.json()
        throw new Error(error.error || 'Failed to create checkout')
      }

      const { url } = await response.json()
      if (url) {
        window.location.href = url
      }
    } catch (error: unknown) {
      console.error('Checkout error:', error)
      const message = error instanceof Error ? error.message : 'Failed to start checkout. Please try again.'
      alert(message)
      setProcessingCheckout(false)
    }
  }

  return (
    <div className="min-h-screen bg-gray-50 py-12 px-4">
      <div className="max-w-lg mx-auto">
        {/* Back Link */}
        <Link
          href="/dashboard"
          className="inline-flex items-center gap-2 text-gray-600 hover:text-gray-900 transition-colors mb-8"
        >
          <ArrowLeft className="w-4 h-4" />
          Back to Dashboard
        </Link>

        {/* Main Card */}
        <div className="bg-white rounded-3xl shadow-xl p-8 md:p-10">
          {/* Header */}
          <div className="text-center mb-8">
            <div className="inline-flex items-center justify-center w-16 h-16 bg-gradient-primary rounded-2xl mb-4">
              <Sparkles className="w-8 h-8 text-white" />
            </div>
            <h1 className="font-display font-bold text-3xl md:text-4xl text-gray-900 mb-2">
              Start Your Free Trial
            </h1>
            <p className="text-gray-600">
              Create personalized stories for your child
            </p>
          </div>

          {/* Pricing */}
          <div className="text-center mb-6">
            <div className="flex items-center justify-center gap-2 mb-1">
              <span className="text-gray-400 line-through text-lg">
                {DISPLAY_PRICES.ORIGINAL_MONTHLY}
              </span>
              <span className="bg-gradient-primary text-white text-xs font-bold px-2 py-1 rounded-full">
                Limited Time
              </span>
            </div>
            <div className="flex items-baseline justify-center gap-1">
              <span className="font-display font-bold text-5xl text-gray-900">
                {DISPLAY_PRICES.SUBSCRIPTION_MONTHLY}
              </span>
              <span className="text-gray-500">/month</span>
            </div>
            <p className="text-primary-600 font-semibold mt-2">
              {DISPLAY_PRICES.TRIAL_PERIOD}, then billed monthly
            </p>
          </div>

          {/* Benefits */}
          <div className="space-y-3 mb-8">
            <div className="flex items-start gap-3">
              <div className="flex-shrink-0 w-6 h-6 bg-green-100 rounded-full flex items-center justify-center">
                <Check className="w-4 h-4 text-green-600" />
              </div>
              <span className="text-gray-700">Up to <strong>{PRICING_CONFIG.SUBSCRIPTION_MONTHLY_LIMIT} personalized stories</strong> per month</span>
            </div>
            <div className="flex items-start gap-3">
              <div className="flex-shrink-0 w-6 h-6 bg-green-100 rounded-full flex items-center justify-center">
                <Check className="w-4 h-4 text-green-600" />
              </div>
              <span className="text-gray-700">Beautiful personalized illustrations</span>
            </div>
            <div className="flex items-start gap-3">
              <div className="flex-shrink-0 w-6 h-6 bg-green-100 rounded-full flex items-center justify-center">
                <Check className="w-4 h-4 text-green-600" />
              </div>
              <span className="text-gray-700">Growth stories & life lessons</span>
            </div>
            <div className="flex items-start gap-3">
              <div className="flex-shrink-0 w-6 h-6 bg-green-100 rounded-full flex items-center justify-center">
                <Check className="w-4 h-4 text-green-600" />
              </div>
              <span className="text-gray-700">Cancel anytime before day 7, pay nothing</span>
            </div>
            <div className="flex items-start gap-3">
              <div className="flex-shrink-0 w-6 h-6 bg-green-100 rounded-full flex items-center justify-center">
                <Check className="w-4 h-4 text-green-600" />
              </div>
              <span className="text-gray-700">30-day satisfaction guarantee</span>
            </div>
          </div>

          {/* CTA Button */}
          <button
            onClick={handleStartTrial}
            disabled={processingCheckout}
            className="w-full bg-gradient-primary text-white font-bold text-lg py-4 px-6 rounded-xl hover:opacity-90 transition-all shadow-lg hover:shadow-xl disabled:opacity-50 disabled:cursor-not-allowed flex items-center justify-center gap-2"
          >
            {processingCheckout ? (
              <>
                <div className="w-5 h-5 border-2 border-white border-t-transparent rounded-full animate-spin" />
                Processing...
              </>
            ) : (
              <>Start Your Free Trial</>
            )}
          </button>

          {/* Trust indicators */}
          <div className="flex items-center justify-center gap-4 mt-4 text-xs text-gray-500">
            <div className="flex items-center gap-1">
              <Shield className="w-4 h-4" />
              <span>Secure checkout</span>
            </div>
            <div className="flex items-center gap-1">
              <Clock className="w-4 h-4" />
              <span>Cancel anytime</span>
            </div>
          </div>
        </div>
      </div>
    </div>
  )
}
