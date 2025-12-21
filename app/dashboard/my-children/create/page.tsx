'use client'

import { Suspense } from 'react'
import { useSearchParams } from 'next/navigation'
import { getCharacterTypeById } from '@/lib/character-types'
import DynamicCharacterForm from '@/components/forms/DynamicCharacterForm'
import Link from 'next/link'
import { ArrowLeft, Loader2 } from 'lucide-react'

function FormLoader() {
  return (
    <div className="flex items-center justify-center py-12">
      <Loader2 className="w-8 h-8 animate-spin text-primary-500" />
    </div>
  )
}

function CreateChildContent() {
  const searchParams = useSearchParams()
  const isOnboarding = searchParams.get('onboarding') === 'true'
  const childType = getCharacterTypeById('child')

  if (!childType) {
    return (
      <div className="min-h-screen bg-white flex items-center justify-center p-4 sm:p-6">
        <div className="card p-6 md:p-8 max-w-md">
          <p className="text-red-600 font-medium text-center">Configuration error: Child character type not found</p>
        </div>
      </div>
    )
  }

  const backHref = isOnboarding ? '/onboarding/add-more' : '/dashboard/my-children'
  const backText = isOnboarding ? 'Back to Add Characters' : 'Back to My Children'

  return (
    <div className="min-h-screen bg-white">
      <div className="max-w-3xl mx-auto px-4 sm:px-6 py-4 md:py-6">
        {/* Header */}
        <div className="mb-4 md:mb-6">
          <Link
            href={backHref}
            className="inline-flex items-center gap-2 text-primary-600 active:text-primary-700 md:hover:text-primary-700 font-semibold mb-4 md:mb-6 min-h-[44px] transition-colors"
          >
            <ArrowLeft className="w-4 h-4 md:w-5 md:h-5" />
            {backText}
          </Link>

          <div className="card p-6 md:p-8">
            <h1 className="text-2xl sm:text-3xl md:text-4xl font-display font-bold text-gray-900 mb-2">
              Add a Child Profile
            </h1>
            <p className="text-base md:text-lg text-gray-600">
              Create a profile for your child to personalize their stories
            </p>
          </div>
        </div>

        {/* Form */}
        <div className="card p-6 md:p-8">
          <DynamicCharacterForm
            characterType={childType}
            redirectAfterCreate={isOnboarding ? '/onboarding/add-more' : undefined}
          />
        </div>
      </div>
    </div>
  )
}

export default function CreateChildPage() {
  return (
    <Suspense fallback={<FormLoader />}>
      <CreateChildContent />
    </Suspense>
  )
}