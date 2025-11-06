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
      <div className="min-h-screen bg-gradient-to-br from-blue-50 to-purple-50 p-6">
        <div className="max-w-2xl mx-auto">
          <p className="text-red-600">Configuration error: No character types found</p>
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
            href="/dashboard/other-characters"
            className="inline-flex items-center gap-2 text-blue-600 hover:text-blue-700 font-medium mb-4"
          >
            <ArrowLeft className="w-4 h-4" />
            Back to Other Characters
          </Link>

          <div className="bg-white rounded-2xl shadow-lg p-8">
            <h1 className="text-3xl font-bold text-neutral-900 mb-2">
              Add a Character
            </h1>
            <p className="text-neutral-600">
              Create magical friends for your stories
            </p>
          </div>
        </div>

        {/* Character Type Selector */}
        <div className="bg-white rounded-2xl shadow-lg p-6 mb-6">
          <h3 className="text-sm font-semibold text-neutral-700 mb-3">
            Choose Character Type
          </h3>
          <div className="flex flex-wrap gap-3">
            {otherTypes.map(type => (
              <button
                key={type.id}
                type="button"
                onClick={() => setSelectedType(type)}
                className={`
                  px-6 py-3 rounded-xl font-medium transition-all duration-200
                  ${selectedType?.id === type.id
                    ? 'bg-gradient-to-r from-blue-500 to-blue-600 text-white shadow-lg scale-105'
                    : 'bg-white border-2 border-neutral-200 text-neutral-700 hover:border-blue-300 hover:shadow-md'
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
          <div className="bg-white rounded-2xl shadow-lg p-8">
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