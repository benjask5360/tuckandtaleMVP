'use client'

import { useState, useEffect, Suspense } from 'react'
import { useRouter, useSearchParams } from 'next/navigation'
import Image from 'next/image'
import Link from 'next/link'
import { Check, Sparkles, Shield, Clock, ArrowRight, Loader2 } from 'lucide-react'
import { createClient } from '@/lib/supabase/client'
import { DISPLAY_PRICES } from '@/lib/config/pricing-config'

function OnboardingPricingContent() {
  const router = useRouter()
  const searchParams = useSearchParams()
  const [processingCheckout, setProcessingCheckout] = useState(false)
  const [error, setError] = useState<string | null>(null)
  const canceled = searchParams.get('canceled')

  // Check if user is authenticated
  useEffect(() => {
    const checkAuth = async () => {
      const supabase = createClient()
      const { data: { user } } = await supabase.auth.getUser()
      if (!user) {
        router.push('/auth/login')
      }
    }
    checkAuth()
  }, [router])

  const handleStartTrial = async () => {
    try {
      setProcessingCheckout(true)
      setError(null)

      const response = await fetch('/api/stripe/create-trial-checkout', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
      })

      if (!response.ok) {
        const data = await response.json()
        throw new Error(data.error || 'Failed to create checkout session')
      }

      const { url } = await response.json()
      if (url) {
        window.location.href = url
      }
    } catch (err: any) {
      console.error('Checkout error:', err)
      setError(err.message || 'Something went wrong. Please try again.')
      setProcessingCheckout(false)
    }
  }

  return (
    <div className="min-h-screen bg-gray-50 flex flex-col">
      {/* Header - centered like auth pages */}
      <header className="pt-8 md:pt-12 px-4">
        <Link href="/" className="flex items-center justify-center gap-2 sm:gap-2.5 hover:opacity-80 transition-opacity min-h-[44px]">
          <div className="w-[60px] h-[60px] sm:w-[75px] sm:h-[75px] relative flex-shrink-0">
            <Image
              src="/images/logo.png"
              alt="Tuck and Tale Logo"
              width={75}
              height={75}
              className="object-contain"
              priority
            />
          </div>
          <div className="flex items-start gap-0.5">
            <span className="gradient-text whitespace-nowrap font-display" style={{ fontWeight: 800, fontSize: 'clamp(1.5rem, 4.5vw, 2.5rem)' }}>
              Tuck and Tale
            </span>
            <span className="gradient-text font-display" style={{ fontWeight: 800, fontSize: 'clamp(1.125rem, 3.5vw, 1.875rem)' }}>™</span>
          </div>
        </Link>
      </header>

      {/* Main Content */}
      <main className="flex-1 flex items-center justify-center px-4 py-8">
        <div className="max-w-lg w-full">
          {/* Card */}
          <div className="bg-white rounded-3xl shadow-xl p-8 md:p-10">
            {/* Canceled message */}
            {canceled && (
              <div className="mb-6 p-4 bg-amber-50 border border-amber-200 rounded-xl text-amber-800 text-sm">
                No worries! You can start your free trial anytime.
              </div>
            )}

            {/* Headline */}
            <div className="text-center mb-8">
              <div className="inline-flex items-center justify-center w-16 h-16 bg-gradient-primary rounded-2xl mb-4">
                <Sparkles className="w-8 h-8 text-white" />
              </div>
              <h1 className="font-display font-bold text-3xl md:text-4xl text-gray-900 mb-2">
                Start Your Free Trial
              </h1>
              <p className="text-gray-600">
                Start creating magical stories for your child
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
                <span className="text-gray-700">Unlimited access to Fun + Growth stories</span>
              </div>
              <div className="flex items-start gap-3">
                <div className="flex-shrink-0 w-6 h-6 bg-green-100 rounded-full flex items-center justify-center">
                  <Check className="w-4 h-4 text-green-600" />
                </div>
                <span className="text-gray-700">Full illustrations on every story</span>
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

            {/* Error message */}
            {error && (
              <div className="mb-4 p-4 bg-red-50 border border-red-200 rounded-xl text-red-700 text-sm">
                {error}
              </div>
            )}

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
                <>
                  Start Your Free Trial
                  <ArrowRight className="w-5 h-5" />
                </>
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
      </main>
    </div>
  )
}

// Loading fallback component
function LoadingFallback() {
  return (
    <div className="min-h-screen bg-gray-50 flex items-center justify-center">
      <Loader2 className="w-8 h-8 text-primary-600 animate-spin" />
    </div>
  )
}

// Main export with Suspense boundary
export default function OnboardingPricing() {
  return (
    <Suspense fallback={<LoadingFallback />}>
      <OnboardingPricingContent />
    </Suspense>
  )
}
