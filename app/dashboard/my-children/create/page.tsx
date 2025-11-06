'use client'

import { getCharacterTypeById } from '@/lib/character-types'
import DynamicCharacterForm from '@/components/forms/DynamicCharacterForm'
import Link from 'next/link'
import { ArrowLeft } from 'lucide-react'

export default function CreateChildPage() {
  const childType = getCharacterTypeById('child')

  if (!childType) {
    return (
      <div className="min-h-screen bg-gradient-to-br from-blue-50 to-purple-50 p-6">
        <div className="max-w-2xl mx-auto">
          <p className="text-red-600">Configuration error: Child character type not found</p>
        </div>
      </div>
    )
  }

  return (
    <div className="min-h-screen bg-gradient-to-br from-blue-50 to-purple-50 p-6">
      <div className="max-w-3xl mx-auto">
        {/* Header */}
        <div className="mb-8">
          <Link
            href="/dashboard/my-children"
            className="inline-flex items-center gap-2 text-blue-600 hover:text-blue-700 font-medium mb-4"
          >
            <ArrowLeft className="w-4 h-4" />
            Back to My Children
          </Link>

          <div className="bg-white rounded-2xl shadow-lg p-8">
            <h1 className="text-3xl font-bold text-neutral-900 mb-2">
              Add a Child Profile
            </h1>
            <p className="text-neutral-600">
              Create a profile for your child to personalize their stories
            </p>
          </div>
        </div>

        {/* Form */}
        <div className="bg-white rounded-2xl shadow-lg p-8">
          <DynamicCharacterForm characterType={childType} />
        </div>
      </div>
    </div>
  )
}