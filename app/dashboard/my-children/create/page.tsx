'use client'

import { Suspense } from 'react'
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

export default function CreateChildPage() {
  const childType = getCharacterTypeById('child')

  if (!childType) {
    return (
      <div className="min-h-screen bg-gray-50 flex items-center justify-center p-4 sm:p-6">
        <div className="card p-6 md:p-8 max-w-md">
          <p className="text-red-600 font-medium text-center">Configuration error: Child character type not found</p>
        </div>
      </div>
    )
  }

  return (
    <div className="min-h-screen bg-gray-50">
      <div className="max-w-3xl mx-auto px-4 sm:px-6 py-4 md:py-6">
        {/* Header */}
        <div className="mb-4 md:mb-6">
          <Link
            href="/dashboard/my-children"
            className="inline-flex items-center gap-2 text-primary-600 active:text-primary-700 md:hover:text-primary-700 font-semibold mb-4 md:mb-6 min-h-[44px] transition-colors"
          >
            <ArrowLeft className="w-4 h-4 md:w-5 md:h-5" />
            Back to My Children
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
          <Suspense fallback={<FormLoader />}>
            <DynamicCharacterForm characterType={childType} />
          </Suspense>
        </div>
      </div>
    </div>
  )
}