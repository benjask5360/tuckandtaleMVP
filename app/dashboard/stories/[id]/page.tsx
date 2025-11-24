'use client'

import { useState, useEffect, useRef } from 'react'
import { createClient } from '@/lib/supabase/client'
import { useRouter } from 'next/navigation'
import Link from 'next/link'
import Image from 'next/image'
import { ArrowLeft, Heart, Sparkles, Loader2, Target, Download, Edit2, Save, X } from 'lucide-react'
import type { StoryIllustration } from '@/lib/types/story-types'
import ReviewRequestModal from '@/components/ReviewRequestModal'
import { IllustrationPending } from '@/components/IllustrationPending'

interface BetaScene {
  paragraph: string
  charactersInScene: string[]
  illustrationPrompt: string
  illustrationUrl?: string
}

interface Story {
  id: string
  title: string
  body: string
  created_at: string
  is_favorite: boolean
  story_illustrations?: StoryIllustration[]
  generation_status?: 'generating' | 'text_complete' | 'complete' | 'error'
  generation_metadata: {
    mode: 'fun' | 'growth'
    genre_display: string
    tone_display: string
    length_display: string
    growth_topic_display?: string
    moral?: string
    paragraphs: string[]
    characters?: Array<{
      character_profile_id: string | null
      character_name: string
      profile_type: string | null
    }>
    progress?: {
      scenes_completed: number
      total_scenes: number
      is_streaming?: boolean
    }
  }
  // Deprecated - kept for backward compatibility
  content_characters?: Array<{
    character_profiles: {
      id: string
      name: string
      avatar_url?: string
    }
  }>
  // Beta Engine fields
  engine_version?: 'legacy' | 'beta'
  story_scenes?: BetaScene[]
  cover_illustration_url?: string
  cover_illustration_prompt?: string
  include_illustrations?: boolean
}

