'use client'

import { useState, useEffect } from 'react'
import Link from 'next/link'
import Image from 'next/image'
import { Sparkles, Check, ArrowLeft, Shield, Clock } from 'lucide-react'
import { PRICING_CONFIG, DISPLAY_PRICES } from '@/lib/config/pricing-config'
import { createClient } from '@/lib/supabase/client'

interface Character {
  id: string
  name: string
  avatar_url?: string
}

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
  const [characters, setCharacters] = useState<Character[]>([])
  const [loadingCharacters, setLoadingCharacters] = useState(true)

  // Fetch characters on mount
  useEffect(() => {
    const fetchCharacters = async () => {
      try {
        const supabase = createClient()
        const { data: { user } } = await supabase.auth.getUser()
        if (!user) return

        const { data } = await supabase
          .from('character_profiles')
          .select(`
            id,
            name,
            avatar_cache:avatar_cache_id (
              image_url
            )
          `)
          .eq('user_id', user.id)
          .eq('character_type', 'child')
          .is('deleted_at', null)
          .order('is_primary', { ascending: false })
          .limit(5)

        if (data) {
          const transformedCharacters = data.map(char => ({
            id: char.id,
            name: char.name,
            avatar_url: Array.isArray(char.avatar_cache)
              ? char.avatar_cache[0]?.image_url
              : (char.avatar_cache as any)?.image_url
          }))
          setCharacters(transformedCharacters)
        }
      } catch (error) {
        console.error('Error fetching characters:', error)
      } finally {
        setLoadingCharacters(false)
      }
    }

    fetchCharacters()
  }, [])

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

          {/* Single story purchase option */}
          <div className="mt-6 pt-6 border-t border-gray-200 text-center">
            <p className="text-sm text-gray-500 mb-2">
              Just want one story?
            </p>
            <button
              onClick={async () => {
                const response = await fetch('/api/stripe/create-story-checkout', {
                  method: 'POST',
                  headers: { 'Content-Type': 'application/json' },
                  body: JSON.stringify({}),
                })
                if (response.ok) {
                  const { url } = await response.json()
                  if (url) window.location.href = url
                }
              }}
              className="text-primary-600 hover:text-primary-700 font-medium text-sm underline underline-offset-2"
            >
              Buy a single story for $4.99
            </button>
          </div>
        </div>
      </div>
    </div>
  )
}
