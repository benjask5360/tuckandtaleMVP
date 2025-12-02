'use client'

import { useState, useEffect } from 'react'
import { createClient } from '@/lib/supabase/client'
import { useRouter } from 'next/navigation'
import Link from 'next/link'
import { ArrowLeft, Heart, Sparkles, Loader2, Target, Download, Edit2, Save, X, ImageOff, RefreshCw } from 'lucide-react'
import Image from 'next/image'
import ReviewRequestModal from '@/components/ReviewRequestModal'
import type { V3GenerationMetadata, V3IllustrationStatusData } from '@/lib/story-engine-v3/types'

interface V3StoryData {
  id: string
  title: string
  body: string
  created_at: string
  is_favorite: boolean
  engine_version: 'v3'
  generation_status: 'generating' | 'text_complete' | 'complete' | 'error'
  generation_metadata: V3GenerationMetadata
  v3_illustration_status?: V3IllustrationStatusData
}

export default function V3StoryViewerPage({ params }: { params: { id: string } }) {
  const router = useRouter()
  const supabase = createClient()
  const [story, setStory] = useState<V3StoryData | null>(null)
  const [loading, setLoading] = useState(true)
  const [error, setError] = useState<string | null>(null)
  const [downloading, setDownloading] = useState(false)
  const [isEditMode, setIsEditMode] = useState(false)
  const [saving, setSaving] = useState(false)
  const [editedTitle, setEditedTitle] = useState('')
  const [editedParagraphs, setEditedParagraphs] = useState<string[]>([])
  const [editedMoral, setEditedMoral] = useState('')
  const [showReviewModal, setShowReviewModal] = useState(false)

  // Illustration state
  const [illustrationStatus, setIllustrationStatus] = useState<V3IllustrationStatusData | null>(null)
  const [illustrationError, setIllustrationError] = useState<string | null>(null)
  const [triggeringIllustrations, setTriggeringIllustrations] = useState(false)

  useEffect(() => {
    loadStory()
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [params.id])

  // Effect to trigger illustration generation when story loads
  useEffect(() => {
    if (!story) return

    // Only trigger if:
    // - illustrations are enabled
    // - story text is complete
    // - not already triggering
    // - no existing DB illustration status OR status is pending (allow retry)
    // IMPORTANT: Check DATABASE status (story.v3_illustration_status), not React state (illustrationStatus)
    // React state is null on initial mount which would incorrectly re-trigger generation
    const dbStatus = story.v3_illustration_status?.overall
    const shouldTrigger =
      story.generation_metadata?.include_illustrations === true &&
      story.generation_status === 'text_complete' &&
      !triggeringIllustrations &&
      (!dbStatus || dbStatus === 'pending')

    if (shouldTrigger) {
      triggerIllustrationGeneration()
    }
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [story?.id, story?.generation_status, story?.generation_metadata?.include_illustrations, story?.v3_illustration_status?.overall])

  // Polling effect for illustration status
  useEffect(() => {
    if (!story) return
    if (!story.generation_metadata?.include_illustrations) return

    // Don't poll if we haven't triggered yet or if complete/failed
    const overallStatus = illustrationStatus?.overall
    if (!overallStatus) return
    if (overallStatus === 'complete' || overallStatus === 'failed') return

    const pollInterval = setInterval(async () => {
      try {
        const response = await fetch(`/api/story-engine/v3/illustrations/status?storyId=${story.id}`)
        if (response.ok) {
          const status = await response.json()
          setIllustrationStatus(status)

          // Stop polling if complete or failed
          if (status.overall === 'complete' || status.overall === 'failed') {
            clearInterval(pollInterval)
            return
          }

          // Fallback: If all images have URLs but overall is still generating,
          // consider it complete (handles race condition where overall status update failed)
          const coverDone = status.cover?.tempUrl || status.cover?.imageUrl || status.cover?.status === 'failed'
          const allScenesDone = status.scenes?.length > 0 && status.scenes.every(
            (s: any) => s.tempUrl || s.imageUrl || s.status === 'failed'
          )
          if (coverDone && allScenesDone && status.overall === 'generating') {
            console.log('All illustrations have URLs but overall still generating - treating as complete')
            setIllustrationStatus({ ...status, overall: 'complete' })
            clearInterval(pollInterval)
          }
        }
      } catch (err) {
        console.error('Error polling illustration status:', err)
      }
    }, 2000) // Poll every 2 seconds

    return () => clearInterval(pollInterval)
  }, [story?.id, story?.generation_metadata?.include_illustrations, illustrationStatus?.overall])

  const triggerIllustrationGeneration = async () => {
    if (!story) return

    setTriggeringIllustrations(true)
    setIllustrationError(null)

    try {
      const response = await fetch('/api/story-engine/v3/illustrations/generate', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ storyId: story.id })
      })

      if (!response.ok) {
        const error = await response.json()
        throw new Error(error.error || 'Failed to start illustration generation')
      }

      // Set initial status to trigger polling
      setIllustrationStatus({
        overall: 'generating',
        cover: { status: 'pending' },
        scenes: []
      })
    } catch (err: any) {
      console.error('Error triggering illustration generation:', err)
      setIllustrationError(err.message)
    } finally {
      setTriggeringIllustrations(false)
    }
  }

  const loadStory = async () => {
    try {
      const { data: { user } } = await supabase.auth.getUser()
      if (!user) {
        router.push('/auth/login')
        return
      }

      // Fetch story directly from database
      const { data: storyData, error: fetchError } = await supabase
        .from('content')
        .select('*')
        .eq('id', params.id)
        .eq('user_id', user.id)
        .eq('engine_version', 'v3')
        .single()

      if (fetchError || !storyData) {
        throw new Error(fetchError?.message || 'Story not found')
      }

      setStory(storyData as V3StoryData)

      // Load existing illustration status if available
      if (storyData.v3_illustration_status) {
        setIllustrationStatus(storyData.v3_illustration_status as V3IllustrationStatusData)
      }

      // Check for unsaved edits in localStorage
      const savedEdit = localStorage.getItem(`story-edit-${params.id}`)
      if (savedEdit) {
        const shouldRestore = confirm('Found unsaved changes. Would you like to restore them?')
        if (shouldRestore) {
          try {
            const parsed = JSON.parse(savedEdit)
            setEditedTitle(parsed.title || storyData.title)
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
      console.error('Error loading V3 story:', err)
      setError(err.message)
    } finally {
      setLoading(false)
    }
  }

  const handleFavorite = async () => {
    if (!story) return

    try {
      const newFavoriteStatus = !story.is_favorite

      const { error: updateError } = await supabase
        .from('content')
        .update({ is_favorite: newFavoriteStatus })
        .eq('id', params.id)

      if (updateError) {
        throw new Error('Failed to update favorite status')
      }

      setStory({ ...story, is_favorite: newFavoriteStatus })

      // If user just favorited, check if we should show review modal
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

      const blob = await response.blob()
      const url = window.URL.createObjectURL(blob)
      const a = document.createElement('a')
      a.href = url
      a.download = `${story.title.replace(/[^a-z0-9]/gi, '-').toLowerCase()}.pdf`
      document.body.appendChild(a)
      a.click()

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

      // Reload the story
      await loadStory()
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

    localStorage.setItem(`story-edit-${params.id}`, JSON.stringify({
      title: editedTitle,
      paragraphs: updated,
      moral: editedMoral
    }))
  }

  // Get paragraphs from V3 story structure
  const getParagraphs = (): string[] => {
    // V3 stories store paragraphs in generation_metadata.v3_story.paragraphs
    if (story?.generation_metadata?.v3_story?.paragraphs) {
      return story.generation_metadata.v3_story.paragraphs.map(p => p.text)
    }
    // Fallback to flat paragraphs array in metadata
    if (story?.generation_metadata?.paragraphs) {
      return story.generation_metadata.paragraphs
    }
    // Last resort: split body
    if (story?.body) {
      return story.body.split('\n\n').filter(p => p.trim())
    }
    return []
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

  const paragraphs = getParagraphs()

  // Helper component to render illustration slot
  const IllustrationSlot = ({
    status,
    tempUrl,
    imageUrl,
    alt,
    size = 'large'
  }: {
    status?: 'pending' | 'generating' | 'success' | 'failed'
    tempUrl?: string
    imageUrl?: string
    alt: string
    size?: 'large' | 'medium'
  }) => {
    const url = imageUrl || tempUrl
    const isLoading = status === 'pending' || status === 'generating'
    const isFailed = status === 'failed'
    const sizeClasses = size === 'large' ? 'aspect-square' : 'aspect-[4/3]'

    if (isFailed) {
      return (
        <div className={`relative w-full rounded-2xl overflow-hidden bg-gradient-to-br from-red-50 to-pink-50 border-2 border-dashed border-red-200 ${sizeClasses}`}>
          <div className="absolute inset-0 flex flex-col items-center justify-center p-4 text-center">
            <ImageOff className="w-12 h-12 text-red-300 mb-3" />
            <p className="text-red-600 font-medium text-sm">Illustration failed</p>
            <p className="text-red-400 text-xs mt-1">Could not generate this image</p>
          </div>
        </div>
      )
    }

    if (isLoading || !url) {
      const { completed, total } = getProgressCount()
      const progressText = total > 0 ? `Generating illustrations: ${completed} / ${total} complete` : 'Preparing your personalized illustrations...'

      // For cover (large), show a smaller banner instead of giant square
      if (size === 'large') {
        return (
          <div className="w-full rounded-2xl overflow-hidden bg-gradient-to-r from-blue-50 to-indigo-50 border border-blue-200 py-4 px-6">
            <div className="flex items-center gap-4">
              <div className="relative">
                <Loader2 className="w-8 h-8 text-blue-400 animate-spin" />
                <Sparkles className="w-4 h-4 text-blue-500 absolute -top-1 -right-1 animate-pulse" />
              </div>
              <div>
                <p className="text-blue-600 font-medium text-sm">
                  {progressText}
                </p>
                <p className="text-blue-400 text-xs">This may take a moment</p>
              </div>
            </div>
          </div>
        )
      }
      // For scenes (medium), keep smaller horizontal placeholder
      return (
        <div className="w-full rounded-xl overflow-hidden bg-gradient-to-r from-blue-50 to-indigo-50 border border-dashed border-blue-200 py-3 px-4">
          <div className="flex items-center gap-3">
            <Loader2 className="w-5 h-5 text-blue-400 animate-spin" />
            <p className="text-blue-600 font-medium text-xs">
              {progressText}
            </p>
          </div>
        </div>
      )
    }

    return (
      <div className={`relative w-full rounded-2xl overflow-hidden ${sizeClasses}`}>
        <Image
          src={url}
          alt={alt}
          fill
          className="object-contain"
          sizes={size === 'large' ? '(max-width: 768px) 100vw, 672px' : '(max-width: 768px) 100vw, 400px'}
        />
      </div>
    )
  }

  // Get scene illustration for a paragraph index
  const getSceneIllustration = (paragraphIndex: number) => {
    if (!illustrationStatus?.scenes) return null
    return illustrationStatus.scenes.find(s => s.paragraphIndex === paragraphIndex)
  }

  // Calculate illustration progress
  const getProgressCount = () => {
    if (!illustrationStatus) return { completed: 0, total: 0 }

    const total = 1 + (story?.generation_metadata?.v3_story?.paragraphs?.length || 0)
    const coverComplete = illustrationStatus.cover?.status === 'success' ? 1 : 0
    const scenesComplete = (illustrationStatus.scenes || []).filter(s => s.status === 'success').length
    const completed = coverComplete + scenesComplete

    return { completed, total }
  }

  // Check if illustrations are enabled and in progress or complete
  const hasIllustrations = story?.generation_metadata?.include_illustrations === true
  const showIllustrationUI = hasIllustrations && (illustrationStatus || triggeringIllustrations || illustrationError)

  return (
    <div className="min-h-screen bg-gray-50">
      <div className="max-w-4xl mx-auto px-4 sm:px-6 py-4 md:py-6">
        {/* Edit Mode Warning Banner */}
        {isEditMode && (
          <div className="mb-6 p-4 bg-blue-50 border border-blue-200 rounded-lg">
            <div className="flex items-center gap-2 text-blue-800">
              <Edit2 className="w-5 h-5" />
              <p className="font-medium">Edit Mode Active</p>
            </div>
            <p className="text-sm text-blue-700 mt-1">
              Changes are automatically saved to your browser. Click the save icon to save permanently.
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
                  className="text-2xl sm:text-3xl md:text-4xl font-display font-bold text-gray-800 text-center flex-1 min-w-0 w-full border-2 border-primary-300 rounded-lg px-4 py-2 focus:outline-none focus:border-primary-500"
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

            {/* Metadata Line */}
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
              {story.generation_metadata?.characters?.[0] && (
                <>
                  <span className="text-gray-400">•</span>
                  <span className="font-medium text-gray-700">
                    {story.generation_metadata.characters[0].name}
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

            {/* Divider */}
            <div className="border-t border-gray-200 mb-6"></div>

            {/* Cover Illustration */}
            {showIllustrationUI ? (
              <div className="max-w-2xl mx-auto">
                {illustrationError ? (
                  <div className="relative w-full rounded-2xl overflow-hidden bg-gradient-to-br from-red-50 to-pink-50 border-2 border-dashed border-red-200 aspect-square">
                    <div className="absolute inset-0 flex flex-col items-center justify-center p-8 text-center">
                      <ImageOff className="w-16 h-16 text-red-300 mb-4" />
                      <p className="text-red-600 font-medium mb-2">Failed to generate illustrations</p>
                      <p className="text-red-400 text-sm max-w-xs mb-4">{illustrationError}</p>
                      <button
                        onClick={triggerIllustrationGeneration}
                        disabled={triggeringIllustrations}
                        className="inline-flex items-center gap-2 px-4 py-2 bg-red-100 text-red-700 rounded-lg hover:bg-red-200 transition-colors disabled:opacity-50"
                      >
                        <RefreshCw className={`w-4 h-4 ${triggeringIllustrations ? 'animate-spin' : ''}`} />
                        Retry
                      </button>
                    </div>
                  </div>
                ) : (
                  <IllustrationSlot
                    status={illustrationStatus?.cover?.status}
                    tempUrl={illustrationStatus?.cover?.tempUrl}
                    imageUrl={illustrationStatus?.cover?.imageUrl}
                    alt={`Cover illustration for ${story.title}`}
                    size="large"
                  />
                )}
              </div>
            ) : hasIllustrations ? (
              // Illustrations enabled but not yet triggered - show loading
              <div className="relative w-full max-w-2xl mx-auto rounded-2xl overflow-hidden bg-gradient-to-br from-purple-50 to-indigo-50 border-2 border-dashed border-purple-200 aspect-square">
                <div className="absolute inset-0 flex flex-col items-center justify-center p-8 text-center">
                  <Loader2 className="w-16 h-16 text-purple-400 animate-spin mb-4" />
                  <p className="text-purple-600 font-medium mb-2">Preparing illustrations...</p>
                  <p className="text-purple-400 text-sm max-w-xs">
                    Your beautiful illustrations will appear here shortly
                  </p>
                </div>
              </div>
            ) : null}

            {/* Starring Row */}
            {story.generation_metadata?.characters && story.generation_metadata.characters.length > 0 && (
              <div className="mt-6 flex items-center justify-center gap-2 flex-wrap">
                <span className="text-sm text-gray-600">Starring:</span>
                {story.generation_metadata.characters.map((char, idx) => (
                  <div key={idx} className="flex items-center gap-2">
                    <span className="text-sm font-medium text-gray-700">
                      {char.name}
                    </span>
                    {idx < (story.generation_metadata.characters?.length || 0) - 1 && (
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
              const sceneIllustration = getSceneIllustration(index)
              const showSceneIllustration = showIllustrationUI && sceneIllustration

              return (
                <div key={index} className="mb-8">
                  {/* Scene Illustration */}
                  {showSceneIllustration && (
                    <div className="mb-6 max-w-2xl mx-auto">
                      <IllustrationSlot
                        status={sceneIllustration.status}
                        tempUrl={sceneIllustration.tempUrl}
                        imageUrl={sceneIllustration.imageUrl}
                        alt={`Illustration for paragraph ${index + 1}`}
                        size="large"
                      />
                    </div>
                  )}

                  {/* Paragraph Text */}
                  {isEditMode ? (
                    <textarea
                      value={paragraph}
                      onChange={(e) => handleParagraphChange(index, e.target.value)}
                      className="w-full text-gray-800 leading-relaxed text-base md:text-lg border-2 border-primary-200 rounded-lg p-4 focus:outline-none focus:border-primary-500 min-h-[120px]"
                      style={{ lineHeight: '1.8' }}
                      placeholder={`Paragraph ${index + 1}...`}
                    />
                  ) : (
                    <p className="text-gray-800 leading-relaxed text-base md:text-lg" style={{ lineHeight: '1.8' }}>
                      {paragraph}
                    </p>
                  )}
                </div>
              )
            })}

            {/* Moral Section */}
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
