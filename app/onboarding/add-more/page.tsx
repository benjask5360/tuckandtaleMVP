'use client'

import Link from 'next/link'
import { Users, ArrowRight } from 'lucide-react'
import { useSearchParams } from 'next/navigation'
import { Suspense } from 'react'

function AddMoreContent() {
  const searchParams = useSearchParams()
  const promo = searchParams.get('promo')
  const isSingleStory = promo === 'single-story'

  // Determine the pricing page URL based on promo
  const pricingUrl = isSingleStory
    ? '/onboarding/pricing/single-story'
    : '/onboarding/pricing'

  // Build URLs that preserve promo param for "add more" flows
  const addChildUrl = promo
    ? `/dashboard/my-children/create?onboarding=true&promo=${promo}`
    : '/dashboard/my-children/create?onboarding=true'

  const addPetUrl = promo
    ? `/dashboard/other-characters/create?onboarding=true&promo=${promo}`
    : '/dashboard/other-characters/create?onboarding=true'

  return (
    <div className="min-h-screen bg-white flex items-center justify-center p-4 sm:p-6">
      <div className="w-full max-w-2xl">
        <div className="card p-6 md:p-8 lg:p-10">
          <div className="text-center mb-8">
            <h1 className="text-2xl sm:text-3xl md:text-4xl font-display font-bold text-gray-900 mb-3">
              Anyone else joining the adventure?
            </h1>
          </div>

          {/* Options */}
          <div className="space-y-4 mb-8">
            <Link
              href={addChildUrl}
              className="group flex items-center gap-3 sm:gap-4 p-4 sm:p-5 rounded-2xl border-2 border-gray-200 bg-white hover:border-primary-300 hover:shadow-md transition-all"
            >
              <div className="flex-shrink-0 w-10 h-10 sm:w-12 sm:h-12 bg-primary-100 rounded-xl flex items-center justify-center">
                <Users className="w-5 h-5 sm:w-6 sm:h-6 text-primary-600" />
              </div>
              <h3 className="flex-1 font-semibold text-gray-900 group-hover:text-primary-600 transition-colors">
                Add another child
              </h3>
              <ArrowRight className="flex-shrink-0 w-5 h-5 text-gray-400 group-hover:text-primary-500 group-hover:translate-x-1 transition-all" />
            </Link>

            <Link
              href={addPetUrl}
              className="group flex items-center gap-3 sm:gap-4 p-4 sm:p-5 rounded-2xl border-2 border-gray-200 bg-white hover:border-primary-300 hover:shadow-md transition-all"
            >
              <div className="flex-shrink-0 w-10 h-10 sm:w-12 sm:h-12 bg-amber-100 rounded-xl flex items-center justify-center">
                <span className="text-xl sm:text-2xl">🐾</span>
              </div>
              <h3 className="flex-1 font-semibold text-gray-900 group-hover:text-primary-600 transition-colors">
                Add a pet or friend
              </h3>
              <ArrowRight className="flex-shrink-0 w-5 h-5 text-gray-400 group-hover:text-primary-500 group-hover:translate-x-1 transition-all" />
            </Link>
          </div>

          {/* Primary CTA */}
          <Link
            href={pricingUrl}
            className="w-full bg-gradient-primary text-white font-bold text-lg py-4 px-6 rounded-xl hover:opacity-90 transition-all shadow-lg hover:shadow-xl flex items-center justify-center gap-2"
          >
            {isSingleStory ? 'Get Your Story - $4.99' : 'Start Creating Stories'}
            <ArrowRight className="w-5 h-5" />
          </Link>
        </div>

        <p className="text-center text-sm text-neutral-500 mt-6">
          You can always add more later
        </p>
      </div>
    </div>
  )
}

export default function AddMoreCharactersPage() {
  return (
    <Suspense fallback={<div className="min-h-screen bg-white flex items-center justify-center">Loading...</div>}>
      <AddMoreContent />
    </Suspense>
  )
}
