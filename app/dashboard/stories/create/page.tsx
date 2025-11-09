'use client'

import { useState, useEffect } from 'react'
import { createClient } from '@/lib/supabase/client'
import { useRouter } from 'next/navigation'
import Link from 'next/link'
import { ArrowLeft, Sparkles, Loader2 } from 'lucide-react'
import StoryGenerationForm from '@/components/forms/StoryGenerationForm'

interface CharacterProfile {
  id: string
  name: string
  character_type: string
  avatar_cache?: {
    image_url: string
  }
}

export default function CreateStoryPage() {
  const router = useRouter()
  const supabase = createClient()
  const [loading, setLoading] = useState(true)
  const [error, setError] = useState<string | null>(null)
  const [childProfiles, setChildProfiles] = useState<CharacterProfile[]>([])

  useEffect(() => {
    loadChildProfiles()
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [])

  const loadChildProfiles = async () => {
    try {
      const { data: { user } } = await supabase.auth.getUser()
      if (!user) {
        router.push('/auth/login')
        return
      }

      // Fetch all user's character profiles (children, pets, storybook characters, magical creatures)
      const { data, error } = await supabase
        .from('character_profiles')
        .select(`
          id,
          name,
          character_type,
          avatar_cache:avatar_cache_id (
            image_url
          )
        `)
        .eq('user_id', user.id)
        .is('deleted_at', null)
        .order('created_at', { ascending: false })

      if (error) throw error

      // Check if user has at least one child character (required for hero)
      const hasChildren = data && data.some(profile => profile.character_type === 'child')

      if (!hasChildren) {
        setError('no-children')
      } else {
        setChildProfiles(data)
      }
    } catch (err: any) {
      console.error('Error loading child profiles:', err)
      setError(err.message)
    } finally {
      setLoading(false)
    }
  }

  if (loading) {
    return (
      <div className="min-h-screen bg-gray-50 flex items-center justify-center p-4">
        <div className="text-center">
          <Loader2 className="w-8 h-8 animate-spin text-primary-600 mx-auto mb-4" />
          <p className="text-gray-600">Loading...</p>
        </div>
      </div>
    )
  }

  if (error === 'no-children') {
    return (
      <div className="min-h-screen bg-gray-50">
        <div className="max-w-3xl mx-auto px-4 sm:px-6 py-4 md:py-6 pt-18">
          <Link
            href="/dashboard/story-library"
            className="inline-flex items-center gap-2 text-primary-600 active:text-primary-700 md:hover:text-primary-700 font-semibold mb-4 md:mb-6 min-h-[44px] transition-colors"
          >
            <ArrowLeft className="w-4 h-4 md:w-5 md:h-5" />
            Back to Story Library
          </Link>

          <div className="card p-6 md:p-8 text-center">
            <Sparkles className="w-12 h-12 text-gray-400 mx-auto mb-4" />
            <h1 className="text-2xl font-display font-bold text-gray-900 mb-2">
              Create a Child Profile First
            </h1>
            <p className="text-gray-600 mb-6">
              You need to create at least one child profile before generating stories.
            </p>
            <Link
              href="/dashboard/my-children/create"
              className="btn-primary inline-flex items-center gap-2"
            >
              <Sparkles className="w-4 h-4" />
              Create Child Profile
            </Link>
          </div>
        </div>
      </div>
    )
  }

  if (error) {
    return (
      <div className="min-h-screen bg-gray-50 flex items-center justify-center p-4">
        <div className="card p-6 md:p-8 max-w-md text-center">
          <p className="text-red-600 font-medium">Error: {error}</p>
          <button
            onClick={() => router.back()}
            className="btn-secondary mt-4"
          >
            Go Back
          </button>
        </div>
      </div>
    )
  }

  return (
    <div className="min-h-screen bg-gray-50">
      <div className="max-w-3xl mx-auto px-4 sm:px-6 py-4 md:py-6 pt-18">
        {/* Header */}
        <div className="mb-4 md:mb-6">
          <Link
            href="/dashboard/story-library"
            className="inline-flex items-center gap-2 text-primary-600 active:text-primary-700 md:hover:text-primary-700 font-semibold mb-4 md:mb-6 min-h-[44px] transition-colors"
          >
            <ArrowLeft className="w-4 h-4 md:w-5 md:h-5" />
            Back to Story Library
          </Link>

          <div className="card p-6 md:p-8">
            <div className="flex items-start gap-3">
              <Sparkles className="w-8 h-8 text-primary-600 flex-shrink-0 mt-1" />
              <div>
                <h1 className="text-2xl sm:text-3xl md:text-4xl font-display font-bold text-gray-900 mb-2">
                  Create a New Story
                </h1>
                <p className="text-base md:text-lg text-gray-600">
                  Generate a personalized story for your child
                </p>
              </div>
            </div>
          </div>
        </div>

        {/* Form */}
        <div className="card p-6 md:p-8">
          <StoryGenerationForm childProfiles={childProfiles} />
        </div>
      </div>
    </div>
  )
}
