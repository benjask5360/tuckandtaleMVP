'use client'

import { useState } from 'react'
import { CharacterTypeConfig } from '@/lib/character-types'
import FieldRenderer from './fields/FieldRenderer'
import { useRouter } from 'next/navigation'
import { AvatarDisplay } from '@/components/AvatarDisplay'

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
  const [characterId, setCharacterId] = useState<string | null>(initialValues?.id || null)
  const [showAvatarGenerator, setShowAvatarGenerator] = useState(false)
  const [pendingAvatarUrl, setPendingAvatarUrl] = useState<string | null>(null)
  const [pendingAvatarCacheId, setPendingAvatarCacheId] = useState<string | null>(null) // Store preview avatar cache ID
  const [hasNewAvatar, setHasNewAvatar] = useState(false) // Track if avatar was generated in this session
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

      // Save avatar FIRST if needed (before calling custom onSubmit or default API)
      if (isEditing && hasNewAvatar) {
        await saveMostRecentAvatar()
      }

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

        const responseData = await response.json()

        // If creating new character and there's a preview avatar, link it
        if (!isEditing && responseData.id && pendingAvatarCacheId) {
          await linkPreviewAvatar(responseData.id, pendingAvatarCacheId)
        }

        // If creating new character, store the ID
        if (!isEditing && responseData.id) {
          setCharacterId(responseData.id)
        }
      }

      // Handle redirects after everything is saved
      // Note: If using custom onSubmit, that handler is responsible for redirecting
      if (!onSubmit && !showAvatarGenerator) {
        // Use window.location.href for full page reload to ensure avatar updates are visible
        if (characterType.category === 'child') {
          window.location.href = '/dashboard/my-children'
        } else {
          window.location.href = '/dashboard/other-characters'
        }
      }
    } catch (err: any) {
      setError(err.message)
    } finally {
      setLoading(false)
    }
  }

  const saveMostRecentAvatar = async () => {
    if (!characterId) {
      return
    }

    try {
      // Call API to save the most recent avatar
      const response = await fetch(`/api/characters/${characterId}/save-latest-avatar`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' }
      })

      const data = await response.json()

      if (!response.ok && response.status !== 404) {
        // 404 means no new avatar to save, which is fine
        throw new Error(data.error || 'Failed to save avatar')
      }
    } catch (error) {
      console.error('Error saving avatar:', error)
      // Don't throw - avatar save is optional
    }
  }

  const linkPreviewAvatar = async (newCharacterId: string, avatarCacheId: string) => {
    try {
      const response = await fetch(`/api/avatars/link-preview`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          characterId: newCharacterId,
          avatarCacheId: avatarCacheId
        })
      })

      if (!response.ok) {
        const data = await response.json()
        throw new Error(data.error || 'Failed to link preview avatar')
      }
    } catch (error) {
      console.error('Error linking preview avatar:', error)
      // Don't throw - avatar linking is optional
    }
  }

  const handleAvatarGenerated = (newAvatarUrl: string, avatarCacheId?: string) => {
    // Store the new avatar URL as pending
    setPendingAvatarUrl(newAvatarUrl)
    if (avatarCacheId) {
      setPendingAvatarCacheId(avatarCacheId)
    }
    setHasNewAvatar(true) // Mark that a new avatar was generated in this session
  }

  const handleCancel = () => {
    // Reset form to initial values and discard pending avatar
    setFormData(initialValues)
    setPendingAvatarUrl(null)
    setHasNewAvatar(false) // Clear the flag so avatar isn't saved

    // Redirect based on character type (use window.location for full reload)
    if (characterType.category === 'child') {
      window.location.href = '/dashboard/my-children'
    } else {
      window.location.href = '/dashboard/other-characters'
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

      {/* Avatar Generation Section - Always show */}
      <div className="border-t border-neutral-200 pt-6">
        <h3 className="text-lg font-bold text-neutral-800 mb-4">Character Avatar</h3>
        <div className="max-w-sm">
          <AvatarDisplay
            characterId={characterId || initialValues?.id || undefined}
            currentAvatarUrl={pendingAvatarUrl || initialValues?.avatar_cache?.image_url || null}
            profileType={
              characterType.category === 'child'
                ? 'child'
                : characterType.id === 'pet'
                ? 'pet'
                : characterType.id === 'magical_creature'
                ? 'magical_creature'
                : 'storybook_character'
            }
            previewMode={!characterId && !isEditing}
            formData={formData}
            calculatedAge={calculatedAge}
            onAvatarGenerated={handleAvatarGenerated}
            isNew={!isEditing}
          />
        </div>
      </div>

      {/* Action Buttons */}
      <div className="flex gap-4 pt-6">
        <button
          type="submit"
          disabled={loading}
          className="px-8 py-3 bg-gradient-to-r from-blue-500 to-blue-600 text-white font-semibold rounded-xl hover:shadow-lg transition-all duration-300 disabled:opacity-50"
        >
          {loading ? 'Saving...' : isEditing ? 'Update Profile' : 'Save Profile'}
        </button>

        {isEditing && (
          <button
            type="button"
            onClick={handleCancel}
            disabled={loading}
            className="px-8 py-3 bg-neutral-200 text-neutral-700 font-semibold rounded-xl hover:bg-neutral-300 transition-all duration-300 disabled:opacity-50"
          >
            Cancel
          </button>
        )}

        {showAvatarGenerator && characterId && (
          <button
            type="button"
            onClick={() => {
              // Redirect after avatar generation
              if (characterType.category === 'child') {
                router.push('/dashboard/my-children')
              } else {
                router.push('/dashboard/other-characters')
              }
            }}
            className="px-8 py-3 bg-gradient-to-r from-green-500 to-green-600 text-white font-semibold rounded-xl hover:shadow-lg transition-all duration-300"
          >
            Continue to Dashboard
          </button>
        )}
      </div>
    </form>
  )
}