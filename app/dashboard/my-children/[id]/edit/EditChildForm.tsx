'use client'

import { CharacterTypeConfig } from '@/lib/character-types'
import DynamicCharacterForm from '@/components/forms/DynamicCharacterForm'
import { useRouter } from 'next/navigation'
import { useState } from 'react'

interface EditChildFormProps {
  characterType: CharacterTypeConfig
  childProfile: any
}

export default function EditChildForm({ characterType, childProfile }: EditChildFormProps) {
  const router = useRouter()
  const [error, setError] = useState<string | null>(null)

  // Prepare initial values from the child profile
  const initialValues = {
    id: childProfile.id,
    name: childProfile.name,
    avatar_cache: childProfile.avatar_cache,
    ...childProfile.attributes
  }

  // Extract base URL without query params for key
  const avatarKeyUrl = childProfile.avatar_cache?.image_url?.split('?')[0] || childProfile.id

  const handleSubmit = async (data: any) => {
    try {
      const response = await fetch(`/api/characters/${childProfile.id}/update`, {
        method: 'PUT',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(data)
      })

      if (!response.ok) {
        const errorData = await response.json()
        throw new Error(errorData.error || 'Failed to update profile')
      }

      // Use window.location.href for full page reload to ensure fresh data
      window.location.href = '/dashboard/my-children'
    } catch (err: any) {
      setError(err.message)
      throw err
    }
  }

  return (
    <>
      {error && (
        <div className="bg-red-50 border border-red-200 text-red-800 px-4 py-3 rounded-lg text-sm mb-6">
          {error}
        </div>
      )}
      <DynamicCharacterForm
        key={avatarKeyUrl}
        characterType={characterType}
        initialValues={initialValues}
        isEditing={true}
        onSubmit={handleSubmit}
      />
    </>
  )
}
