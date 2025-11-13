'use client'

import { useState, useEffect } from 'react'
import { createClient } from '@/lib/supabase/client'
import { useRouter } from 'next/navigation'
import Link from 'next/link'
import Image from 'next/image'
import { ArrowLeft, Heart, Sparkles, Loader2, Target } from 'lucide-react'
import type { StoryIllustration } from '@/lib/types/story-types'

interface Story {
  id: string
  title: string
  body: string
  created_at: string
  is_favorite: boolean
  story_illustrations?: StoryIllustration[]
  generation_metadata: {
    mode: 'fun' | 'growth'
    genre_display: string
    tone_display: string
    length_display: string
    growth_topic_display?: string
    moral?: string
    paragraphs: string[]
  }
  content_characters: Array<{
    character_profiles: {
      id: string
      name: string
      avatar_url?: string
    }
  }>
}

export default function StoryViewerPage({ params }: { params: { id: string } }) {
  const router = useRouter()
  const supabase = createClient()
  const [story, setStory] = useState<Story | null>(null)
  const [loading, setLoading] = useState(true)
  const [error, setError] = useState<string | null>(null)

  useEffect(() => {
    loadStory()
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [params.id])

  const loadStory = async () => {
    try {
      const { data: { user } } = await supabase.auth.getUser()
      if (!user) {
        router.push('/auth/login')
        return
      }

      const response = await fetch(`/api/stories/${params.id}`)
      const data = await response.json()

      if (!response.ok) {
        throw new Error(data.error || 'Failed to load story')
      }

      setStory(data.story)
    } catch (err: any) {
      console.error('Error loading story:', err)
      setError(err.message)
    } finally {
      setLoading(false)
    }
  }

  const handleFavorite = async () => {
    if (!story) return

    try {
      const newFavoriteStatus = !story.is_favorite

      const response = await fetch(`/api/stories/${params.id}/favorite`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ is_favorite: newFavoriteStatus }),
      })

      if (!response.ok) {
        throw new Error('Failed to update favorite status')
      }

      setStory({ ...story, is_favorite: newFavoriteStatus })
    } catch (err: any) {
      console.error('Error updating favorite:', err)
      alert(err.message)
    }
  }

  if (loading) {
    return (
      <div className="min-h-screen bg-gray-50 flex items-center justify-center p-4">
        <div className="text-center">
          <Loader2 className="w-8 h-8 animate-spin text-primary-600 mx-auto mb-4" />
          <p className="text-gray-600">Loading story...</p>
        </div>
      </div>
    )
  }

  if (error || !story) {
    return (
      <div className="min-h-screen bg-gray-50 flex items-center justify-center p-4">
        <div className="card p-6 md:p-8 max-w-md text-center">
          <p className="text-red-600 font-medium mb-4">
            {error || 'Story not found'}
          </p>
          <Link href="/dashboard/story-library" className="btn-primary">
            Back to Library
          </Link>
        </div>
      </div>
    )
  }

  const paragraphs = story.generation_metadata?.paragraphs || story.body.split('\n\n')

  // Helper function to get illustration for a specific scene
  const getSceneIllustration = (sceneNumber: number): StoryIllustration | undefined => {
    if (!story.story_illustrations) return undefined
    return story.story_illustrations.find(ill => ill.type === `scene_${sceneNumber}`)
  }

  // Get cover illustration (Scene 0)
  const coverIllustration = getSceneIllustration(0)

  return (
    <div className="min-h-screen bg-gray-50">
      <div className="max-w-4xl mx-auto px-4 sm:px-6 py-4 md:py-6">
        {/* Header */}
        <div className="mb-6 md:mb-8">
          <Link
            href="/dashboard/story-library"
            className="inline-flex items-center gap-2 text-primary-600 active:text-primary-700 md:hover:text-primary-700 font-semibold mb-6 md:mb-8 min-h-[44px] transition-colors"
          >
            <ArrowLeft className="w-4 h-4 md:w-5 md:h-5" />
            Back to Story Library
          </Link>

          {/* Story Metadata Card */}
          <div className="card p-6 md:p-8">
            {/* Title and Favorite */}
            <div className="flex items-start justify-between gap-4 mb-3">
              <h1 className="text-2xl sm:text-3xl md:text-4xl font-display font-bold text-gray-800 text-center flex-1">
                {story.title}
              </h1>
              <button
                onClick={handleFavorite}
                className="p-2 text-gray-400 hover:text-red-500 hover:bg-red-50 rounded-lg transition-colors flex-shrink-0"
                title={story.is_favorite ? 'Remove from favorites' : 'Add to favorites'}
              >
                <Heart
                  className={`w-5 h-5 ${
                    story.is_favorite
                      ? 'fill-red-500 text-red-500'
                      : ''
                  }`}
                />
              </button>
            </div>

            {/* Metadata Line: Mode • Character • Date */}
            <div className="flex flex-wrap items-center justify-center gap-2 text-sm text-gray-500 mb-6">
              <span className="inline-flex items-center gap-1 text-xs px-2 py-1 rounded-full bg-gray-100 text-gray-600 border border-gray-200">
                {story.generation_metadata?.mode === 'growth' ? (
                  <>
                    <Target className="w-3 h-3" />
                    Growth
                  </>
                ) : (
                  <>
                    <Sparkles className="w-3 h-3" />
                    Fun
                  </>
                )}
              </span>
              {story.content_characters && story.content_characters.length > 0 && (
                <>
                  <span className="text-gray-400">•</span>
                  <span className="font-medium text-gray-700">
                    {story.content_characters[0].character_profiles.name}
                  </span>
                </>
              )}
              <span className="text-gray-400">•</span>
              <span>{new Date(story.created_at).toLocaleDateString('en-US', {
                month: 'short',
                day: 'numeric',
                year: 'numeric'
              })}</span>
            </div>

            {/* Subtle Divider */}
            <div className="border-t border-gray-200 mb-6"></div>

            {/* Cover Image (Scene 0) */}
            {coverIllustration && (
              <div className="relative w-full max-w-2xl mx-auto rounded-2xl overflow-hidden bg-white shadow-md">
                <Image
                  src={coverIllustration.url}
                  alt="Story Cover"
                  width={512}
                  height={512}
                  className="w-full h-auto object-contain"
                  priority
                />
              </div>
            )}

            {/* Starring Row - Clean Avatar Line */}
            {story.content_characters && story.content_characters.length > 0 && (
              <div className="mt-6 flex items-center justify-center gap-2 flex-wrap">
                <span className="text-sm text-gray-600">Starring:</span>
                {story.content_characters.map((cc, idx) => (
                  <div key={idx} className="flex items-center gap-2">
                    {cc.character_profiles.avatar_url && (
                      <img
                        src={cc.character_profiles.avatar_url}
                        alt={cc.character_profiles.name}
                        className="w-6 h-6 rounded-full border border-gray-200"
                      />
                    )}
                    <span className="text-sm font-medium text-gray-700">
                      {cc.character_profiles.name}
                    </span>
                    {idx < story.content_characters.length - 1 && (
                      <span className="text-gray-400">•</span>
                    )}
                  </div>
                ))}
              </div>
            )}
          </div>
        </div>

        {/* Story Content */}
        <div className="card p-6 md:p-8 lg:p-12">
          <div className="max-w-none">
            {paragraphs.map((paragraph, index) => {
              // Get scene illustration for this paragraph (scenes 1-8 map to paragraphs 0-7)
              const sceneIllustration = getSceneIllustration(index + 1)

              return (
                <div key={index}>
                  {/* Scene Illustration above paragraph */}
                  {sceneIllustration && (
                    <div className="mt-8 mb-6 relative w-full max-w-2xl mx-auto rounded-2xl overflow-hidden bg-white shadow-md">
                      <Image
                        src={sceneIllustration.url}
                        alt={`Scene ${index + 1}`}
                        width={512}
                        height={512}
                        className="w-full h-auto object-contain"
                        loading="lazy"
                      />
                    </div>
                  )}

                  {/* Paragraph text */}
                  <p className="text-gray-800 leading-relaxed mb-6 text-base md:text-lg" style={{ lineHeight: '1.8' }}>
                    {paragraph}
                  </p>
                </div>
              )
            })}

            {/* What We Learned / Moral Section */}
            {story.generation_metadata?.moral && (
              <div className="mt-12 mb-8 p-6 md:p-8 bg-primary-50 rounded-2xl border border-primary-200">
                <div className="flex items-start gap-3">
                  <Heart className="w-5 h-5 text-primary-600 flex-shrink-0 mt-1" />
                  <div>
                    <h3 className="font-bold text-lg text-primary-900 mb-3">
                      {story.generation_metadata.mode === 'growth' ? 'What We Learned' : 'The Moral of the Story'}
                    </h3>
                    <p className="text-primary-800 text-base md:text-lg leading-relaxed">
                      {story.generation_metadata.moral}
                    </p>
                  </div>
                </div>
              </div>
            )}
          </div>

          {/* Story Info Footer */}
          <div className="mt-8 pt-6 border-t border-gray-200">
            <div className="flex flex-wrap gap-4 text-sm text-gray-600">
              <div>
                <span className="font-medium">Created:</span>{' '}
                {new Date(story.created_at).toLocaleDateString()}
              </div>
              {story.generation_metadata?.length_display && (
                <div>
                  <span className="font-medium">Length:</span>{' '}
                  {story.generation_metadata.length_display}
                </div>
              )}
              {story.generation_metadata?.tone_display && (
                <div>
                  <span className="font-medium">Style:</span>{' '}
                  {story.generation_metadata.tone_display}
                </div>
              )}
              {story.generation_metadata?.growth_topic_display && (
                <div>
                  <span className="font-medium">Topic:</span>{' '}
                  {story.generation_metadata.growth_topic_display}
                </div>
              )}
            </div>
          </div>
        </div>
      </div>
    </div>
  )
}