export default function StoryViewerPage({ params }: { params: { id: string } }) {
  const router = useRouter()
  const supabase = createClient()
  const [story, setStory] = useState<Story | null>(null)
  const [loading, setLoading] = useState(true)
  const [error, setError] = useState<string | null>(null)
  const [downloading, setDownloading] = useState(false)
  const [isEditMode, setIsEditMode] = useState(false)
  const [saving, setSaving] = useState(false)
  const [editedTitle, setEditedTitle] = useState('')
  const [editedParagraphs, setEditedParagraphs] = useState<string[]>([])
  const [editedMoral, setEditedMoral] = useState('')
  const [showReviewModal, setShowReviewModal] = useState(false)
  const [shouldCheckReviewModal, setShouldCheckReviewModal] = useState(false)
  const [illustrationsComplete, setIllustrationsComplete] = useState(false)

  // Polling control ref to prevent multiple loops
  const pollingActiveRef = useRef(false)

  useEffect(() => {
    loadStory()
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [params.id])

  // Poll for story text and illustration updates if they're pending
  useEffect(() => {
    // CRITICAL: Prevent multiple concurrent polling loops
    if (pollingActiveRef.current) {
      return
    }

    // Only poll Beta stories
    if (story && story.engine_version !== 'beta') {
      return
    }

    // Stop polling if story is complete
    if (story?.generation_status === 'complete') {
      setIllustrationsComplete(true)
      return
    }

    pollingActiveRef.current = true

    // Abort controller for request cancellation
    const abortController = new AbortController()
    let timeoutId: NodeJS.Timeout
    let isPolling = false
    let lastPollTime = 0

    const getPollInterval = () => {
      if (!story || story.generation_status === 'generating') {
        return 1000 // 1s for text generation
      }
      return 3000 // 3s for illustrations
    }

    const poll = async () => {
      // Prevent concurrent requests
      if (isPolling) return

      // Enforce minimum interval
      const now = Date.now()
      const timeSinceLastPoll = now - lastPollTime
      const minInterval = getPollInterval()

      if (timeSinceLastPoll < minInterval) {
        timeoutId = setTimeout(poll, minInterval - timeSinceLastPoll)
        return
      }

      isPolling = true
      lastPollTime = now

      try {
        const response = await fetch(`/api/stories/${params.id}`, {
          signal: abortController.signal
        })

        if (!response.ok) {
          throw new Error(`HTTP error! status: ${response.status}`)
        }

        const data = await response.json()

        if (data.story) {
          setStory(data.story)

          // Stop polling if complete or if text-only story is text_complete
          const isTerminalState =
            data.story.generation_status === 'complete' ||
            (data.story.generation_status === 'text_complete' &&
              !data.story.include_illustrations)

          if (isTerminalState) {
            setIllustrationsComplete(true)
            pollingActiveRef.current = false
            return
          }

          // Continue polling if still generating
          timeoutId = setTimeout(poll, getPollInterval())
        }
      } catch (error: any) {
        if (error.name === 'AbortError') {
          return
        }
        console.error('Error polling for updates:', error)
        // Retry after delay
        timeoutId = setTimeout(poll, 5000)
      } finally {
        isPolling = false
      }
    }

    // Start polling
    poll()

    // Cleanup function
    return () => {
      pollingActiveRef.current = false
      abortController.abort()
      if (timeoutId) {
        clearTimeout(timeoutId)
      }
    }
  }, [params.id]) // Only depend on story ID

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

      // Check for unsaved edits in localStorage
      const savedEdit = localStorage.getItem(`story-edit-${params.id}`)
      if (savedEdit) {
        const shouldRestore = confirm('Found unsaved changes. Would you like to restore them?')
        if (shouldRestore) {
          try {
            const parsed = JSON.parse(savedEdit)
            setEditedTitle(parsed.title || data.story.title)
            setEditedParagraphs(parsed.paragraphs || [])
            setEditedMoral(parsed.moral || '')
            setIsEditMode(true)
          } catch (e) {
            console.error('Failed to restore saved edits:', e)
            localStorage.removeItem(`story-edit-${params.id}`)
          }
        } else {
          localStorage.removeItem(`story-edit-${params.id}`)
        }
      }
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

      // If user just favorited (not unfavorited), check if we should show review modal
      if (newFavoriteStatus) {
        checkAndShowReviewModal()
      }
    } catch (err: any) {
      console.error('Error updating favorite:', err)
      alert(err.message)
    }
  }

  const checkAndShowReviewModal = async () => {
    try {
      const response = await fetch('/api/reviews', {
        method: 'GET',
      })

      if (response.ok) {
        const data = await response.json()
        if (data.should_show_modal) {
          setShowReviewModal(true)
        }
      }
    } catch (err) {
      console.error('Error checking review modal status:', err)
      // Fail silently - don't interrupt user experience
    }
  }

  const handleDownloadPDF = async () => {
    if (!story) return

    try {
      setDownloading(true)

      const response = await fetch(`/api/stories/${params.id}/download`)

      if (!response.ok) {
        const error = await response.json()
        throw new Error(error.error || 'Failed to download PDF')
      }

      // Get the PDF blob
      const blob = await response.blob()

      // Create download link
      const url = window.URL.createObjectURL(blob)
      const a = document.createElement('a')
      a.href = url
      a.download = `${story.title.replace(/[^a-z0-9]/gi, '-').toLowerCase()}.pdf`
      document.body.appendChild(a)
      a.click()

      // Cleanup
      window.URL.revokeObjectURL(url)
      document.body.removeChild(a)
    } catch (err: any) {
      console.error('Error downloading PDF:', err)
      alert(err.message || 'Failed to download PDF. Please try again.')
    } finally {
      setDownloading(false)
    }
  }

  const handleEnterEditMode = () => {
    if (!story) return

    const paragraphs = getParagraphs()
    setEditedTitle(story.title)
    setEditedParagraphs([...paragraphs])
    setEditedMoral(story.generation_metadata?.moral || '')
    setIsEditMode(true)

    // Save to localStorage as backup
    localStorage.setItem(`story-edit-${params.id}`, JSON.stringify({
      title: story.title,
      paragraphs,
      moral: story.generation_metadata?.moral || ''
    }))
  }

  const handleCancelEdit = () => {
    if (confirm('Are you sure? Any unsaved changes will be lost.')) {
      setIsEditMode(false)
      localStorage.removeItem(`story-edit-${params.id}`)
    }
  }

  const handleSaveEdit = async () => {
    if (!story) return

    // Validation
    if (editedTitle.trim().length === 0) {
      alert('Title cannot be empty')
      return
    }
    if (editedTitle.length > 200) {
      alert('Title must be 200 characters or less')
      return
    }
    if (editedParagraphs.length < 3 || editedParagraphs.length > 12) {
      alert('Story must have between 3 and 12 paragraphs')
      return
    }
    for (const p of editedParagraphs) {
      if (p.trim().length === 0) {
        alert('All paragraphs must have content')
        return
      }
    }
    if (editedMoral.length > 500) {
      alert('Moral must be 500 characters or less')
      return
    }

    try {
      setSaving(true)

      const response = await fetch(`/api/stories/${params.id}`, {
        method: 'PUT',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          title: editedTitle,
          paragraphs: editedParagraphs,
          moral: editedMoral
        })
      })

      if (!response.ok) {
        const error = await response.json()
        console.error('Server error response:', error)
        throw new Error(error.details || error.error || 'Failed to save changes')
      }

      const data = await response.json()
      setStory(data.story)
      setIsEditMode(false)
      localStorage.removeItem(`story-edit-${params.id}`)

      alert('Story updated successfully!')
    } catch (err: any) {
      console.error('Error saving story:', err)
      alert(`Failed to save: ${err.message}`)
    } finally {
      setSaving(false)
    }
  }

  const handleParagraphChange = (index: number, value: string) => {
    const updated = [...editedParagraphs]
    updated[index] = value
    setEditedParagraphs(updated)

    // Auto-save to localStorage
    localStorage.setItem(`story-edit-${params.id}`, JSON.stringify({
      title: editedTitle,
      paragraphs: updated,
      moral: editedMoral
    }))
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

  // Detect if this is a Beta story
  const isBetaStory = story.engine_version === 'beta'

  // Parse paragraphs with defensive handling for raw JSON in body field
  const getParagraphs = (): string[] => {
    // For Beta stories, extract paragraphs from story_scenes
    if (isBetaStory && story.story_scenes && Array.isArray(story.story_scenes)) {
      return story.story_scenes.map(scene => scene.paragraph)
    }

    // Legacy: First try to use the parsed paragraphs from metadata
    if (story.generation_metadata?.paragraphs && Array.isArray(story.generation_metadata.paragraphs)) {
      return story.generation_metadata.paragraphs
    }

    // Fallback: check if body contains raw JSON and try to parse it
    const bodyTrimmed = story.body.trim()
    if (bodyTrimmed.startsWith('{') || bodyTrimmed.startsWith('[')) {
      try {
        const parsed = JSON.parse(bodyTrimmed)
        // Check if it has the expected structure
        if (parsed.paragraphs && Array.isArray(parsed.paragraphs)) {
          console.warn('Story body contains raw JSON - using parsed paragraphs')
          return parsed.paragraphs
        }
      } catch (e) {
        console.error('Failed to parse JSON from story body:', e)
      }
    }

    // Final fallback: split body by double newlines
    return story.body.split('\n\n').filter(p => p.trim())
  }

  const paragraphs = getParagraphs()

  // Helper function to get illustration for a specific scene (Legacy)
  const getSceneIllustration = (sceneNumber: number): StoryIllustration | undefined => {
    if (!story.story_illustrations) return undefined
    return story.story_illustrations.find(ill => ill.type === `scene_${sceneNumber}`)
  }

  // Helper function to get Beta scene illustration URL
  const getBetaSceneIllustration = (sceneIndex: number): string | undefined => {
    if (!isBetaStory || !story.story_scenes) return undefined
    return story.story_scenes[sceneIndex]?.illustrationUrl
  }

  // Get cover illustration
  // For Beta: use cover_illustration_url
  // For Legacy: use Scene 0 from story_illustrations
  const coverImageUrl = isBetaStory
    ? story.cover_illustration_url
    : getSceneIllustration(0)?.url

  return (
    <div className="min-h-screen bg-gray-50">
      <div className="max-w-4xl mx-auto px-4 sm:px-6 py-4 md:py-6">
        {/* Edit Mode Warning Banner */}
        {isEditMode && (
          <div className="mb-6 p-4 bg-blue-50 border border-blue-200 rounded-lg">
            <div className="flex items-center gap-2 text-blue-800">
              <Edit2 className="w-5 h-5" />
              <p className="font-medium">
                Edit Mode Active
              </p>
            </div>
            <p className="text-sm text-blue-700 mt-1">
              Changes are automatically saved to your browser. Click the save icon to save permanently. Illustrations will remain unchanged.
            </p>
          </div>
        )}

        {/* Generation Progress Banner */}
        {story?.generation_status === 'generating' && (
          <div className="mb-6 p-4 bg-blue-50 border border-blue-200 rounded-lg">
            <div className="flex items-center gap-3">
              <Loader2 className="w-5 h-5 text-blue-600 animate-spin" />
              <div className="flex-1">
                <p className="font-medium text-blue-800">
                  Creating your story...
                </p>
                {story.generation_metadata?.progress && (
                  <p className="text-sm text-blue-700 mt-1">
                    Scene {story.generation_metadata.progress.scenes_completed} of {story.generation_metadata.progress.total_scenes}
                  </p>
                )}
              </div>
            </div>
          </div>
        )}

        {/* Illustration Progress Banner */}
        {story?.generation_status === 'text_complete' && !illustrationsComplete && (
          <div className="mb-6 p-4 bg-purple-50 border border-purple-200 rounded-lg">
            <div className="flex items-center gap-3">
              <Sparkles className="w-5 h-5 text-purple-600 animate-pulse" />
              <div className="flex-1">
                <p className="font-medium text-purple-800">
                  Illustrating your story...
                </p>
                <p className="text-sm text-purple-700 mt-1">
                  Creating beautiful artwork for each scene
                </p>
              </div>
            </div>
          </div>
        )}

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
            {/* Title and Actions */}
            <div className="flex items-start justify-between gap-4 mb-3">
              {isEditMode ? (
                <input
                  type="text"
                  value={editedTitle}
                  onChange={(e) => setEditedTitle(e.target.value)}
                  className="text-2xl sm:text-3xl md:text-4xl font-display font-bold text-gray-800 text-center flex-1 border-2 border-primary-300 rounded-lg px-4 py-2 focus:outline-none focus:border-primary-500"
                  placeholder="Story title..."
                />
              ) : (
                <h1 className="text-2xl sm:text-3xl md:text-4xl font-display font-bold text-gray-800 text-center flex-1">
                  {story.title}
                </h1>
              )}
              <div className="flex items-center gap-2 flex-shrink-0">
                {isEditMode ? (
                  <>
                    <button
                      onClick={handleSaveEdit}
                      disabled={saving}
                      className="p-2 text-green-600 hover:text-green-700 hover:bg-green-50 rounded-lg transition-colors disabled:opacity-50 disabled:cursor-not-allowed"
                      title="Save changes"
                    >
                      {saving ? (
                        <Loader2 className="w-5 h-5 animate-spin" />
                      ) : (
                        <Save className="w-5 h-5" />
                      )}
                    </button>
                    <button
                      onClick={handleCancelEdit}
                      disabled={saving}
                      className="p-2 text-red-600 hover:text-red-700 hover:bg-red-50 rounded-lg transition-colors disabled:opacity-50 disabled:cursor-not-allowed"
                      title="Cancel editing"
                    >
                      <X className="w-5 h-5" />
                    </button>
                  </>
                ) : (
                  <>
                    <button
                      onClick={handleEnterEditMode}
                      className="p-2 text-gray-400 hover:text-blue-600 hover:bg-blue-50 rounded-lg transition-colors"
                      title="Edit story"
                    >
                      <Edit2 className="w-5 h-5" />
                    </button>
                    <button
                      onClick={handleDownloadPDF}
                      disabled={downloading}
                      className="p-2 text-gray-400 hover:text-primary-600 hover:bg-primary-50 rounded-lg transition-colors disabled:opacity-50 disabled:cursor-not-allowed"
                      title="Download as PDF"
                    >
                      {downloading ? (
                        <Loader2 className="w-5 h-5 animate-spin" />
                      ) : (
                        <Download className="w-5 h-5" />
                      )}
                    </button>
                    <button
                      onClick={handleFavorite}
                      className="p-2 text-gray-400 hover:text-red-500 hover:bg-red-50 rounded-lg transition-colors"
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
                  </>
                )}
              </div>
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
              {/* Show character name from either metadata or content_characters */}
              {(story.generation_metadata?.characters?.[0] || story.content_characters?.[0]) && (
                <>
                  <span className="text-gray-400">•</span>
                  <span className="font-medium text-gray-700">
                    {story.generation_metadata?.characters?.[0]?.character_name ||
                     story.content_characters?.[0]?.character_profiles.name}
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

            {/* Cover Image */}
            {isBetaStory && story.include_illustrations === true ? (
              <div className="relative w-full max-w-2xl mx-auto rounded-2xl overflow-hidden bg-white shadow-md">
                {coverImageUrl ? (
                  <Image
                    src={coverImageUrl}
                    alt="Story Cover"
                    width={512}
                    height={512}
                    className="w-full h-auto object-contain"
                    priority
                  />
                ) : (
                  <IllustrationPending
                    type="cover"
                    sceneNumber={0}
                    totalScenes={story.story_scenes?.length || 8}
                  />
                )}
              </div>
            ) : (
              coverImageUrl && (
                <div className="relative w-full max-w-2xl mx-auto rounded-2xl overflow-hidden bg-white shadow-md">
                  <Image
                    src={coverImageUrl}
                    alt="Story Cover"
                    width={512}
                    height={512}
                    className="w-full h-auto object-contain"
                    priority
                  />
                </div>
              )
            )}

            {/* Starring Row - Show characters from metadata or content_characters */}
            {((story.generation_metadata?.characters && story.generation_metadata.characters.length > 0) ||
              (story.content_characters && story.content_characters.length > 0)) && (
              <div className="mt-6 flex items-center justify-center gap-2 flex-wrap">
                <span className="text-sm text-gray-600">Starring:</span>
                {/* Use metadata characters if available, otherwise fallback to content_characters */}
                {story.generation_metadata?.characters ? (
                  // New structure from metadata
                  story.generation_metadata.characters.map((char, idx) => (
                    <div key={idx} className="flex items-center gap-2">
                      <span className="text-sm font-medium text-gray-700">
                        {char.character_name}
                      </span>
                      {idx < (story.generation_metadata.characters?.length || 0) - 1 && (
                        <span className="text-gray-400">•</span>
                      )}
                    </div>
                  ))
                ) : (
                  // Fallback to old structure (with avatars)
                  story.content_characters?.map((cc, idx) => (
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
                      {idx < (story.content_characters?.length || 0) - 1 && (
                        <span className="text-gray-400">•</span>
                      )}
                    </div>
                  ))
                )}
              </div>
            )}
          </div>
        </div>

        {/* Story Content */}
        <div className="card p-6 md:p-8 lg:p-12">
          <div className="max-w-none">
            {/* Show placeholders if story is still generating */}
            {story?.generation_status === 'generating' && (!paragraphs || paragraphs.length === 0) && (
              <div className="space-y-8">
                {[...Array(8)].map((_, index) => (
                  <div key={index} className="animate-pulse">
                    <div className="mb-4 h-64 bg-gray-200 rounded-2xl"></div>
                    <div className="space-y-3">
                      <div className="h-4 bg-gray-200 rounded w-full"></div>
                      <div className="h-4 bg-gray-200 rounded w-5/6"></div>
                      <div className="h-4 bg-gray-200 rounded w-4/5"></div>
                    </div>
                  </div>
                ))}
              </div>
            )}

            {/* Show actual content as it streams in */}
            {(isEditMode ? editedParagraphs : paragraphs).map((paragraph, index) => {
              // Get scene illustration based on engine version
              // Legacy: scenes 1-8 map to paragraphs 0-7 in story_illustrations
              // Beta: use story_scenes[index].illustrationUrl directly
              const sceneImageUrl = isBetaStory
                ? getBetaSceneIllustration(index)
                : getSceneIllustration(index + 1)?.url

              return (
                <div key={index}>
                  {/* Scene Illustration above paragraph */}
                  {isBetaStory && story.include_illustrations === true ? (
                    <div className="mt-8 mb-6 relative w-full max-w-2xl mx-auto rounded-2xl overflow-hidden bg-white shadow-md">
                      {sceneImageUrl ? (
                        <Image
                          src={sceneImageUrl}
                          alt={`Scene ${index + 1}`}
                          width={512}
                          height={512}
                          className="w-full h-auto object-contain"
                          loading="lazy"
                        />
                      ) : (
                        <IllustrationPending
                          type="scene"
                          sceneNumber={index + 1}
                          totalScenes={story.story_scenes?.length || 8}
                        />
                      )}
                    </div>
                  ) : (
                    sceneImageUrl && (
                      <div className="mt-8 mb-6 relative w-full max-w-2xl mx-auto rounded-2xl overflow-hidden bg-white shadow-md">
                        <Image
                          src={sceneImageUrl}
                          alt={`Scene ${index + 1}`}
                          width={512}
                          height={512}
                          className="w-full h-auto object-contain"
                          loading="lazy"
                        />
                      </div>
                    )
                  )}

                  {/* Paragraph text */}
                  {isEditMode ? (
                    <textarea
                      value={paragraph}
                      onChange={(e) => handleParagraphChange(index, e.target.value)}
                      className="w-full text-gray-800 leading-relaxed mb-6 text-base md:text-lg border-2 border-primary-200 rounded-lg p-4 focus:outline-none focus:border-primary-500 min-h-[120px]"
                      style={{ lineHeight: '1.8' }}
                      placeholder={`Paragraph ${index + 1}...`}
                    />
                  ) : (
                    <p className="text-gray-800 leading-relaxed mb-6 text-base md:text-lg" style={{ lineHeight: '1.8' }}>
                      {paragraph}
                    </p>
                  )}
                </div>
              )
            })}

            {/* What We Learned / Moral Section */}
            {(story.generation_metadata?.moral || isEditMode) && (
              <div className="mt-12 mb-8 p-6 md:p-8 bg-primary-50 rounded-2xl border border-primary-200">
                <div className="flex items-start gap-3">
                  <Heart className="w-5 h-5 text-primary-600 flex-shrink-0 mt-1" />
                  <div className="flex-1">
                    <h3 className="font-bold text-lg text-primary-900 mb-3">
                      {story.generation_metadata.mode === 'growth' ? 'What We Learned' : 'The Moral of the Story'}
                    </h3>
                    {isEditMode ? (
                      <textarea
                        value={editedMoral}
                        onChange={(e) => {
                          setEditedMoral(e.target.value)
                          // Auto-save to localStorage
                          localStorage.setItem(`story-edit-${params.id}`, JSON.stringify({
                            title: editedTitle,
                            paragraphs: editedParagraphs,
                            moral: e.target.value
                          }))
                        }}
                        className="w-full text-primary-800 text-base md:text-lg leading-relaxed border-2 border-primary-300 rounded-lg p-4 focus:outline-none focus:border-primary-500 min-h-[100px]"
                        placeholder="What lesson or moral does this story teach? (optional)"
                      />
                    ) : (
                      <p className="text-primary-800 text-base md:text-lg leading-relaxed">
                        {story.generation_metadata.moral}
                      </p>
                    )}
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

        {/* Create Another Story CTA */}
        <div className="mt-6 mb-8">
          <Link
            href="/dashboard/stories/create"
            className="w-full btn-primary min-h-[44px] flex items-center justify-center gap-2"
          >
            <Sparkles className="w-5 h-5" />
            Create Another Story!
          </Link>
        </div>
      </div>

      {/* Review Request Modal */}
      <ReviewRequestModal
        isOpen={showReviewModal}
        onClose={() => setShowReviewModal(false)}
        storyId={params.id}
        storyTitle={story?.title}
      />
    </div>
  )
}
