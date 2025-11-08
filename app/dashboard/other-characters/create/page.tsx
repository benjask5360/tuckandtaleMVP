'use client'

import { useState } from 'react'
import { getCharacterTypesByCategory } from '@/lib/character-types'
import DynamicCharacterForm from '@/components/forms/DynamicCharacterForm'
import Link from 'next/link'
import { ArrowLeft } from 'lucide-react'

export default function CreateOtherCharacterPage() {
  const otherTypes = getCharacterTypesByCategory('other')

  // Default to Storybook Character
  const [selectedType, setSelectedType] = useState(
    otherTypes.find(t => t.id === 'storybook_character') || otherTypes[0]
  )

  if (!otherTypes || otherTypes.length === 0) {
    return (
      <div className="min-h-screen bg-gray-50 flex items-center justify-center p-4 sm:p-6">
        <div className="card p-6 md:p-8 max-w-md">
          <p className="text-red-600 font-medium text-center">Configuration error: No character types found</p>
        </div>
      </div>
    )
  }

  return (
    <div className="min-h-screen bg-gray-50">
      <div className="max-w-3xl mx-auto px-4 sm:px-6 py-6 md:py-8 pt-20 md:pt-24">
        {/* Header */}
        <div className="mb-6 md:mb-8">
          <Link
            href="/dashboard/other-characters"
            className="inline-flex items-center gap-2 text-primary-600 active:text-primary-700 md:hover:text-primary-700 font-semibold mb-4 md:mb-6 min-h-[44px] transition-colors"
          >
            <ArrowLeft className="w-4 h-4 md:w-5 md:h-5" />
            Back to Other Characters
          </Link>

          <div className="card p-6 md:p-8">
            <h1 className="text-2xl sm:text-3xl md:text-4xl font-display font-bold text-gray-900 mb-2">
              Add a Character
            </h1>
            <p className="text-base md:text-lg text-gray-600">
              Create magical friends for your stories
            </p>
          </div>
        </div>

        {/* Character Type Selector */}
        <div className="card p-6 md:p-8 mb-6 md:mb-8">
          <h3 className="text-sm md:text-base font-bold text-gray-900 mb-4">
            Choose Character Type
          </h3>
          <div className="flex flex-wrap gap-3">
            {otherTypes.map(type => (
              <button
                key={type.id}
                type="button"
                onClick={() => setSelectedType(type)}
                className={`
                  px-5 py-3 rounded-xl font-semibold transition-all duration-200 min-h-[44px]
                  ${selectedType?.id === type.id
                    ? 'bg-gradient-primary text-white shadow-blue-glow scale-105'
                    : 'bg-white border-2 border-gray-200 text-gray-700 active:border-primary-300 active:shadow-md md:hover:border-primary-300 md:hover:shadow-md'
                  }
                `}
              >
                {type.displayName}
              </button>
            ))}
          </div>
        </div>

        {/* Form */}
        {selectedType && (
          <div className="card p-6 md:p-8">
            <DynamicCharacterForm
              key={selectedType.id} // Force re-render when type changes
              characterType={selectedType}
            />
          </div>
        )}
      </div>
    </div>
  )
}