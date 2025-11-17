'use client'

import { useState, useEffect } from 'react'
import Link from 'next/link'
import { createClient } from '@/lib/supabase/client'
import { BookOpen, Calendar, Heart, Sparkles, Target, Filter, SortAsc, Film } from 'lucide-react'
import { useRouter } from 'next/navigation'
import StoryCard from '@/components/StoryCard'
import { useSubscription } from '@/contexts/SubscriptionContext'

interface Story {
  id: string
  title: string
  body: string
  created_at: string
  is_favorite: boolean
  content_type: 'story' | 'vignette_story'
  panel_count?: number
  story_illustrations?: Array<{
    type: string
    url: string
    generated_at: string
  }>
  generation_metadata: {
    mode: 'fun' | 'growth'
    genre_display: string
    tone_display: string
    length_display: string
    growth_topic_display?: string
    moral?: string
  }
  content_characters: Array<{
    character_profiles: {
      id: string
      name: string
      avatar_cache?: {
        image_url: string
      }
    }
  }>
}

function StoryQuotaDisplay() {
  const { tier, usage, loading } = useSubscription();

  if (loading || !tier || !usage) {
    return null;
  }

  const illustratedUsed = tier.id === 'tier_free' ? usage.illustrated.lifetimeUsed : usage.illustrated.used;
  const illustratedLimit = tier.id === 'tier_free' ? usage.illustrated.lifetimeLimit : tier.illustrated_limit_month;
  const textUsed = usage.text.used;
  const textLimit = tier.text_limit_month;

  const illustratedPercentage = illustratedLimit ? Math.min(100, (illustratedUsed / illustratedLimit) * 100) : 0;
  const textPercentage = textLimit ? Math.min(100, (textUsed / textLimit) * 100) : 0;

  const getProgressColor = (percentage: number) => {
    if (percentage >= 100) return 'bg-red-500';
    if (percentage >= 80) return 'bg-yellow-500';
    return 'bg-primary-500';
  };

  const getProgressBgColor = (percentage: number) => {
    if (percentage >= 100) return 'bg-red-50';
    if (percentage >= 80) return 'bg-yellow-50';
    return 'bg-gray-50';
  };

  return (
    <div className="mb-6 pb-6 border-b border-gray-200">
      <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
        {/* Illustrated Stories */}
        <div className={`p-4 rounded-xl border-2 ${illustratedPercentage >= 80 ? 'border-yellow-200' : 'border-gray-200'} ${getProgressBgColor(illustratedPercentage)}`}>
          <div className="flex items-center gap-3 mb-3">
            <span className="text-3xl">🎨</span>
            <div className="flex-1">
              <h3 className="font-semibold text-gray-900">Illustrated Stories</h3>
              <p className="text-sm text-gray-600">
                {illustratedUsed} of {illustratedLimit || '∞'} {tier.id === 'tier_free' ? 'total' : 'this month'}
              </p>
            </div>
          </div>
          <div className="w-full bg-gray-200 rounded-full h-3 overflow-hidden">
            <div
              className={`h-full transition-all duration-500 ${getProgressColor(illustratedPercentage)}`}
              style={{ width: `${illustratedPercentage}%` }}
            />
          </div>
          {illustratedPercentage >= 80 && illustratedPercentage < 100 && (
            <p className="text-xs text-yellow-700 mt-2 font-medium">
              ⚠️ Almost there! {illustratedLimit! - illustratedUsed} left
            </p>
          )}
          {illustratedPercentage >= 100 && (
            <p className="text-xs text-red-700 mt-2 font-medium">
              🎉 You've used all your illustrated stories! <Link href="/pricing" className="underline">Upgrade?</Link>
            </p>
          )}
        </div>

        {/* Text Stories */}
        <div className={`p-4 rounded-xl border-2 ${textPercentage >= 80 ? 'border-yellow-200' : 'border-gray-200'} ${getProgressBgColor(textPercentage)}`}>
          <div className="flex items-center gap-3 mb-3">
            <span className="text-3xl">📚</span>
            <div className="flex-1">
              <h3 className="font-semibold text-gray-900">Text Stories</h3>
              <p className="text-sm text-gray-600">
                {textUsed} of {textLimit || '∞'} this month
              </p>
            </div>
          </div>
          <div className="w-full bg-gray-200 rounded-full h-3 overflow-hidden">
            <div
              className={`h-full transition-all duration-500 ${getProgressColor(textPercentage)}`}
              style={{ width: `${textPercentage}%` }}
            />
          </div>
          {textPercentage >= 80 && textPercentage < 100 && (
            <p className="text-xs text-yellow-700 mt-2 font-medium">
              ⚠️ Almost there! {textLimit! - textUsed} left
            </p>
          )}
          {textPercentage >= 100 && (
            <p className="text-xs text-red-700 mt-2 font-medium">
              🎉 You've used all your text stories! <Link href="/pricing" className="underline">Upgrade?</Link>
            </p>
          )}
        </div>
      </div>
    </div>
  );
}

