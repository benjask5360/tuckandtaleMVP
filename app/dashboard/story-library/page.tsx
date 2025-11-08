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
  character_profiles?: {
    name: string
  } | null
}

export default function StoryLibraryPage() {
  const [stories, setStories] = useState<Story[]>([])
  const [loading, setLoading] = useState(true)
  const [error, setError] = useState<string | null>(null)
  const router = useRouter()
  const supabase = createClient()

  useEffect(() => {
    loadStories()
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
          character_profiles (
            name
          )
        `)
        .eq('user_id', user.id)
        .order('created_at', { ascending: false })

      if (error) throw error

      setStories(data || [])
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
    <div className="min-h-screen bg-white p-6">
      <div className="max-w-6xl mx-auto">
        {/* Header */}
        <div className="mb-8">
          <Link
            href="/dashboard"
            className="inline-flex items-center gap-2 text-blue-600 hover:text-blue-700 font-medium mb-4"
          >
            ← Back to Dashboard
          </Link>

          <div className="bg-white rounded-2xl shadow-lg p-8">
            <div className="flex justify-between items-center">
              <div>
                <h1 className="text-3xl font-bold text-neutral-900 mb-2">
                  Story Library
                </h1>
                <p className="text-neutral-600">
                  Your collection of personalized bedtime stories
                </p>
              </div>
              <div className="text-right">
                <p className="text-sm text-neutral-500 mb-2">
                  {stories.length} {stories.length === 1 ? 'story' : 'stories'} created
                </p>
              </div>
            </div>
          </div>
        </div>

        {/* Error Message */}
        {error && (
          <div className="bg-red-50 border border-red-200 text-red-800 px-4 py-3 rounded-lg text-sm mb-6">
            {error}
          </div>
        )}

        {/* Stories Grid */}
        {stories.length === 0 ? (
          <div className="bg-white rounded-2xl shadow-lg p-12 text-center">
            <BookOpen className="w-16 h-16 text-neutral-300 mx-auto mb-4" />
            <h3 className="text-xl font-semibold text-neutral-700 mb-2">No stories yet</h3>
            <p className="text-neutral-500 mb-6">Start creating magical bedtime stories for your children</p>
            <Link
              href="/dashboard"
              className="inline-flex items-center gap-2 px-6 py-3 bg-gradient-to-r from-green-500 to-teal-500 text-white font-semibold rounded-xl hover:shadow-lg transition-all duration-300"
            >
              <Sparkles className="w-5 h-5" />
              Create Your First Story
            </Link>
          </div>
        ) : (
          <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
            {stories.map(story => (
              <div key={story.id} className="bg-white rounded-xl shadow-lg hover:shadow-xl transition-shadow duration-300">
                <div className="p-6">
                  {/* Story Icon */}
                  <div className="w-16 h-16 mx-auto mb-4 flex items-center justify-center bg-gradient-to-br from-green-200 to-teal-200 rounded-full">
                    <BookOpen className="w-8 h-8 text-green-700" />
                  </div>

                  {/* Title */}
                  <div className="text-center mb-3">
                    <h3 className="text-xl font-bold text-neutral-800 mb-1">
                      {story.title}
                    </h3>
                    {story.character_profiles && (
                      <p className="text-sm text-neutral-500">
                        Featuring {story.character_profiles.name}
                      </p>
                    )}
                  </div>

                  {/* Details */}
                  <div className="space-y-2 text-sm text-neutral-600 mb-4">
                    <div className="flex items-center gap-2 justify-center">
                      <Calendar className="w-4 h-4" />
                      <span>{formatDate(story.created_at)}</span>
                    </div>
                    {story.content && (
                      <p className="text-neutral-500 text-xs line-clamp-3">
                        {story.content.substring(0, 150)}...
                      </p>
                    )}
                  </div>

                  {/* Actions */}
                  <div className="flex gap-2">
                    <Link
                      href={`/dashboard/story-library/${story.id}`}
                      className="flex-1 flex items-center justify-center gap-2 px-4 py-2 bg-green-50 text-green-600 font-medium rounded-lg hover:bg-green-100 transition-colors"
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
      <footer className="py-8 bg-white border-t border-neutral-200 mt-16">
        <div className="max-w-6xl mx-auto px-6">
          <div className="flex flex-col items-center gap-4 text-sm text-neutral-600">
            <p className="flex items-center gap-1 text-primary-500">
              Made with <Heart className="w-4 h-4 fill-red-500 text-red-500" /> for little dreamers everywhere
            </p>
            <div className="flex flex-col md:flex-row justify-between items-center w-full gap-4">
              <p className="text-center md:text-left">© 2024 Tuck and Tale™. All rights reserved.</p>
              <nav className="grid grid-cols-2 sm:grid-cols-3 md:flex md:flex-row gap-x-6 gap-y-3 text-center md:text-left">
                <a href="#" className="hover:text-primary-500 transition-colors">About</a>
                <a href="#" className="hover:text-primary-500 transition-colors">Contact Us</a>
                <a href="#" className="hover:text-primary-500 transition-colors">FAQ</a>
                <a href="#" className="hover:text-primary-500 transition-colors">Founder Parents</a>
                <a href="#" className="hover:text-primary-500 transition-colors">Privacy Policy</a>
                <a href="#" className="hover:text-primary-500 transition-colors">Terms of Service</a>
              </nav>
            </div>
          </div>
        </div>
      </footer>
    </div>
  )
}
