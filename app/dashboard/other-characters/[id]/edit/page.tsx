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
      <div className="min-h-screen bg-gray-50 flex items-center justify-center p-4 sm:p-6">
        <div className="card p-6 md:p-8 max-w-md">
          <p className="text-red-600 font-medium text-center">Configuration error: Character type not found</p>
        </div>
      </div>
    )
  }

  return (
    <div className="min-h-screen bg-gray-50">
      <div className="max-w-3xl mx-auto px-4 sm:px-6 py-6 md:py-8 pt-16 md:pt-20">
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
              Edit {characterProfile.name}'s Profile
            </h1>
            <p className="text-base md:text-lg text-gray-600">
              Update this character's profile information
            </p>
          </div>
        </div>

        {/* Form */}
        <div className="card p-6 md:p-8">
          <EditOtherCharacterForm
            characterType={characterType}
            characterProfile={characterProfile}
          />
        </div>
      </div>
    </div>
  )
}
