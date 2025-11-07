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

      router.push('/dashboard/my-children')
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
