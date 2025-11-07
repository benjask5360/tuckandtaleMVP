import { createClient } from '@/lib/supabase/server'
import { redirect, notFound } from 'next/navigation'
import { getCharacterTypeById } from '@/lib/character-types'
import EditOtherCharacterForm from './EditOtherCharacterForm'
import Link from 'next/link'
import { ArrowLeft } from 'lucide-react'

interface EditOtherCharacterPageProps {
  params: {
    id: string
  }
}

export default async function EditOtherCharacterPage({ params }: EditOtherCharacterPageProps) {
  const supabase = await createClient()

  // Get authenticated user
  const {
    data: { user },
  } = await supabase.auth.getUser()

  if (!user) {
    redirect('/auth/login')
  }

  // Fetch the character profile
  const { data: characterProfile, error } = await supabase
    .from('character_profiles')
    .select('*')
    .eq('id', params.id)
    .eq('user_id', user.id)
    .neq('character_type', 'child')
    .is('deleted_at', null)
    .single()

  if (error || !characterProfile) {
    notFound()
  }

  // Manually fetch avatar if it exists
  if (characterProfile.avatar_cache_id) {
    const { data: avatar } = await supabase
      .from('avatar_cache')
      .select('image_url')
      .eq('id', characterProfile.avatar_cache_id)
      .single()

    characterProfile.avatar_cache = avatar
  }

  const characterType = getCharacterTypeById(characterProfile.character_type)

  if (!characterType) {
    return (
      <div className="min-h-screen bg-gradient-to-br from-blue-50 to-purple-50 p-6">
        <div className="max-w-2xl mx-auto">
          <p className="text-red-600">Configuration error: Character type not found</p>
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
              Edit {characterProfile.name}'s Profile
            </h1>
            <p className="text-neutral-600">
              Update this character's profile information
            </p>
          </div>
        </div>

        {/* Form */}
        <div className="bg-white rounded-2xl shadow-lg p-8">
          <EditOtherCharacterForm
            characterType={characterType}
            characterProfile={characterProfile}
          />
        </div>
      </div>
    </div>
  )
}
