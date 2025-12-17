'use client'

import { useState, useEffect, Suspense, useRef } from 'react'
import { createClient } from '@/lib/supabase/client'
import { useRouter, useSearchParams } from 'next/navigation'
import Link from 'next/link'
import { ArrowLeft, Sparkles, Loader2 } from 'lucide-react'
import StoryGenerationForm from '@/components/forms/StoryGenerationForm'
import PreGenerationPaywall from '@/components/paywall/PreGenerationPaywall'
import StoryUsageCounter from '@/components/subscription/StoryUsageCounter'

interface CharacterProfile {
  id: string
  name: string
  character_type: string
  avatar_cache?: {
    image_url: string
  }
}

interface PaywallStatus {
  requiresPaywall: boolean
  storyNumber: number
  hasCredits: boolean
  hasSubscription: boolean
  freeTrialAvailable: boolean
  canGenerate: boolean
  reason?: string
  hasActiveSubscription: boolean
  storiesUsedThisMonth: number
  storiesRemaining: number
  monthlyLimit: number
  daysUntilReset: number | null
  generationCredits: number
}

function CreateStoryContent() {
  const router = useRouter()
  const searchParams = useSearchParams()
  const supabase = createClient()
  const [loading, setLoading] = useState(true)
  const [error, setError] = useState<string | null>(null)
  const [childProfiles, setChildProfiles] = useState<CharacterProfile[]>([])
  const [paywallStatus, setPaywallStatus] = useState<PaywallStatus | null>(null)

  // Check if user just purchased a credit
  const justPurchasedCredit = searchParams.get('credit') === 'purchased'

  // Track if Purchase pixel has been fired to prevent duplicates
  const purchasePixelFired = useRef(false)

  // Fire Meta Pixel Purchase event when credit is purchased
  useEffect(() => {
    if (justPurchasedCredit && !purchasePixelFired.current) {
      purchasePixelFired.current = true
      if (typeof window !== 'undefined' && window.fbq) {
        window.fbq('track', 'Purchase', { currency: 'USD', value: 4.99 })
      }
    }
  }, [justPurchasedCredit])

  useEffect(() => {
    loadData()
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [])

  const loadData = async () => {
    try {
      const { data: { user } } = await supabase.auth.getUser()
      if (!user) {
        router.push('/auth/login')
        return
      }

      // Load paywall status and child profiles in parallel
      const [paywallResponse, profilesResult] = await Promise.all([
        fetch('/api/paywall/check-generation'),
        supabase
          .from('character_profiles')
          .select(`
            id,
            name,
            character_type,
            avatar_cache:avatar_cache_id (
              image_url
            )
          `)
          .eq('user_id', user.id)
          .is('deleted_at', null)
          .order('created_at', { ascending: false })
      ])

      // Handle paywall status
      if (paywallResponse.ok) {
        const paywallData = await paywallResponse.json()
        setPaywallStatus(paywallData)
      }

      // Handle character profiles
      if (profilesResult.error) throw profilesResult.error

      // Transform the data to handle avatar_cache being an array from the join
      const transformedData = profilesResult.data?.map(profile => ({
        ...profile,
        avatar_cache: Array.isArray(profile.avatar_cache)
          ? profile.avatar_cache[0]
          : profile.avatar_cache
      })) || []

      // Check if user has at least one child character (required for hero)
      const hasChildren = transformedData && transformedData.some(profile => profile.character_type === 'child')

      if (!hasChildren) {
        setError('no-children')
      } else {
        setChildProfiles(transformedData)
      }
    } catch (err: any) {
      console.error('Error loading data:', err)
      setError(err.message)
    } finally {
      setLoading(false)
    }
  }

  if (loading) {
    return (
      <div className="min-h-screen bg-gray-50 flex items-center justify-center p-4">
        <div className="text-center">
          <Loader2 className="w-8 h-8 animate-spin text-primary-600 mx-auto mb-4" />
          <p className="text-gray-600">Loading...</p>
        </div>
      </div>
    )
  }

  if (error === 'no-children') {
    return (
      <div className="min-h-screen bg-gray-50">
        <div className="max-w-3xl mx-auto px-4 sm:px-6 py-4 md:py-6">
          <Link
            href="/dashboard/story-library"
            className="inline-flex items-center gap-2 text-primary-600 active:text-primary-700 md:hover:text-primary-700 font-semibold mb-4 md:mb-6 min-h-[44px] transition-colors"
          >
            <ArrowLeft className="w-4 h-4 md:w-5 md:h-5" />
            Back to Story Library
          </Link>

          <div className="card p-6 md:p-8 text-center">
            <Sparkles className="w-12 h-12 text-gray-400 mx-auto mb-4" />
            <h1 className="text-2xl font-display font-bold text-gray-900 mb-2">
              Create a Child Profile First
            </h1>
            <p className="text-gray-600 mb-6">
              You need to create at least one child profile before generating stories.
            </p>
            <Link
              href="/dashboard/my-children/create"
              className="btn-primary inline-flex items-center gap-2"
            >
              <Sparkles className="w-4 h-4" />
              Create Child Profile
            </Link>
          </div>
        </div>
      </div>
    )
  }

  if (error) {
    return (
      <div className="min-h-screen bg-gray-50 flex items-center justify-center p-4">
        <div className="card p-6 md:p-8 max-w-md text-center">
          <p className="text-red-600 font-medium">Error: {error}</p>
          <button
            onClick={() => router.back()}
            className="btn-secondary mt-4"
          >
            Go Back
          </button>
        </div>
      </div>
    )
  }

  // Show pre-generation paywall for story #3+ (when user must pay before generating)
  if (paywallStatus?.requiresPaywall && !paywallStatus?.canGenerate) {
    return (
      <PreGenerationPaywall
        storyNumber={paywallStatus.storyNumber}
        generationCredits={paywallStatus.generationCredits}
      />
    )
  }

  // Show subscription limit reached message
  if (paywallStatus?.reason === 'subscription_limit_reached') {
    return (
      <div className="min-h-screen bg-gray-50 py-12 px-4">
        <div className="max-w-2xl mx-auto">
          <Link
            href="/dashboard"
            className="inline-flex items-center gap-2 text-gray-600 hover:text-gray-900 transition-colors mb-8"
          >
            <ArrowLeft className="w-4 h-4" />
            Back to Dashboard
          </Link>

          <div className="card p-8 text-center">
            <Sparkles className="w-12 h-12 text-amber-500 mx-auto mb-4" />
            <h1 className="text-2xl font-display font-bold text-gray-900 mb-2">
              Monthly Limit Reached
            </h1>
            <p className="text-gray-600 mb-4">
              You&apos;ve used all {paywallStatus.monthlyLimit ?? 30} stories this month.
              {paywallStatus.daysUntilReset !== null && paywallStatus.daysUntilReset !== undefined && (
                <> Your limit resets in {paywallStatus.daysUntilReset} day{paywallStatus.daysUntilReset !== 1 ? 's' : ''}.</>
              )}
            </p>
            <p className="text-sm text-gray-500 mb-6">
              Need more stories now? You can unlock individual stories for $4.99 each.
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
              className="btn-primary inline-flex items-center gap-2"
            >
              Buy One Story - $4.99
            </button>
          </div>
        </div>
      </div>
    )
  }

  return (
    <div className="min-h-screen bg-gray-50">
      <div className="max-w-3xl mx-auto px-4 sm:px-6 py-4 md:py-6">
        {/* Success message for credit purchase */}
        {justPurchasedCredit && (
          <div className="mb-4 p-4 bg-green-50 border border-green-200 rounded-xl text-green-700">
            Story credit added! You can now generate your next story.
          </div>
        )}

        {/* Header */}
        <div className="mb-4 md:mb-6">
          <Link
            href="/dashboard/story-library"
            className="inline-flex items-center gap-2 text-primary-600 active:text-primary-700 md:hover:text-primary-700 font-semibold mb-4 md:mb-6 min-h-[44px] transition-colors"
          >
            <ArrowLeft className="w-4 h-4 md:w-5 md:h-5" />
            Back to Story Library
          </Link>

          <div className="card p-6 md:p-8">
            <div className="flex items-start gap-3">
              <Sparkles className="w-8 h-8 text-primary-600 flex-shrink-0 mt-1" />
              <div className="flex-grow">
                <h1 className="text-2xl sm:text-3xl md:text-4xl font-display font-bold text-gray-900 mb-2">
                  Create a New Story
                </h1>
                <p className="text-base md:text-lg text-gray-600">
                  Generate a personalized story for your child
                </p>

                {/* Usage counter for subscribers */}
                {paywallStatus?.hasActiveSubscription && (
                  <div className="mt-4">
                    <StoryUsageCounter
                      storiesUsed={paywallStatus.storiesUsedThisMonth}
                      storiesLimit={paywallStatus.monthlyLimit}
                      daysUntilReset={paywallStatus.daysUntilReset}
                    />
                  </div>
                )}

                {/* Generation credits indicator */}
                {!paywallStatus?.hasActiveSubscription && (paywallStatus?.generationCredits ?? 0) > 0 && (
                  <div className="mt-4 p-3 bg-green-50 border border-green-200 rounded-lg">
                    <p className="text-sm text-green-700 font-medium">
                      {paywallStatus?.generationCredits} story {paywallStatus?.generationCredits === 1 ? 'credit' : 'credits'} available
                    </p>
                  </div>
                )}
              </div>
            </div>
          </div>
        </div>

        {/* Form */}
        <div className="card p-6 md:p-8">
          <StoryGenerationForm
            childProfiles={childProfiles}
            paywallStatus={paywallStatus || undefined}
          />
        </div>
      </div>
    </div>
  )
}

export default function CreateStoryPage() {
  return (
    <Suspense fallback={
      <div className="min-h-screen bg-gray-50 flex items-center justify-center p-4">
        <div className="text-center">
          <Loader2 className="w-8 h-8 animate-spin text-primary-600 mx-auto mb-4" />
          <p className="text-gray-600">Loading...</p>
        </div>
      </div>
    }>
      <CreateStoryContent />
    </Suspense>
  )
}
