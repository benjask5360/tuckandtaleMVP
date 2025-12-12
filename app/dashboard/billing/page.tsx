'use client'

import { useEffect, useState, Suspense } from 'react'
import { useRouter, useSearchParams } from 'next/navigation'
import { useSubscription } from '@/contexts/SubscriptionContext'
import StoryUsageCounter from '@/components/subscription/StoryUsageCounter'
import { PRICING_CONFIG } from '@/lib/config/pricing-config'
import {
  CreditCard,
  Calendar,
  AlertCircle,
  CheckCircle,
  ExternalLink,
  ArrowRight,
  Sparkles,
  BookOpen,
} from 'lucide-react'

function BillingPageContent() {
  const router = useRouter()
  const searchParams = useSearchParams()
  const {
    hasActiveSubscription,
    subscriptionTier,
    storiesUsedThisMonth,
    storiesRemaining,
    monthlyLimit,
    daysUntilReset,
    generationCredits,
    loading: subscriptionLoading,
  } = useSubscription()

  const [billingInfo, setBillingInfo] = useState<any>(null)
  const [loading, setLoading] = useState(true)
  const [processingPortal, setProcessingPortal] = useState(false)
  const [canceledCheckout, setCanceledCheckout] = useState(false)

  useEffect(() => {
    // Check if user canceled checkout
    if (searchParams.get('canceled') === 'true') {
      setCanceledCheckout(true)
      setTimeout(() => setCanceledCheckout(false), 5000)
    }

    loadBillingInfo()
  }, [searchParams])

  const loadBillingInfo = async () => {
    try {
      const response = await fetch('/api/stripe/billing-portal')
      if (response.ok) {
        const data = await response.json()
        setBillingInfo(data)
      }
    } catch (error) {
      console.error('Error loading billing info:', error)
    } finally {
      setLoading(false)
    }
  }

  const handleManageBilling = async () => {
    try {
      setProcessingPortal(true)

      const response = await fetch('/api/stripe/billing-portal', {
        method: 'POST',
      })

      if (!response.ok) {
        throw new Error('Failed to create billing portal session')
      }

      const { url } = await response.json()
      window.location.href = url
    } catch (error: any) {
      console.error('Billing portal error:', error)
      alert(error.message || 'Failed to open billing portal. Please try again.')
    } finally {
      setProcessingPortal(false)
    }
  }

  const handleUpgrade = () => {
    router.push('/pricing')
  }

  if (loading || subscriptionLoading) {
    return (
      <div className="min-h-screen bg-gray-50 flex items-center justify-center">
        <div className="text-center">
          <div className="animate-spin rounded-full h-12 w-12 border-b-2 border-primary-600 mx-auto"></div>
          <p className="mt-4 text-gray-600">Loading billing information...</p>
        </div>
      </div>
    )
  }

  const subscriptionStatus = billingInfo?.subscriptionStatus

  return (
    <div className="min-h-screen bg-gray-50 py-8">
      <div className="max-w-4xl mx-auto px-4">
        {/* Header */}
        <div className="mb-8">
          <h1 className="text-3xl font-bold text-gray-900">Billing & Subscription</h1>
          <p className="text-gray-600 mt-2">
            Manage your subscription, payment methods, and billing history
          </p>
        </div>

        {/* Canceled Checkout Alert */}
        {canceledCheckout && (
          <div className="mb-6 bg-yellow-50 border border-yellow-200 rounded-xl p-4 flex items-start gap-3">
            <AlertCircle className="w-5 h-5 text-yellow-600 flex-shrink-0 mt-0.5" />
            <div>
              <h3 className="font-semibold text-yellow-900">Checkout Canceled</h3>
              <p className="text-sm text-yellow-700 mt-1">
                Your checkout was canceled. No charges were made. You can try again anytime.
              </p>
            </div>
          </div>
        )}

        {/* Current Plan Card */}
        <div className="bg-white rounded-2xl shadow-sm p-6 mb-6">
          <div className="flex items-start justify-between mb-6">
            <div>
              <h2 className="text-xl font-semibold text-gray-900 mb-2">Current Plan</h2>
              <div className="flex items-center gap-3">
                <div className="inline-flex items-center gap-2 px-4 py-2 bg-gradient-primary text-white rounded-full">
                  {hasActiveSubscription ? (
                    <Sparkles className="w-4 h-4" />
                  ) : (
                    <BookOpen className="w-4 h-4" />
                  )}
                  <span className="font-semibold">
                    {hasActiveSubscription ? 'Stories Plus' : 'Free'}
                  </span>
                </div>
                {subscriptionStatus && hasActiveSubscription && (
                  <span className={`px-3 py-1 rounded-full text-xs font-semibold ${
                    subscriptionStatus === 'active'
                      ? 'bg-green-100 text-green-700'
                      : subscriptionStatus === 'past_due'
                      ? 'bg-yellow-100 text-yellow-700'
                      : subscriptionStatus === 'canceled'
                      ? 'bg-red-100 text-red-700'
                      : 'bg-gray-100 text-gray-700'
                  }`}>
                    {subscriptionStatus.charAt(0).toUpperCase() + subscriptionStatus.slice(1)}
                  </span>
                )}
              </div>
            </div>

            {hasActiveSubscription ? (
              <button
                onClick={handleManageBilling}
                disabled={processingPortal}
                className="px-4 py-2 bg-gray-900 text-white rounded-lg hover:bg-gray-800 transition-colors flex items-center gap-2 disabled:opacity-50"
              >
                {processingPortal ? (
                  <>
                    <div className="animate-spin rounded-full h-4 w-4 border-b-2 border-white"></div>
                    <span>Loading...</span>
                  </>
                ) : (
                  <>
                    <CreditCard className="w-4 h-4" />
                    <span>Manage Billing</span>
                    <ExternalLink className="w-4 h-4" />
                  </>
                )}
              </button>
            ) : (
              <button
                onClick={handleUpgrade}
                className="px-4 py-2 bg-gradient-primary text-white rounded-lg hover:opacity-90 transition-all flex items-center gap-2"
              >
                <span>Upgrade Plan</span>
                <ArrowRight className="w-4 h-4" />
              </button>
            )}
          </div>

          {/* Plan Details */}
          <div className="grid md:grid-cols-2 gap-6">
            <div>
              <h3 className="text-sm font-semibold text-gray-700 mb-3">Plan Features</h3>
              <ul className="space-y-2 text-sm">
                {hasActiveSubscription ? (
                  <>
                    <li className="flex items-start gap-2">
                      <CheckCircle className="w-4 h-4 text-green-500 flex-shrink-0 mt-0.5" />
                      <span className="text-gray-700">
                        {PRICING_CONFIG.SUBSCRIPTION_MONTHLY_LIMIT} stories per month
                      </span>
                    </li>
                    <li className="flex items-start gap-2">
                      <CheckCircle className="w-4 h-4 text-green-500 flex-shrink-0 mt-0.5" />
                      <span className="text-gray-700">Full illustrations on every story</span>
                    </li>
                    <li className="flex items-start gap-2">
                      <CheckCircle className="w-4 h-4 text-green-500 flex-shrink-0 mt-0.5" />
                      <span className="text-gray-700">All genres & writing styles</span>
                    </li>
                    <li className="flex items-start gap-2">
                      <CheckCircle className="w-4 h-4 text-green-500 flex-shrink-0 mt-0.5" />
                      <span className="text-gray-700">Growth stories & life lessons</span>
                    </li>
                    <li className="flex items-start gap-2">
                      <CheckCircle className="w-4 h-4 text-green-500 flex-shrink-0 mt-0.5" />
                      <span className="text-gray-700">Priority support</span>
                    </li>
                  </>
                ) : (
                  <>
                    <li className="flex items-start gap-2">
                      <CheckCircle className="w-4 h-4 text-green-500 flex-shrink-0 mt-0.5" />
                      <span className="text-gray-700">First illustrated story free</span>
                    </li>
                    <li className="flex items-start gap-2">
                      <CheckCircle className="w-4 h-4 text-green-500 flex-shrink-0 mt-0.5" />
                      <span className="text-gray-700">Access to all features</span>
                    </li>
                    <li className="flex items-start gap-2">
                      <CheckCircle className="w-4 h-4 text-green-500 flex-shrink-0 mt-0.5" />
                      <span className="text-gray-700">
                        Buy additional stories for ${(PRICING_CONFIG.SINGLE_STORY_PRICE_CENTS / 100).toFixed(2)}
                      </span>
                    </li>
                  </>
                )}
              </ul>
            </div>

            <div>
              <h3 className="text-sm font-semibold text-gray-700 mb-3">
                {hasActiveSubscription ? 'Usage This Month' : 'Story Credits'}
              </h3>
              {hasActiveSubscription ? (
                <StoryUsageCounter
                  storiesUsed={storiesUsedThisMonth}
                  storiesLimit={monthlyLimit}
                  daysUntilReset={daysUntilReset}
                  variant="detailed"
                />
              ) : (
                <div className="bg-gray-50 rounded-xl p-4">
                  <p className="text-gray-700">
                    {generationCredits > 0 ? (
                      <>You have <strong>{generationCredits}</strong> story credit{generationCredits !== 1 ? 's' : ''} available</>
                    ) : (
                      <>No story credits available</>
                    )}
                  </p>
                  <p className="text-sm text-gray-500 mt-2">
                    Buy a single story for ${(PRICING_CONFIG.SINGLE_STORY_PRICE_CENTS / 100).toFixed(2)} or subscribe for ${(PRICING_CONFIG.SUBSCRIPTION_PRICE_CENTS / 100).toFixed(2)}/month
                  </p>
                </div>
              )}
            </div>
          </div>
        </div>

        {/* Billing Details (if has subscription) */}
        {hasActiveSubscription && (
          <div className="bg-white rounded-2xl shadow-sm p-6 mb-6">
            <h2 className="text-xl font-semibold text-gray-900 mb-4">Billing Details</h2>

            <div className="space-y-4">
              <div className="flex items-start gap-3 p-4 bg-blue-50 rounded-lg">
                <Calendar className="w-5 h-5 text-blue-600 flex-shrink-0 mt-0.5" />
                <div>
                  <p className="font-medium text-gray-900">Billing Cycle</p>
                  <p className="text-sm text-gray-600 mt-1">
                    Your subscription renews automatically at ${(PRICING_CONFIG.SUBSCRIPTION_PRICE_CENTS / 100).toFixed(2)}/month.
                    {daysUntilReset !== null && (
                      <> Your story limit resets in {daysUntilReset} day{daysUntilReset !== 1 ? 's' : ''}.</>
                    )}
                  </p>
                </div>
              </div>

              <button
                onClick={handleManageBilling}
                disabled={processingPortal}
                className="w-full px-6 py-3 bg-gray-900 text-white rounded-xl hover:bg-gray-800 transition-colors flex items-center justify-center gap-2 disabled:opacity-50"
              >
                {processingPortal ? (
                  <>
                    <div className="animate-spin rounded-full h-5 w-5 border-b-2 border-white"></div>
                    <span>Loading Portal...</span>
                  </>
                ) : (
                  <>
                    <span>View Payment Methods & Invoices</span>
                    <ExternalLink className="w-5 h-5" />
                  </>
                )}
              </button>
            </div>
          </div>
        )}

        {/* Upgrade CTA (if free) */}
        {!hasActiveSubscription && (
          <div className="bg-gradient-to-br from-sky-50 to-primary-50 rounded-2xl p-8 text-center">
            <h2 className="text-2xl font-bold text-gray-900 mb-2">
              Unlock More Stories
            </h2>
            <p className="text-gray-600 mb-6 max-w-lg mx-auto">
              Subscribe to Stories Plus for {PRICING_CONFIG.SUBSCRIPTION_MONTHLY_LIMIT} stories per month,
              full illustrations, and all premium features.
            </p>
            <div className="flex flex-col sm:flex-row gap-4 justify-center">
              <button
                onClick={handleUpgrade}
                className="px-8 py-3 bg-gradient-primary text-white rounded-xl hover:opacity-90 transition-all font-semibold inline-flex items-center justify-center gap-2"
              >
                <Sparkles className="w-5 h-5" />
                <span>Subscribe - ${(PRICING_CONFIG.SUBSCRIPTION_PRICE_CENTS / 100).toFixed(2)}/month</span>
              </button>
            </div>
          </div>
        )}

        {/* Help Section */}
        <div className="mt-8 bg-gray-100 rounded-xl p-6">
          <h3 className="font-semibold text-gray-900 mb-2">Need Help?</h3>
          <p className="text-sm text-gray-600 mb-4">
            Have questions about your subscription or billing?
          </p>
          <a
            href="mailto:support@tuckandtale.com"
            className="text-primary-600 hover:text-primary-700 font-semibold text-sm inline-flex items-center gap-1"
          >
            Contact Support
            <ExternalLink className="w-4 h-4" />
          </a>
        </div>
      </div>
    </div>
  )
}

export default function BillingPage() {
  return (
    <Suspense fallback={
      <div className="min-h-screen bg-gray-50 flex items-center justify-center">
        <div className="text-center">
          <div className="animate-spin rounded-full h-12 w-12 border-b-2 border-primary-600 mx-auto"></div>
          <p className="mt-4 text-gray-600">Loading billing information...</p>
        </div>
      </div>
    }>
      <BillingPageContent />
    </Suspense>
  )
}
