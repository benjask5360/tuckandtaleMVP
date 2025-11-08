'use client'

import { useState, useEffect } from 'react'
import Link from 'next/link'
import { createClient } from '@/lib/supabase/client'
import { BookOpen, Calendar, Heart, Sparkles } from 'lucide-react'
import { useRouter } from 'next/navigation'

interface Story {
  id: string
  title: string
  content: string
  created_at: string
  character_name?: string | null
}

export default function StoryLibraryPage() {
  const [stories, setStories] = useState<Story[]>([])
  const [loading, setLoading] = useState(true)
  const [error, setError] = useState<string | null>(null)
  const router = useRouter()
  const supabase = createClient()

  useEffect(() => {
    loadStories()
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [])

  const loadStories = async () => {
    try {
      const { data: { user } } = await supabase.auth.getUser()
      if (!user) {
        router.push('/auth/login')
        return
      }

      const { data, error } = await supabase
        .from('stories')
        .select(`
          id,
          title,
          content,
          created_at,
          character_id
        `)
        .eq('user_id', user.id)
        .order('created_at', { ascending: false })

      if (error) throw error

      // Fetch character names for stories that have a character_id
      const storiesWithCharacterNames = await Promise.all(
        (data || []).map(async (story) => {
          if (story.character_id) {
            const { data: character } = await supabase
              .from('character_profiles')
              .select('name')
              .eq('id', story.character_id)
              .single()

            return {
              id: story.id,
              title: story.title,
              content: story.content,
              created_at: story.created_at,
              character_name: character?.name || null
            }
          }
          return {
            id: story.id,
            title: story.title,
            content: story.content,
            created_at: story.created_at,
            character_name: null
          }
        })
      )

      setStories(storiesWithCharacterNames)
    } catch (err: any) {
      setError(err.message)
    } finally {
      setLoading(false)
    }
  }

  const formatDate = (dateString: string) => {
    const date = new Date(dateString)
    return date.toLocaleDateString('en-US', {
      year: 'numeric',
      month: 'long',
      day: 'numeric'
    })
  }

  if (loading) {
    return (
      <div className="min-h-screen bg-white p-6">
        <div className="max-w-6xl mx-auto">
          <p className="text-neutral-600">Loading...</p>
        </div>
      </div>
    )
  }

  return (
    <div className="min-h-screen bg-gray-50">
      <div className="max-w-7xl mx-auto px-4 sm:px-6 py-6 md:py-8 pt-20 md:pt-24">
        {/* Header */}
        <div className="mb-6 md:mb-8">
          <Link
            href="/dashboard"
            className="inline-flex items-center gap-2 text-primary-600 active:text-primary-700 md:hover:text-primary-700 font-semibold mb-4 md:mb-6 min-h-[44px] transition-colors"
          >
            ← Back to Dashboard
          </Link>

          <div className="card p-6 md:p-8">
            <div className="flex flex-col md:flex-row md:justify-between md:items-center gap-4 md:gap-6">
              <div className="text-center md:text-left">
                <h1 className="text-3xl sm:text-4xl md:text-5xl font-display font-bold text-gray-900 mb-2">
                  Story Library
                </h1>
                <p className="text-base md:text-lg text-gray-600">
                  Your collection of personalized bedtime stories
                </p>
              </div>
              <div className="text-center md:text-right flex-shrink-0">
                <p className="text-sm md:text-base text-gray-500">
                  {stories.length} {stories.length === 1 ? 'story' : 'stories'} created
                </p>
              </div>
            </div>
          </div>
        </div>

        {/* Error Message */}
        {error && (
          <div className="bg-red-50 border-2 border-red-200 text-red-700 px-5 py-4 rounded-2xl text-sm font-medium mb-6 md:mb-8">
            {error}
          </div>
        )}

        {/* Stories Grid */}
        {stories.length === 0 ? (
          <div className="card p-8 md:p-12 text-center">
            <BookOpen className="w-14 h-14 md:w-16 md:h-16 text-gray-300 mx-auto mb-4 md:mb-6" />
            <h3 className="text-xl md:text-2xl font-bold text-gray-700 mb-2 md:mb-3">No stories yet</h3>
            <p className="text-base md:text-lg text-gray-500 mb-6 md:mb-8">Start creating magical bedtime stories for your children</p>
            <Link
              href="/dashboard"
              className="btn-teal btn-md inline-flex items-center gap-2"
            >
              <Sparkles className="w-5 h-5" />
              Create Your First Story
            </Link>
          </div>
        ) : (
          <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6 md:gap-8">
            {stories.map(story => (
              <div key={story.id} className="card p-6 md:p-8 active:shadow-card-hover active:scale-[0.98] md:hover:shadow-card-hover md:hover:-translate-y-1 transition-all duration-300">
                <div>
                  {/* Story Icon */}
                  <div className="w-16 h-16 mx-auto mb-4 flex items-center justify-center bg-gradient-to-br from-green-200 to-teal-200 rounded-full">
                    <BookOpen className="w-8 h-8 text-green-700" />
                  </div>

                  {/* Title */}
                  <div className="text-center mb-3 md:mb-4">
                    <h3 className="text-xl md:text-2xl font-bold text-gray-800 mb-1 md:mb-2">
                      {story.title}
                    </h3>
                    {story.character_name && (
                      <p className="text-sm md:text-base text-gray-500">
                        Featuring {story.character_name}
                      </p>
                    )}
                  </div>

                  {/* Details */}
                  <div className="space-y-2 text-sm md:text-base text-gray-600 mb-4 md:mb-6">
                    <div className="flex items-center gap-2 justify-center">
                      <Calendar className="w-4 h-4" />
                      <span>{formatDate(story.created_at)}</span>
                    </div>
                    {story.content && (
                      <p className="text-gray-500 text-xs md:text-sm line-clamp-3">
                        {story.content.substring(0, 150)}...
                      </p>
                    )}
                  </div>

                  {/* Actions */}
                  <div className="flex gap-2">
                    <Link
                      href={`/dashboard/story-library/${story.id}`}
                      className="flex-1 flex items-center justify-center gap-2 px-4 py-3 bg-teal-50 text-teal-600 font-semibold rounded-xl active:bg-teal-100 md:hover:bg-teal-100 transition-colors min-h-[44px]"
                    >
                      <BookOpen className="w-4 h-4" />
                      Read
                    </Link>
                  </div>
                </div>
              </div>
            ))}
          </div>
        )}
      </div>

      {/* Footer */}
      <footer className="py-12 bg-white border-t border-gray-200 mt-20">
        <div className="max-w-7xl mx-auto px-6">
          <div className="flex flex-col items-center gap-6 text-sm">
            <p className="flex items-center gap-2 text-lg text-gray-700">
              Made with <Heart className="w-5 h-5 fill-red-500 text-red-500 animate-pulse-soft" /> for little dreamers everywhere
            </p>
            <div className="flex flex-col md:flex-row justify-between items-center w-full gap-6">
              <p className="text-center md:text-left text-gray-500">© 2024 Tuck and Tale™. All rights reserved.</p>
              <nav className="grid grid-cols-2 sm:grid-cols-3 md:flex md:flex-row gap-x-8 gap-y-4 text-center md:text-left text-gray-600">
                <a href="#" className="hover:text-primary-600 transition-colors">About</a>
                <a href="#" className="hover:text-primary-600 transition-colors">Contact Us</a>
                <a href="#" className="hover:text-primary-600 transition-colors">FAQ</a>
                <a href="#" className="hover:text-primary-600 transition-colors">Founder Parents</a>
                <a href="#" className="hover:text-primary-600 transition-colors">Privacy Policy</a>
                <a href="#" className="hover:text-primary-600 transition-colors">Terms of Service</a>
              </nav>
            </div>
          </div>
        </div>
      </footer>
    </div>
  )
}