export default function StoryLibraryPage() {
  const [stories, setStories] = useState<Story[]>([])
  const [filteredStories, setFilteredStories] = useState<Story[]>([])
  const [loading, setLoading] = useState(true)
  const [error, setError] = useState<string | null>(null)
  const [modeFilter, setModeFilter] = useState<'all' | 'fun' | 'growth'>('all')
  const [favoritesOnly, setFavoritesOnly] = useState(false)
  const [sortBy, setSortBy] = useState<'newest' | 'oldest' | 'favorites'>('newest')
  const [maxStories, setMaxStories] = useState<number | null>(null)
  const router = useRouter()
  const supabase = createClient()

  useEffect(() => {
    loadStories()
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [])

  useEffect(() => {
    applyFiltersAndSort()
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [stories, modeFilter, favoritesOnly, sortBy])

  const loadStories = async () => {
    try {
      const { data: { user } } = await supabase.auth.getUser()
      if (!user) {
        router.push('/auth/login')
        return
      }

      // Fetch subscription tier for story limits
      const { data: userProfile } = await supabase
        .from('user_profiles')
        .select(`
          subscription_tiers (
            illustrated_limit_month,
            text_limit_month
          )
        `)
        .eq('id', user.id)
        .single()

      const tier = (userProfile?.subscription_tiers as any)
      setMaxStories(tier?.illustrated_limit_month !== undefined ? tier.illustrated_limit_month : 3)

      const { data, error } = await supabase
        .from('content')
        .select(`
          id,
          title,
          body,
          created_at,
          is_favorite,
          content_type,
          panel_count,
          story_illustrations,
          generation_metadata,
          content_characters (
            character_profiles (
              id,
              name,
              avatar_cache:avatar_cache_id (
                image_url
              )
            )
          )
        `)
        .eq('user_id', user.id)
        .in('content_type', ['story', 'vignette_story'])
        .order('created_at', { ascending: false })

      if (error) throw error

      // Transform the data to handle nested arrays from joins
      const transformedData = data?.map(story => ({
        ...story,
        content_characters: story.content_characters?.map((cc: any) => ({
          character_profiles: Array.isArray(cc.character_profiles)
            ? cc.character_profiles[0]
            : cc.character_profiles
        })) || []
      })) || []

      setStories(transformedData)
    } catch (err: any) {
      setError(err.message)
    } finally {
      setLoading(false)
    }
  }

  const applyFiltersAndSort = () => {
    let filtered = [...stories]

    // Apply mode filter
    if (modeFilter !== 'all') {
      filtered = filtered.filter(story => story.generation_metadata?.mode === modeFilter)
    }

    // Apply favorites filter
    if (favoritesOnly) {
      filtered = filtered.filter(story => story.is_favorite)
    }

    // Apply sorting
    filtered.sort((a, b) => {
      if (sortBy === 'favorites') {
        // Favorites first, then by created date
        if (a.is_favorite !== b.is_favorite) {
          return a.is_favorite ? -1 : 1
        }
        return new Date(b.created_at).getTime() - new Date(a.created_at).getTime()
      } else if (sortBy === 'oldest') {
        return new Date(a.created_at).getTime() - new Date(b.created_at).getTime()
      } else {
        // newest (default)
        return new Date(b.created_at).getTime() - new Date(a.created_at).getTime()
      }
    })

    setFilteredStories(filtered)
  }

  const formatDate = (dateString: string) => {
    const date = new Date(dateString)
    return date.toLocaleDateString('en-US', {
      year: 'numeric',
      month: 'long',
      day: 'numeric'
    })
  }

  const handleDelete = async (storyId: string) => {
    if (!confirm('Delete this story? This action cannot be undone.')) {
      return
    }

    try {
      const response = await fetch(`/api/stories/${storyId}`, {
        method: 'DELETE'
      })

      if (!response.ok) {
        throw new Error('Failed to delete story')
      }

      // Remove from local state
      setStories(prev => prev.filter(s => s.id !== storyId))
    } catch (error) {
      console.error('Error deleting story:', error)
      alert('Failed to delete story. Please try again.')
    }
  }

  const handleFavoriteToggle = async (storyId: string) => {
    const story = stories.find(s => s.id === storyId)
    if (!story) return

    try {
      const response = await fetch(`/api/stories/${storyId}`, {
        method: 'PATCH',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ is_favorite: !story.is_favorite })
      })

      if (!response.ok) {
        throw new Error('Failed to update favorite status')
      }

      // Update local state
      setStories(prev => prev.map(s =>
        s.id === storyId ? { ...s, is_favorite: !s.is_favorite } : s
      ))
    } catch (error) {
      console.error('Error toggling favorite:', error)
      alert('Failed to update favorite status. Please try again.')
    }
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
    <div className="min-h-screen bg-white">
      <div className="max-w-7xl mx-auto px-4 sm:px-6 py-4 md:py-6">
        {/* Header */}
        <div className="mb-4 md:mb-6">
          {/* Navigation - Back button and tabs on same line */}
          <div className="flex flex-col sm:flex-row sm:items-center gap-3 sm:gap-4 mb-6">
            <Link
              href="/dashboard"
              className="inline-flex items-center gap-2 text-primary-600 active:text-primary-700 md:hover:text-primary-700 font-semibold min-h-[44px] transition-colors"
            >
              ← Back to Dashboard
            </Link>

            <div className="flex gap-2 sm:gap-3">
              <Link
                href="/dashboard/my-children"
                className="px-4 sm:px-6 py-2 sm:py-3 bg-gray-100 text-gray-600 font-semibold rounded-xl hover:bg-gray-200 transition-colors text-sm sm:text-base"
              >
                Manage Child Profiles
              </Link>
              <Link
                href="/dashboard/other-characters"
                className="px-4 sm:px-6 py-2 sm:py-3 bg-gray-100 text-gray-600 font-semibold rounded-xl hover:bg-gray-200 transition-colors text-sm sm:text-base"
              >
                Manage Characters
              </Link>
              <Link
                href="/dashboard/story-library"
                className="px-4 sm:px-6 py-2 sm:py-3 bg-blue-100 text-blue-700 font-semibold rounded-xl transition-colors text-sm sm:text-base"
              >
                Manage Stories
              </Link>
            </div>
          </div>

          <div className="card p-6 md:p-8">
            <div className="flex flex-col md:flex-row md:justify-between md:items-center gap-4 md:gap-6 mb-6">
              <div className="text-center md:text-left">
                <h1 className="text-3xl sm:text-4xl md:text-5xl font-display font-bold text-gray-900 mb-2">
                  Story Library
                </h1>
                <p className="text-base md:text-lg text-gray-600">
                  Your collection of personalized bedtime stories
                </p>
              </div>
              <div className="text-center md:text-right flex-shrink-0">
                <Link
                  href="/dashboard/stories/create"
                  className="btn-primary btn-md inline-flex items-center gap-2"
                >
                  <Sparkles className="w-5 h-5" />
                  Create New Story
                </Link>
              </div>
            </div>

            {/* Playful Story Quota */}
            <StoryQuotaDisplay />

            {/* Filters and Sorting */}
            {stories.length > 0 && (
              <div className="flex flex-col md:flex-row gap-4 pt-6 border-t border-gray-200">
                {/* Mode Filter */}
                <div className="flex-1">
                  <label className="block text-sm font-medium text-gray-700 mb-2">
                    <Filter className="w-4 h-4 inline mr-1" />
                    Story Mode
                  </label>
                  <div className="flex gap-2">
                    <button
                      onClick={() => setModeFilter('all')}
                      className={`px-4 py-2 rounded-lg font-medium transition-colors ${
                        modeFilter === 'all'
                          ? 'bg-primary-600 text-white'
                          : 'bg-gray-100 text-gray-600 hover:bg-gray-200'
                      }`}
                    >
                      All
                    </button>
                    <button
                      onClick={() => setModeFilter('fun')}
                      className={`px-4 py-2 rounded-lg font-medium transition-colors flex items-center gap-1 ${
                        modeFilter === 'fun'
                          ? 'bg-primary-600 text-white'
                          : 'bg-gray-100 text-gray-600 hover:bg-gray-200'
                      }`}
                    >
                      <Sparkles className="w-4 h-4" />
                      Fun
                    </button>
                    <button
                      onClick={() => setModeFilter('growth')}
                      className={`px-4 py-2 rounded-lg font-medium transition-colors flex items-center gap-1 ${
                        modeFilter === 'growth'
                          ? 'bg-green-600 text-white'
                          : 'bg-gray-100 text-gray-600 hover:bg-gray-200'
                      }`}
                    >
                      <Target className="w-4 h-4" />
                      Growth
                    </button>
                  </div>
                </div>

                {/* Favorites Toggle */}
                <div className="flex-1">
                  <label className="block text-sm font-medium text-gray-700 mb-2">
                    <Heart className="w-4 h-4 inline mr-1" />
                    Favorites
                  </label>
                  <button
                    onClick={() => setFavoritesOnly(!favoritesOnly)}
                    className={`px-4 py-2 rounded-lg font-medium transition-colors flex items-center gap-2 ${
                      favoritesOnly
                        ? 'bg-red-600 text-white'
                        : 'bg-gray-100 text-gray-600 hover:bg-gray-200'
                    }`}
                  >
                    <Heart className={`w-4 h-4 ${favoritesOnly ? 'fill-white' : ''}`} />
                    {favoritesOnly ? 'Showing Favorites' : 'Show All'}
                  </button>
                </div>

                {/* Sort By */}
                <div className="flex-1">
                  <label className="block text-sm font-medium text-gray-700 mb-2">
                    <SortAsc className="w-4 h-4 inline mr-1" />
                    Sort By
                  </label>
                  <select
                    value={sortBy}
                    onChange={(e) => setSortBy(e.target.value as 'newest' | 'oldest' | 'favorites')}
                    className="w-full px-4 py-2 rounded-lg border border-gray-300 bg-white text-gray-700 font-medium focus:outline-none focus:ring-2 focus:ring-primary-500"
                  >
                    <option value="newest">Newest First</option>
                    <option value="oldest">Oldest First</option>
                    <option value="favorites">Favorites First</option>
                  </select>
                </div>
              </div>
            )}
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
              href="/dashboard/stories/create"
              className="btn-primary btn-md inline-flex items-center gap-2"
            >
              <Sparkles className="w-5 h-5" />
              Create Your First Story
            </Link>
          </div>
        ) : filteredStories.length === 0 ? (
          <div className="card p-8 md:p-12 text-center">
            <Filter className="w-14 h-14 md:w-16 md:h-16 text-gray-300 mx-auto mb-4 md:mb-6" />
            <h3 className="text-xl md:text-2xl font-bold text-gray-700 mb-2 md:mb-3">No stories match your filters</h3>
            <p className="text-base md:text-lg text-gray-500 mb-6 md:mb-8">Try adjusting your filters to see more stories</p>
            <button
              onClick={() => {
                setModeFilter('all')
                setFavoritesOnly(false)
              }}
              className="btn-secondary inline-flex items-center gap-2"
            >
              Clear Filters
            </button>
          </div>
        ) : (
          <div>
            <div className="mb-4 text-sm text-gray-600">
              Showing {filteredStories.length} of {stories.length} {stories.length === 1 ? 'story' : 'stories'}
            </div>
            <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4 md:gap-6">
              {filteredStories.map(story => (
                <StoryCard
                  key={story.id}
                  story={story}
                  onDelete={handleDelete}
                  onFavoriteToggle={handleFavoriteToggle}
                />
              ))}
            </div>
          </div>
        )}
      </div>

      {/* Footer */}
      <footer className="py-12 bg-white border-t border-gray-200 mt-20">
        <div className="max-w-7xl mx-auto px-6">
          <div className="flex flex-col items-center gap-6 text-sm">
            <p className="flex flex-wrap items-center justify-center gap-2 text-lg text-gray-700 text-center">
              Made with <Heart className="w-5 h-5 fill-red-500 text-red-500 animate-pulse-soft" /> in the USA for little dreamers everywhere
            </p>
            <div className="flex flex-col md:flex-row justify-between items-center w-full gap-6">
              <p className="text-center md:text-left text-gray-500">© 2025 Tuck and Tale™. All rights reserved.</p>
              <nav className="grid grid-cols-2 sm:grid-cols-3 md:flex md:flex-row gap-x-8 gap-y-4 text-center md:text-left text-gray-600">
                <a href="/about" className="hover:text-primary-600 transition-colors">About</a>
                <a href="/contact" className="hover:text-primary-600 transition-colors">Contact Us</a>
                <a href="/faq" className="hover:text-primary-600 transition-colors">FAQ</a>
                <a href="/founder-parents" className="hover:text-primary-600 transition-colors">Founder Parents</a>
                <a href="/privacy" className="hover:text-primary-600 transition-colors">Privacy Policy</a>
                <a href="/terms" className="hover:text-primary-600 transition-colors">Terms of Service</a>
              </nav>
            </div>
          </div>
        </div>
      </footer>
    </div>
  )
}
