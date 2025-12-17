'use client'

import Link from 'next/link'
import { Users, ArrowRight } from 'lucide-react'

export default function AddMoreCharactersPage() {
  return (
    <div className="min-h-screen bg-gray-50 flex items-center justify-center p-4 sm:p-6">
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
              href="/dashboard/my-children/create?onboarding=true"
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
              href="/dashboard/other-characters/create?onboarding=true"
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
            href="/onboarding/pricing"
            className="w-full bg-gradient-primary text-white font-bold text-lg py-4 px-6 rounded-xl hover:opacity-90 transition-all shadow-lg hover:shadow-xl flex items-center justify-center gap-2"
          >
            Start Creating Stories
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
