'use client'

import { useState } from 'react'
import { CharacterTypeConfig } from '@/lib/character-types'
import FieldRenderer from './fields/FieldRenderer'
import { useRouter, useSearchParams } from 'next/navigation'
import { AvatarDisplay } from '@/components/AvatarDisplay'

interface DynamicCharacterFormProps {
  characterType: CharacterTypeConfig
  initialValues?: Record<string, any>
  isEditing?: boolean
  onSubmit?: (data: any) => Promise<void | any>
  onAvatarGenerated?: (avatarUrl: string, avatarCacheId?: string) => void
}

export default function DynamicCharacterForm({
  characterType,
  initialValues = {},
  isEditing = false,
  onSubmit,
  onAvatarGenerated
}: DynamicCharacterFormProps) {
  const [formData, setFormData] = useState<Record<string, any>>(initialValues)
  const [loading, setLoading] = useState(false)
  const [error, setError] = useState<string | null>(null)
  const [avatarSaving, setAvatarSaving] = useState(false)
  const [calculatedAge, setCalculatedAge] = useState<number | null>(null)
  const [characterId, setCharacterId] = useState<string | null>(initialValues?.id || null)
  const [showAvatarGenerator, setShowAvatarGenerator] = useState(false)
  const [pendingAvatarUrl, setPendingAvatarUrl] = useState<string | null>(null)
  const [pendingAvatarCacheId, setPendingAvatarCacheId] = useState<string | null>(null) // Store preview avatar cache ID
  const [hasNewAvatar, setHasNewAvatar] = useState(false) // Track if avatar was generated in this session
  const router = useRouter()
  const searchParams = useSearchParams()
  const returnTo = searchParams.get('returnTo')

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

      let finalCharacterId: string | null = characterId
      let shouldRedirectAfterAvatar = false

      if (onSubmit) {
        // Custom onSubmit may return the created character data
        const result = await onSubmit(submitData)
        if (result && result.id) {
          finalCharacterId = result.id
          setCharacterId(result.id)
          // Check if the custom handler wants us to redirect after avatar linking
          shouldRedirectAfterAvatar = result.shouldRedirect === true
        }
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

        // If creating new character, store the ID
        if (!isEditing && responseData.id) {
          finalCharacterId = responseData.id
          setCharacterId(responseData.id)
        }
      }

      // Save/link avatar AFTER character is created/updated (for both new and edited profiles)
      console.log('Avatar linking check:', {
        hasNewAvatar,
        pendingAvatarCacheId,
        finalCharacterId,
        willLinkAvatar: hasNewAvatar && pendingAvatarCacheId && finalCharacterId
      })

      if (hasNewAvatar && pendingAvatarCacheId && finalCharacterId) {
        setAvatarSaving(true)
        console.log('Calling linkPreviewAvatar with:', { finalCharacterId, pendingAvatarCacheId })
        try {
          await linkPreviewAvatar(finalCharacterId, pendingAvatarCacheId)
        } catch (avatarError: any) {
          // Log the error but don't fail the entire form submission
          console.error('Failed to save avatar:', avatarError)
          setError('Profile saved, but avatar failed to save. Please try regenerating the avatar.')
          setAvatarSaving(false)
          setLoading(false)
          return // Don't redirect if avatar save failed
        }
        setAvatarSaving(false)
      }

      // Handle redirects after everything is saved
      // If shouldRedirectAfterAvatar is true, redirect now (onboarding flow)
      // Otherwise, only redirect if no custom onSubmit was provided
      if (shouldRedirectAfterAvatar) {
        // For onboarding, add a small delay then redirect to pricing page for trial offer
        // The delay ensures the database has time to commit the avatar link
        setTimeout(() => {
          window.location.href = '/onboarding/pricing'
        }, 500)
      } else if (!onSubmit && !showAvatarGenerator) {
        // For regular profile creation, redirect to the appropriate section
        // Add small delay here too to ensure avatar is committed
        setTimeout(() => {
          if (characterType.category === 'child') {
            window.location.href = '/dashboard/my-children'
          } else {
            window.location.href = '/dashboard/other-characters'
          }
        }, 500)
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
      // If there's a pending avatar from preview generation, link it
      if (pendingAvatarCacheId) {
        await linkPreviewAvatar(characterId, pendingAvatarCacheId)
        return
      }

      // Otherwise, find and save the most recent avatar
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
    console.log('linkPreviewAvatar: Sending request to link-preview endpoint')
    try {
      const response = await fetch(`/api/avatars/link-preview`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          characterId: newCharacterId,
          avatarCacheId: avatarCacheId
        })
      })

      console.log('linkPreviewAvatar: Response status:', response.status)

      if (!response.ok) {
        const data = await response.json()
        console.error('linkPreviewAvatar: Error response:', data)
        throw new Error(data.error || 'Failed to link preview avatar')
      }

      const data = await response.json()
      console.log('linkPreviewAvatar: Success response:', data)
      return data
    } catch (error) {
      console.error('linkPreviewAvatar: Caught error:', error)
      throw error
    }
  }

  const handleAvatarGenerated = (newAvatarUrl: string, avatarCacheId?: string) => {
    // Store the new avatar URL as pending
    setPendingAvatarUrl(newAvatarUrl)
    if (avatarCacheId) {
      setPendingAvatarCacheId(avatarCacheId)
    }
    setHasNewAvatar(true) // Mark that a new avatar was generated in this session

    // Call parent's callback if provided
    if (onAvatarGenerated) {
      onAvatarGenerated(newAvatarUrl, avatarCacheId)
    }
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
        <h3 className="text-lg font-bold text-neutral-800 mb-4 text-center">Character Avatar</h3>
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

      {/* Action Buttons */}
      <div className="flex gap-4 pt-6">
        <button
          type="submit"
          disabled={loading || avatarSaving}
          className="flex-[3] px-8 py-3 bg-gradient-to-r from-blue-500 to-blue-600 text-white font-semibold rounded-xl hover:shadow-lg transition-all duration-300 disabled:opacity-50"
        >
          {avatarSaving ? 'Saving avatar...' : loading ? 'Saving profile...' : isEditing ? 'Update Profile' : 'Create Profile'}
        </button>

        <button
          type="button"
          onClick={handleCancel}
          disabled={loading || avatarSaving}
          className="flex-[1] px-8 py-3 bg-neutral-200 text-neutral-700 font-semibold rounded-xl hover:bg-neutral-300 transition-all duration-300 disabled:opacity-50"
        >
          Cancel
        </button>

        {showAvatarGenerator && characterId && (
          <button
            type="button"
            onClick={() => {
              // Redirect after avatar generation - use returnTo if provided
              if (returnTo) {
                router.push(returnTo)
              } else if (characterType.category === 'child') {
                router.push('/dashboard/my-children')
              } else {
                router.push('/dashboard/other-characters')
              }
            }}
            className="px-8 py-3 bg-gradient-to-r from-green-500 to-green-600 text-white font-semibold rounded-xl hover:shadow-lg transition-all duration-300"
          >
            {returnTo ? 'Done' : 'Continue to Dashboard'}
          </button>
        )}
      </div>
    </form>
  )
}