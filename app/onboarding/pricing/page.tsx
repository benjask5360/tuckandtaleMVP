'use client'

import { useState, useEffect, Suspense, useRef } from 'react'
import { useRouter, useSearchParams } from 'next/navigation'
import Image from 'next/image'
import { Check, Sparkles, Shield, Clock, ArrowRight, Loader2 } from 'lucide-react'
import { createClient } from '@/lib/supabase/client'
import { DISPLAY_PRICES } from '@/lib/config/pricing-config'

interface Character {
  id: string
  name: string
  avatar_url: string | null
}

function OnboardingPricingContent() {
  const router = useRouter()
  const searchParams = useSearchParams()
  const [processingCheckout, setProcessingCheckout] = useState(false)
  const [error, setError] = useState<string | null>(null)
  const [characters, setCharacters] = useState<Character[]>([])
  const [loadingCharacters, setLoadingCharacters] = useState(true)
  const canceled = searchParams.get('canceled')
  const completeRegistrationFired = useRef(false)

  // Fire CompleteRegistration pixel when user lands on pricing page (finished onboarding)
  useEffect(() => {
    if (!completeRegistrationFired.current) {
      completeRegistrationFired.current = true
      if (typeof window !== 'undefined' && window.fbq) {
        window.fbq('track', 'CompleteRegistration')
      }
    }
  }, [])

  // Check if user is authenticated and fetch characters
  useEffect(() => {
    const initPage = async () => {
      const supabase = createClient()
      const { data: { user } } = await supabase.auth.getUser()
      if (!user) {
        router.push('/auth/login')
        return
      }

      // Fetch user's characters with their avatars
      const { data: chars, error: charsError } = await supabase
        .from('character_profiles')
        .select(`
          id,
          name,
          avatar_cache:avatar_cache_id (
            image_url
          )
        `)
        .eq('user_id', user.id)
        .is('deleted_at', null)
        .order('created_at', { ascending: true })

      if (chars && chars.length > 0) {
        setCharacters(chars.map((c: any) => ({
          id: c.id,
          name: c.name,
          avatar_url: c.avatar_cache?.image_url || null
        })))
      }
      setLoadingCharacters(false)
    }
    initPage()
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

  // Build the subtext with character names
  const getSubtext = () => {
    if (loadingCharacters || characters.length === 0) {
      return 'Start creating magical stories for your child'
    }
    const names = characters.map(c => c.name)
    if (names.length === 1) {
      return `${names[0]} is ready for their first adventure!`
    }
    if (names.length === 2) {
      return `${names[0]} and ${names[1]} are ready for their first adventure!`
    }
    const lastIndex = names.length - 1
    return `${names.slice(0, lastIndex).join(', ')}, and ${names[lastIndex]} are ready for their first adventure!`
  }

  return (
    <div className="min-h-screen bg-white flex flex-col">
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
                {getSubtext()}
              </p>

              {/* Character Avatars */}
              {!loadingCharacters && characters.length > 0 && (
                <div className="flex flex-wrap justify-center gap-6 mt-6">
                  {characters.map((char) => (
                    <div key={char.id} className="flex flex-col items-center w-28">
                      <div className="w-24 h-24 sm:w-28 sm:h-28 rounded-2xl overflow-hidden border-2 border-primary-200 bg-white shadow-md">
                        {char.avatar_url ? (
                          <Image
                            src={char.avatar_url}
                            alt={char.name}
                            width={112}
                            height={112}
                            className="w-full h-full object-contain"
                          />
                        ) : (
                          <div className="w-full h-full flex items-center justify-center text-4xl bg-gradient-to-br from-primary-100 to-sky-100">
                            {char.name.charAt(0).toUpperCase()}
                          </div>
                        )}
                      </div>
                      <span className="text-sm text-gray-600 mt-2 font-medium truncate w-full text-center">{char.name}</span>
                    </div>
                  ))}
                </div>
              )}
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
                <span className="text-gray-700">Up to <strong>30 personalized stories</strong> per month</span>
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
    <div className="min-h-screen bg-white flex items-center justify-center">
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
