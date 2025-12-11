'use client'

import { useState } from 'react'
import { useRouter } from 'next/navigation'
import Link from 'next/link'
import {
  Sparkles,
  Shield,
  Zap,
  ArrowRight,
  Heart,
  Check,
  ChevronDown,
  BookOpen,
  Loader2,
} from 'lucide-react'
import { PRICING_CONFIG } from '@/lib/config/pricing-config'

export default function PricingPage() {
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
    <div className="min-h-screen bg-gray-50">
      {/* Hero Section */}
      <section className="relative overflow-hidden bg-white py-12 md:py-20">
        <div className="absolute inset-0 bg-gradient-primary opacity-100"></div>
        <div className="container-narrow px-4 md:px-6 relative z-10">
          <div className="max-w-3xl mx-auto text-center">
            <h1 className="font-display font-bold text-3xl md:text-5xl lg:text-6xl mb-4 md:mb-6 text-white">
              Personalized Bedtime Stories
            </h1>
            <p className="text-lg md:text-xl lg:text-2xl text-white/90 leading-relaxed">
              Create magical stories your children will love.
              Start with a free illustrated story!
            </p>
          </div>
        </div>
      </section>

      {/* Trust Badges */}
      <section className="py-8 bg-white border-b border-gray-200">
        <div className="container-narrow">
          <div className="flex justify-center gap-8 flex-wrap">
            <div className="flex items-center gap-2 text-gray-700">
              <Shield className="w-5 h-5 text-green-600" />
              <span className="text-sm">Secure payments</span>
            </div>
            <div className="flex items-center gap-2 text-gray-700">
              <Zap className="w-5 h-5 text-yellow-600" />
              <span className="text-sm">Instant access</span>
            </div>
            <div className="flex items-center gap-2 text-gray-700">
              <Sparkles className="w-5 h-5 text-primary-600" />
              <span className="text-sm">Cancel anytime</span>
            </div>
          </div>
        </div>
      </section>

      {/* Free Trial CTA */}
      <section className="py-6 bg-gray-50">
        <div className="container-narrow">
          <div className="bg-gradient-primary rounded-2xl px-6 py-4 md:px-8 md:py-6 text-center shadow-lg">
            <p className="text-xl md:text-2xl font-bold text-white mb-3">
              Get Your First Free Illustrated Story on Us!
            </p>
            <p className="text-white/90 mb-4 text-sm md:text-base">
              No credit card required • Start creating in minutes
            </p>
            <Link
              href="/auth/signup"
              className="inline-flex items-center gap-2 bg-white text-primary-600 px-6 py-3 rounded-xl font-semibold hover:bg-gray-50 transition-colors shadow-lg"
            >
              Get Started Free
              <ArrowRight className="w-5 h-5" />
            </Link>
          </div>
        </div>
      </section>

      {/* Pricing Cards Section */}
      <section className="section-padding py-8 md:py-16">
        <div className="container-narrow px-4 md:px-6">
          <div className="grid md:grid-cols-2 gap-6 max-w-3xl mx-auto">
            {/* Single Story Card */}
            <div className="bg-white rounded-2xl border-2 border-gray-200 p-6 md:p-8 hover:border-primary-200 transition-colors">
              <div className="flex items-center gap-3 mb-4">
                <div className="w-12 h-12 bg-gray-100 rounded-full flex items-center justify-center">
                  <BookOpen className="w-6 h-6 text-gray-600" />
                </div>
                <h2 className="font-display font-bold text-2xl text-gray-900">
                  Single Story
                </h2>
              </div>

              <p className="text-gray-600 mb-6">
                Perfect for trying us out or occasional use
              </p>

              <div className="mb-6">
                <span className="text-5xl font-bold text-gray-900">
                  ${(PRICING_CONFIG.SINGLE_STORY_PRICE_CENTS / 100).toFixed(2)}
                </span>
                <span className="text-gray-500 ml-2">one-time</span>
              </div>

              <ul className="space-y-4 mb-8">
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
                  <span className="text-gray-700">Keep saved in your library</span>
                </li>
                <li className="flex items-start gap-3">
                  <Check className="w-5 h-5 text-green-600 flex-shrink-0 mt-0.5" />
                  <span className="text-gray-700">All genres & writing styles</span>
                </li>
              </ul>

              <button
                onClick={handleSingleStoryPurchase}
                disabled={processingCheckout !== null}
                className="w-full py-4 px-6 bg-gray-900 text-white rounded-xl font-semibold hover:bg-gray-800 transition-colors disabled:opacity-50 disabled:cursor-not-allowed flex items-center justify-center gap-2"
              >
                {processingCheckout === 'single' ? (
                  <>
                    <Loader2 className="w-5 h-5 animate-spin" />
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
                <div className="w-12 h-12 bg-primary-100 rounded-full flex items-center justify-center">
                  <Sparkles className="w-6 h-6 text-primary-600" />
                </div>
                <h2 className="font-display font-bold text-2xl text-gray-900">
                  Stories Plus
                </h2>
              </div>

              <p className="text-gray-600 mb-6">
                For story-loving families
              </p>

              <div className="mb-6">
                <span className="text-5xl font-bold text-gray-900">
                  ${(PRICING_CONFIG.SUBSCRIPTION_PRICE_CENTS / 100).toFixed(2)}
                </span>
                <span className="text-gray-500 ml-2">/month</span>
              </div>

              <ul className="space-y-4 mb-8">
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
                  <span className="text-gray-700">All genres & writing styles</span>
                </li>
                <li className="flex items-start gap-3">
                  <Check className="w-5 h-5 text-green-600 flex-shrink-0 mt-0.5" />
                  <span className="text-gray-700">Growth stories & life lessons</span>
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
                    <Loader2 className="w-5 h-5 animate-spin" />
                    Processing...
                  </>
                ) : (
                  <>Subscribe Now</>
                )}
              </button>
            </div>
          </div>

          {/* Value comparison note */}
          <div className="mt-8 text-center">
            <p className="text-sm text-gray-500">
              At $14.99/month for 30 stories, that&apos;s just <strong>$0.50 per story</strong> vs $4.99 each!
            </p>
          </div>
        </div>
      </section>

      {/* What&apos;s Included Section - Condensed on mobile */}
      <section className="section-padding py-12 md:py-16 bg-white">
        <div className="container-narrow">
          <div className="max-w-4xl mx-auto">
            <h2 className="font-display font-bold text-2xl md:text-4xl text-gray-900 mb-6 md:mb-8 text-center">
              Every Story Includes
            </h2>

            <div className="grid md:grid-cols-2 gap-5 md:gap-6">
              <div className="flex items-start gap-4 p-4">
                <span className="text-3xl md:text-2xl flex-shrink-0">🎨</span>
                <div>
                  <h3 className="font-semibold text-gray-900 text-base md:text-lg">Custom Illustrations</h3>
                  <p className="text-gray-600 text-sm md:text-base hidden md:block">
                    Beautiful AI-generated artwork
                  </p>
                </div>
              </div>

              <div className="flex items-start gap-4 p-4">
                <span className="text-3xl md:text-2xl flex-shrink-0">👶</span>
                <div>
                  <h3 className="font-semibold text-gray-900 text-base md:text-lg">Personalized Characters</h3>
                  <p className="text-gray-600 text-sm md:text-base hidden md:block">
                    Your child is the hero
                  </p>
                </div>
              </div>

              <div className="flex items-start gap-4 p-4">
                <span className="text-3xl md:text-2xl flex-shrink-0">📚</span>
                <div>
                  <h3 className="font-semibold text-gray-900 text-base md:text-lg">Multiple Genres</h3>
                  <p className="text-gray-600 text-sm md:text-base hidden md:block">
                    Adventure, fantasy, fairy tales, and more
                  </p>
                </div>
              </div>

              <div className="flex items-start gap-4 p-4">
                <span className="text-3xl md:text-2xl flex-shrink-0">🌱</span>
                <div>
                  <h3 className="font-semibold text-gray-900 text-base md:text-lg">Growth Stories</h3>
                  <p className="text-gray-600 text-sm md:text-base hidden md:block">
                    Teach valuable life lessons
                  </p>
                </div>
              </div>
            </div>
          </div>
        </div>
      </section>

      {/* FAQ Section */}
      <section className="section-padding py-16 bg-gray-50">
        <div className="container-narrow">
          <div className="max-w-4xl mx-auto">
            <h2 className="font-display font-bold text-3xl md:text-4xl text-gray-900 mb-8 text-center">
              Frequently Asked Questions
            </h2>
            <div className="space-y-4">
              <details className="group bg-white rounded-2xl shadow-sm overflow-hidden border border-gray-200">
                <summary className="flex items-center justify-between p-6 cursor-pointer hover:bg-gray-50 transition-colors">
                  <h3 className="font-semibold text-lg md:text-xl text-gray-900 pr-4">Is there a free trial?</h3>
                  <ChevronDown className="w-5 h-5 text-gray-500 flex-shrink-0 transition-transform group-open:rotate-180" />
                </summary>
                <div className="px-6 pb-6 text-gray-600 leading-relaxed">
                  Yes! Your first illustrated story is completely free. No credit card required to start.
                  Create your account and generate your first personalized story right away.
                </div>
              </details>

              <details className="group bg-white rounded-2xl shadow-sm overflow-hidden border border-gray-200">
                <summary className="flex items-center justify-between p-6 cursor-pointer hover:bg-gray-50 transition-colors">
                  <h3 className="font-semibold text-lg md:text-xl text-gray-900 pr-4">How does the subscription work?</h3>
                  <ChevronDown className="w-5 h-5 text-gray-500 flex-shrink-0 transition-transform group-open:rotate-180" />
                </summary>
                <div className="px-6 pb-6 text-gray-600 leading-relaxed">
                  Stories Plus gives you 30 stories per month for ${(PRICING_CONFIG.SUBSCRIPTION_PRICE_CENTS / 100).toFixed(2)}/month.
                  Your story count resets on your billing date each month. You can cancel anytime and keep access until the end of your billing period.
                </div>
              </details>

              <details className="group bg-white rounded-2xl shadow-sm overflow-hidden border border-gray-200">
                <summary className="flex items-center justify-between p-6 cursor-pointer hover:bg-gray-50 transition-colors">
                  <h3 className="font-semibold text-lg md:text-xl text-gray-900 pr-4">What if I run out of stories?</h3>
                  <ChevronDown className="w-5 h-5 text-gray-500 flex-shrink-0 transition-transform group-open:rotate-180" />
                </summary>
                <div className="px-6 pb-6 text-gray-600 leading-relaxed">
                  Subscribers can purchase additional stories for ${(PRICING_CONFIG.SINGLE_STORY_PRICE_CENTS / 100).toFixed(2)} each if they need more.
                  Your monthly allowance resets on your billing date, so you can also wait for the reset.
                </div>
              </details>

              <details className="group bg-white rounded-2xl shadow-sm overflow-hidden border border-gray-200">
                <summary className="flex items-center justify-between p-6 cursor-pointer hover:bg-gray-50 transition-colors">
                  <h3 className="font-semibold text-lg md:text-xl text-gray-900 pr-4">Can I cancel my subscription?</h3>
                  <ChevronDown className="w-5 h-5 text-gray-500 flex-shrink-0 transition-transform group-open:rotate-180" />
                </summary>
                <div className="px-6 pb-6 text-gray-600 leading-relaxed">
                  Yes, you can cancel your subscription at any time from your account settings.
                  You&apos;ll continue to have access until the end of your billing period.
                </div>
              </details>

              <details className="group bg-white rounded-2xl shadow-sm overflow-hidden border border-gray-200">
                <summary className="flex items-center justify-between p-6 cursor-pointer hover:bg-gray-50 transition-colors">
                  <h3 className="font-semibold text-lg md:text-xl text-gray-900 pr-4">What payment methods do you accept?</h3>
                  <ChevronDown className="w-5 h-5 text-gray-500 flex-shrink-0 transition-transform group-open:rotate-180" />
                </summary>
                <div className="px-6 pb-6 text-gray-600 leading-relaxed">
                  We accept all major credit and debit cards through our secure payment processor, Stripe.
                  Your payment information is never stored on our servers.
                </div>
              </details>
            </div>
          </div>
        </div>
      </section>

      {/* CTA Section */}
      <section className="section-padding py-16 bg-white">
        <div className="container-narrow">
          <Link href="/auth/login" className="block">
            <div className="bg-gradient-primary rounded-3xl p-8 md:p-12 text-center text-white cursor-pointer hover:opacity-95 transition-opacity">
              <h2 className="font-display font-bold text-3xl md:text-4xl mb-4 text-white">
                Ready to Create Magic?
              </h2>
              <p className="text-xl text-white mb-8 max-w-2xl mx-auto">
                Join thousands of families creating personalized stories that inspire and delight.
                Your first story is free!
              </p>
              <div className="inline-flex items-center gap-2 bg-white text-primary-600 px-8 py-4 rounded-xl font-semibold text-lg hover:bg-gray-50 transition-colors">
                Get Started Free
                <ArrowRight className="w-5 h-5" />
              </div>
            </div>
          </Link>
        </div>
      </section>

      {/* Footer */}
      <footer className="py-12 bg-white border-t border-gray-200">
        <div className="max-w-7xl mx-auto px-6">
          <div className="flex flex-col items-center gap-6 text-sm">
            <p className="flex flex-wrap items-center justify-center gap-2 text-lg text-gray-700 text-center">
              Made with <Heart className="w-5 h-5 fill-red-500 text-red-500 animate-pulse-soft" /> in the USA for little dreamers everywhere
            </p>
            <div className="flex flex-col md:flex-row justify-between items-center w-full gap-6">
              <p className="text-center md:text-left text-gray-500">&copy; 2025 Tuck and Tale&trade;. All rights reserved.</p>
              <nav className="grid grid-cols-2 sm:grid-cols-3 md:flex md:flex-row gap-x-8 gap-y-4 text-center md:text-left text-gray-600">
                <a href="/about" className="hover:text-primary-600 transition-colors">About</a>
                <a href="/pricing" className="hover:text-primary-600 transition-colors">Pricing</a>
                <a href="/contact" className="hover:text-primary-600 transition-colors">Contact Us</a>
                <a href="/faq" className="hover:text-primary-600 transition-colors">FAQ</a>
                <a href="/privacy" className="hover:text-primary-600 transition-colors">Privacy Policy</a>
                <a href="/terms" className="hover:text-primary-600 transition-colors">Terms of Service</a>
              </nav>
            </div>
          </div>
        </div>
      </footer>

      {/* Processing Overlay */}
      {processingCheckout && (
        <div className="fixed inset-0 bg-black bg-opacity-50 flex items-center justify-center z-50">
          <div className="bg-white rounded-2xl p-8 max-w-sm text-center">
            <Loader2 className="w-12 h-12 animate-spin text-primary-600 mx-auto mb-4" />
            <h3 className="text-xl font-semibold text-gray-900 mb-2">
              Redirecting to checkout...
            </h3>
            <p className="text-gray-600">Please wait a moment</p>
          </div>
        </div>
      )}
    </div>
  )
}
