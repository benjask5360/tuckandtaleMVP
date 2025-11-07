'use client'

import { CharacterTypeConfig } from '@/lib/character-types'
import DynamicCharacterForm from '@/components/forms/DynamicCharacterForm'
import { useRouter } from 'next/navigation'
import { useState } from 'react'

interface EditOtherCharacterFormProps {
  characterType: CharacterTypeConfig
  characterProfile: any
}

export default function EditOtherCharacterForm({ characterType, characterProfile }: EditOtherCharacterFormProps) {
  const router = useRouter()
  const [error, setError] = useState<string | null>(null)

  // Prepare initial values from the character profile
  const initialValues = {
    id: characterProfile.id,
    name: characterProfile.name,
    avatar_cache: characterProfile.avatar_cache,
    ...characterProfile.attributes
  }

  const handleSubmit = async (data: any) => {
    try {
      const response = await fetch(`/api/characters/${characterProfile.id}/update`, {
        method: 'PUT',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(data)
      })

      if (!response.ok) {
        const errorData = await response.json()
        throw new Error(errorData.error || 'Failed to update profile')
      }

      router.push('/dashboard/other-characters')
      router.refresh()
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
        characterType={characterType}
        initialValues={initialValues}
        isEditing={true}
        onSubmit={handleSubmit}
      />
    </>
  )
}
