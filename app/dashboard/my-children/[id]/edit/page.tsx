import { createClient } from '@/lib/supabase/server'
import { redirect, notFound } from 'next/navigation'
import { getCharacterTypeById } from '@/lib/character-types'
import EditChildForm from './EditChildForm'
import Link from 'next/link'
import { ArrowLeft } from 'lucide-react'

interface EditChildPageProps {
  params: {
    id: string
  }
}

export default async function EditChildPage({ params }: EditChildPageProps) {
  const supabase = await createClient()

  // Get authenticated user
  const {
    data: { user },
  } = await supabase.auth.getUser()

  if (!user) {
    redirect('/auth/login')
  }

  // Fetch the child profile
  const { data: childProfile, error } = await supabase
    .from('character_profiles')
    .select('*')
    .eq('id', params.id)
    .eq('user_id', user.id)
    .eq('character_type', 'child')
    .is('deleted_at', null)
    .single()

  if (error || !childProfile) {
    notFound()
  }

  // Manually fetch avatar if it exists
  if (childProfile.avatar_cache_id) {
    const { data: avatar } = await supabase
      .from('avatar_cache')
      .select('image_url')
      .eq('id', childProfile.avatar_cache_id)
      .single()

    childProfile.avatar_cache = avatar
  }

  const childType = getCharacterTypeById('child')

  if (!childType) {
    return (
      <div className="min-h-screen bg-gradient-to-br from-blue-50 to-purple-50 p-6">
        <div className="max-w-2xl mx-auto">
          <p className="text-red-600">Configuration error: Child character type not found</p>
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
            href="/dashboard/my-children"
            className="inline-flex items-center gap-2 text-blue-600 hover:text-blue-700 font-medium mb-4"
          >
            <ArrowLeft className="w-4 h-4" />
            Back to My Children
          </Link>

          <div className="bg-white rounded-2xl shadow-lg p-8">
            <h1 className="text-3xl font-bold text-neutral-900 mb-2">
              Edit {childProfile.name}'s Profile
            </h1>
            <p className="text-neutral-600">
              Update your child's profile information
            </p>
          </div>
        </div>

        {/* Form */}
        <div className="bg-white rounded-2xl shadow-lg p-8">
          <EditChildForm
            characterType={childType}
            childProfile={childProfile}
          />
        </div>
      </div>
    </div>
  )
}
