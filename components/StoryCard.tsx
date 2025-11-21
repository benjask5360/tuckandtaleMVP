'use client'

import Link from 'next/link'
import { Heart, Trash2, BookOpen, Sparkles, Target } from 'lucide-react'

interface StoryCardProps {
  story: {
    id: string
    title: string
    created_at: string
    is_favorite: boolean
    content_type: 'story'
    story_illustrations?: Array<{
      type: string
      url: string
      generated_at: string
    }>
    generation_metadata: {
      mode: 'fun' | 'growth'
      characters?: Array<{
        character_profile_id: string | null
        character_name: string
        profile_type: string | null
      }>
    }
    // Deprecated - kept for backward compatibility
    content_characters?: Array<{
      character_profiles: {
        id: string
        name: string
        avatar_cache?: {
          image_url: string
        }
      }
    }>
    // Beta Engine fields
    engine_version?: 'legacy' | 'beta'
    cover_illustration_url?: string
  }
  onDelete: (id: string) => void
  onFavoriteToggle: (id: string) => void
}

export default function StoryCard({ story, onDelete, onFavoriteToggle }: StoryCardProps) {
  // Extract cover image
  // For Beta: use cover_illustration_url
  // For Legacy: use Scene 0 from story_illustrations
  const coverUrl = story.engine_version === 'beta'
    ? story.cover_illustration_url
    : story.story_illustrations?.find(ill => ill.type === 'scene_0')?.url

  // Get hero character (first character)
  // Use generation_metadata.characters if available, fallback to content_characters for backward compatibility
  const heroCharacter = story.generation_metadata?.characters?.[0] ||
    story.content_characters?.[0]?.character_profiles

  // Format date
  const date = new Date(story.created_at).toLocaleDateString('en-US', {
    month: 'short',
    day: 'numeric',
    year: 'numeric'
  })

  // Story route
  const storyRoute = `/dashboard/stories/${story.id}`

  return (
    <div className="relative card p-6 md:p-8 active:shadow-card-hover active:scale-[0.98] md:hover:shadow-card-hover md:hover:-translate-y-1 transition-all duration-300">
      {/* Favorite Heart - Top Left */}
      <button
        onClick={(e) => {
          e.preventDefault()
          e.stopPropagation()
          onFavoriteToggle(story.id)
        }}
        className="absolute top-4 left-4 p-2 text-gray-400 hover:text-red-500 hover:bg-red-50 rounded-lg transition-colors z-10"
        aria-label={story.is_favorite ? 'Remove from favorites' : 'Add to favorites'}
      >
        <Heart
          className={`w-4 h-4 ${
            story.is_favorite ? 'fill-red-500 text-red-500' : ''
          }`}
        />
      </button>

      {/* Delete Button - Top Right */}
      <button
        onClick={(e) => {
          e.preventDefault()
          e.stopPropagation()
          onDelete(story.id)
        }}
        className="absolute top-4 right-4 p-2 text-gray-400 hover:text-red-500 hover:bg-red-50 rounded-lg transition-colors"
        aria-label="Delete story"
      >
        <Trash2 className="w-4 h-4" />
      </button>

      <Link href={storyRoute} className="block">
        <div className="flex flex-col items-center">
          {/* Cover Image - White Padded Square Container */}
          <div className="w-full aspect-square mb-4 flex items-center justify-center rounded-2xl overflow-hidden bg-white shadow-md">
            {coverUrl ? (
              <img
                src={coverUrl}
                alt={story.title}
                className="w-full h-full object-contain"
                loading="lazy"
              />
            ) : (
              <div className="w-full h-full bg-gradient-to-br from-primary-100 to-primary-200 flex items-center justify-center">
                <BookOpen className="w-16 h-16 text-primary-400" />
              </div>
            )}
          </div>

          {/* Story Title */}
          <h3 className="text-2xl font-bold text-gray-800 mb-4 text-center">
            {story.title}
          </h3>

          {/* Meta Row: Badge + Avatar + Date */}
          <div className="flex items-center gap-2 text-sm text-gray-500">
            {/* Mode Badge */}
            {story.generation_metadata.mode === 'growth' ? (
              <span className="inline-flex items-center gap-1 text-xs px-2 py-1 rounded-full bg-gray-100 text-gray-600 border border-gray-200">
                <Target className="w-3 h-3" />
                Growth
              </span>
            ) : (
              <span className="inline-flex items-center gap-1 text-xs px-2 py-1 rounded-full bg-gray-100 text-gray-600 border border-gray-200">
                <Sparkles className="w-3 h-3" />
                Fun
              </span>
            )}

            {/* Show avatar only if we have content_characters data (backward compatibility) */}
            {story.content_characters?.[0]?.character_profiles?.avatar_cache?.image_url && (
              <>
                <span className="text-gray-400">•</span>
                <img
                  src={story.content_characters[0].character_profiles.avatar_cache.image_url}
                  alt={story.content_characters[0].character_profiles.name}
                  className="w-6 h-6 rounded-full border border-gray-200"
                />
              </>
            )}
            <span className="text-gray-400">•</span>
            <span>{date}</span>
          </div>
        </div>
      </Link>
    </div>
  )
}
