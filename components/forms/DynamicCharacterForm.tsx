'use client'

import { useState } from 'react'
import { CharacterTypeConfig } from '@/lib/character-types'
import FieldRenderer from './fields/FieldRenderer'
import { useRouter } from 'next/navigation'

interface DynamicCharacterFormProps {
  characterType: CharacterTypeConfig
  initialValues?: Record<string, any>
  isEditing?: boolean
  onSubmit?: (data: any) => Promise<void>
}

export default function DynamicCharacterForm({
  characterType,
  initialValues = {},
  isEditing = false,
  onSubmit
}: DynamicCharacterFormProps) {
  const [formData, setFormData] = useState<Record<string, any>>(initialValues)
  const [loading, setLoading] = useState(false)
  const [error, setError] = useState<string | null>(null)
  const [calculatedAge, setCalculatedAge] = useState<number | null>(null)
  const router = useRouter()

  // Calculate age from date of birth
  const calculateAge = (dateOfBirth: string) => {
    if (!dateOfBirth) return null
    const today = new Date()
    const birthDate = new Date(dateOfBirth)
    let age = today.getFullYear() - birthDate.getFullYear()
    const monthDiff = today.getMonth() - birthDate.getMonth()
    if (monthDiff < 0 || (monthDiff === 0 && today.getDate() < birthDate.getDate())) {
      age--
    }
    return age
  }

  const handleFieldChange = (fieldId: string, value: any) => {
    setFormData(prev => ({
      ...prev,
      [fieldId]: value
    }))

    // Auto-calculate age for children
    if (fieldId === 'dateOfBirth' && characterType.id === 'child') {
      const age = calculateAge(value)
      setCalculatedAge(age)
    }
  }

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault()
    setError(null)
    setLoading(true)

    try {
      // Prepare data for submission
      const submitData = {
        name: formData.name,
        character_type: characterType.id,
        attributes: { ...formData }
      }

      // If it's a child and we have DOB, add calculated age
      if (characterType.id === 'child' && formData.dateOfBirth) {
        submitData.attributes.age = calculateAge(formData.dateOfBirth)
      }

      // Remove name from attributes since it's a top-level field
      delete submitData.attributes.name

      if (onSubmit) {
        await onSubmit(submitData)
      } else {
        // Default API call
        const endpoint = isEditing
          ? `/api/characters/${initialValues.id}/update`
          : '/api/characters/create'

        const response = await fetch(endpoint, {
          method: isEditing ? 'PUT' : 'POST',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify(submitData)
        })

        if (!response.ok) {
          const data = await response.json()
          throw new Error(data.error || 'Failed to save character')
        }

        // Redirect based on character type
        if (characterType.category === 'child') {
          router.push('/dashboard/my-children')
        } else {
          router.push('/dashboard/other-characters')
        }
      }
    } catch (err: any) {
      setError(err.message)
    } finally {
      setLoading(false)
    }
  }

  return (
    <form onSubmit={handleSubmit} className="space-y-8">
      {error && (
        <div className="bg-red-50 border border-red-200 text-red-800 px-4 py-3 rounded-lg text-sm">
          {error}
        </div>
      )}

      {characterType.fieldGroups.map((group, groupIndex) => (
        <div key={groupIndex} className="space-y-5">
          <h3 className="text-lg font-bold text-neutral-800 border-b border-neutral-200 pb-2">
            {group.title}
          </h3>

          <div className="space-y-5">
            {group.fields.map(field => (
              <div key={field.id}>
                <FieldRenderer
                  field={field}
                  value={formData[field.id]}
                  onChange={(value) => handleFieldChange(field.id, value)}
                />

                {/* Show calculated age for children */}
                {field.id === 'dateOfBirth' && calculatedAge !== null && (
                  <p className="text-sm text-neutral-600 mt-2">
                    Age: <span className="font-semibold">{calculatedAge} years old</span>
                  </p>
                )}
              </div>
            ))}
          </div>
        </div>
      ))}

      {/* Action Buttons */}
      <div className="flex gap-4 pt-6">
        <button
          type="button"
          disabled={loading}
          className="px-8 py-3 bg-gradient-to-r from-purple-500 to-pink-500 text-white font-semibold rounded-xl hover:shadow-lg transition-all duration-300 disabled:opacity-50"
        >
          Generate Avatar (Coming Soon)
        </button>

        <button
          type="submit"
          disabled={loading}
          className="px-8 py-3 bg-gradient-to-r from-blue-500 to-blue-600 text-white font-semibold rounded-xl hover:shadow-lg transition-all duration-300 disabled:opacity-50"
        >
          {loading ? 'Saving...' : isEditing ? 'Update Profile' : 'Save Profile'}
        </button>
      </div>
    </form>
  )
}