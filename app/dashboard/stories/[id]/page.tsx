'use client'

import { useState, useEffect } from 'react'
import { createClient } from '@/lib/supabase/client'
import { useRouter } from 'next/navigation'
import Link from 'next/link'
import Image from 'next/image'
import { ArrowLeft, Heart, Sparkles, Loader2, Target, Download, Edit2, Save, X } from 'lucide-react'
import type { StoryIllustration } from '@/lib/types/story-types'
import ReviewRequestModal from '@/components/ReviewRequestModal'

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
  const [downloading, setDownloading] = useState(false)
  const [isEditMode, setIsEditMode] = useState(false)
  const [saving, setSaving] = useState(false)
  const [editedTitle, setEditedTitle] = useState('')
  const [editedParagraphs, setEditedParagraphs] = useState<string[]>([])
  const [editedMoral, setEditedMoral] = useState('')
  const [showReviewModal, setShowReviewModal] = useState(false)
  const [shouldCheckReviewModal, setShouldCheckReviewModal] = useState(false)

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

  // Parse paragraphs with defensive handling for raw JSON in body field
  const getParagraphs = (): string[] => {
    // First try to use the parsed paragraphs from metadata
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
            {(isEditMode ? editedParagraphs : paragraphs).map((paragraph, index) => {
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
