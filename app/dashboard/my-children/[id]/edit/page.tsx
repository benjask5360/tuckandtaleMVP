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

// Force dynamic rendering to always fetch fresh data
export const dynamic = 'force-dynamic'
export const revalidate = 0

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

  console.log('=== EDIT PAGE - CHARACTER PROFILE DATA ===')
  console.log('Character ID:', childProfile.id)
  console.log('Character Name:', childProfile.name)
  console.log('avatar_cache_id from character_profiles:', childProfile.avatar_cache_id)

  // Manually fetch avatar if it exists
  // Add timestamp to bust any client-side cache
  if (childProfile.avatar_cache_id) {
    const { data: avatar, error: avatarError } = await supabase
      .from('avatar_cache')
      .select('*')
      .eq('id', childProfile.avatar_cache_id)
      .single()

    console.log('Avatar fetch for ID', childProfile.avatar_cache_id, ':', {
      found: !!avatar,
      error: avatarError,
      avatar_id: avatar?.id,
      image_url: avatar?.image_url,
      is_current: avatar?.is_current,
      processing_status: avatar?.processing_status,
      created_at: avatar?.created_at
    })

    if (avatarError) {
      console.error('Error fetching avatar:', avatarError)
    }

    // Add cache-busting timestamp to the image URL
    if (avatar?.image_url) {
      childProfile.avatar_cache = {
        image_url: `${avatar.image_url}?t=${Date.now()}`
      }
      console.log('Final avatar URL with cache bust:', childProfile.avatar_cache.image_url)
    } else {
      childProfile.avatar_cache = avatar
      console.log('No avatar image_url found')
    }
  } else {
    console.log('No avatar_cache_id set on character profile')
  }

  console.log('=== END EDIT PAGE DATA ===\n')

  const childType = getCharacterTypeById('child')

  if (!childType) {
    return (
      <div className="min-h-screen bg-white flex items-center justify-center p-4 sm:p-6">
        <div className="card p-6 md:p-8 max-w-md">
          <p className="text-red-600 font-medium text-center">Configuration error: Child character type not found</p>
        </div>
      </div>
    )
  }

  return (
    <div className="min-h-screen bg-white">
      <div className="max-w-3xl mx-auto px-4 sm:px-6 py-4 md:py-6">
        {/* Header */}
        <div className="mb-4 md:mb-6">
          <Link
            href="/dashboard/my-children"
            className="inline-flex items-center gap-2 text-primary-600 active:text-primary-700 md:hover:text-primary-700 font-semibold mb-4 md:mb-6 min-h-[44px] transition-colors"
          >
            <ArrowLeft className="w-4 h-4 md:w-5 md:h-5" />
            Back to My Children
          </Link>

          <div className="card p-6 md:p-8">
            <h1 className="text-2xl sm:text-3xl md:text-4xl font-display font-bold text-gray-900 mb-2">
              Edit {childProfile.name}'s Profile
            </h1>
            <p className="text-base md:text-lg text-gray-600">
              Update your child's profile information
            </p>
          </div>
        </div>

        {/* Form */}
        <div className="card p-6 md:p-8">
          <EditChildForm
            characterType={childType}
            childProfile={childProfile}
          />
        </div>
      </div>
    </div>
  )
}
