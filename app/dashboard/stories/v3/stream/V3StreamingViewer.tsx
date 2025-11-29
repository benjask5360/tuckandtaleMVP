'use client'

import { useEffect, useState, useRef, useCallback } from 'react'
import { useSearchParams, useRouter } from 'next/navigation'
import Link from 'next/link'
import { ArrowLeft, Loader2, Sparkles, AlertCircle, Heart } from 'lucide-react'

interface StreamingState {
  title: string | null
  paragraphs: string[]
  moral: string | null
  error: string | null
  isComplete: boolean
  storyId: string | null
  started: boolean
}

export default function V3StreamingViewer() {
  const searchParams = useSearchParams()
  const router = useRouter()
  const abortControllerRef = useRef<AbortController | null>(null)
  const hasStartedRef = useRef(false)

  const [state, setState] = useState<StreamingState>({
    title: null,
    paragraphs: [],
    moral: null,
    error: null,
    isComplete: false,
    storyId: null,
    started: false,
  })

  const startStream = useCallback(async (params: string) => {
    // Prevent double-start
    if (hasStartedRef.current) return
    hasStartedRef.current = true

    setState(prev => ({ ...prev, started: true }))

    // Create abort controller for cleanup
    abortControllerRef.current = new AbortController()

    try {
      // Ensure params is a valid string before sending
      if (!params || typeof params !== 'string' || params.length === 0) {
        setState(prev => ({ ...prev, error: 'Invalid parameters - cannot generate story' }))
        return
      }

      const response = await fetch('/api/story-engine/v3/stream', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: params,
        signal: abortControllerRef.current.signal,
      })

      if (!response.ok) {
        const errorData = await response.json().catch(() => ({ error: 'Request failed' }))
        setState(prev => ({ ...prev, error: errorData.error || 'Failed to start generation' }))
        return
      }

      const reader = response.body?.getReader()
      if (!reader) {
        setState(prev => ({ ...prev, error: 'Failed to start stream' }))
        return
      }

      const decoder = new TextDecoder()
      let buffer = ''

      while (true) {
        const { done, value } = await reader.read()
        if (done) break

        buffer += decoder.decode(value, { stream: true })

        // Process complete SSE messages
        const lines = buffer.split('\n')
        buffer = lines.pop() || '' // Keep incomplete line in buffer

        for (const line of lines) {
          if (line.startsWith('data: ')) {
            try {
              const event = JSON.parse(line.slice(6))

              switch (event.type) {
                case 'started':
                  // Stream started, already in loading state
                  break

                case 'title':
                  setState(prev => ({ ...prev, title: event.text }))
                  break

                case 'paragraph':
                  setState(prev => {
                    const updated = [...prev.paragraphs]
                    updated[event.index] = event.text
                    return { ...prev, paragraphs: updated }
                  })
                  break

                case 'moral':
                  setState(prev => ({ ...prev, moral: event.text }))
                  break

                case 'complete':
                  setState(prev => ({
                    ...prev,
                    isComplete: true,
                    storyId: event.storyId,
                  }))
                  // Redirect to permanent story URL after a short delay
                  setTimeout(() => {
                    router.replace(`/dashboard/stories/v3/${event.storyId}`)
                  }, 1500)
                  break

                case 'error':
                  setState(prev => ({ ...prev, error: event.message }))
                  break
              }
            } catch {
              // Ignore parse errors for incomplete JSON
            }
          }
        }
      }
    } catch (err: any) {
      if (err.name === 'AbortError') {
        // User navigated away, ignore
        return
      }
      setState(prev => ({
        ...prev,
        error: err.message || 'Stream connection failed',
      }))
    }
  }, [router])

  useEffect(() => {
    // Track if this effect instance is still active (for React Strict Mode)
    let isActive = true

    const encodedParams = searchParams.get('params')

    if (!encodedParams) {
      setState(prev => ({ ...prev, error: 'Missing generation parameters' }))
      return
    }

    // Params are already JSON string (URL decoded automatically by searchParams)
    // But we need to validate it's valid JSON before sending
    try {
      JSON.parse(encodedParams) // Validate it's valid JSON
    } catch {
      setState(prev => ({ ...prev, error: 'Invalid generation parameters' }))
      return
    }

    // Delay the fetch slightly to avoid React Strict Mode cleanup race condition
    const timeoutId = setTimeout(() => {
      if (isActive) {
        startStream(encodedParams)
      }
    }, 0)

    // Cleanup on unmount - but don't abort immediately
    // The hasStartedRef check in startStream prevents double execution
    return () => {
      isActive = false
      clearTimeout(timeoutId)
      // Only abort if we're actually navigating away, not just re-rendering
      // The AbortController will be cleaned up when component fully unmounts
    }
  }, [searchParams, startStream])

  const handleTryAgain = () => {
    router.back()
  }

  return (
    <div className="min-h-screen bg-gray-50">
      <div className="max-w-4xl mx-auto px-4 sm:px-6 py-4 md:py-6">
        {/* Back link (hidden during streaming) */}
        {(state.error || state.isComplete) && (
          <Link
            href="/dashboard/stories/create"
            className="inline-flex items-center gap-2 text-primary-600 active:text-primary-700 md:hover:text-primary-700 font-semibold mb-6 min-h-[44px] transition-colors"
          >
            <ArrowLeft className="w-4 h-4 md:w-5 md:h-5" />
            Back to Create Story
          </Link>
        )}

        {/* Progress indicator */}
        {!state.isComplete && !state.error && (
          <div className="mb-6 p-4 bg-blue-50 border border-blue-200 rounded-lg">
            <div className="flex items-center gap-3">
              <Loader2 className="w-5 h-5 text-blue-600 animate-spin flex-shrink-0" />
              <div className="flex-1">
                <p className="text-blue-800 font-medium">
                  {!state.started
                    ? 'Preparing your story...'
                    : !state.title
                    ? 'Creating your story...'
                    : `Writing your story... ${state.paragraphs.length > 0 ? `(${state.paragraphs.length} paragraphs)` : ''}`}
                </p>
                <p className="text-blue-600 text-sm mt-1">
                  Your story will appear below as it's being written
                </p>
              </div>
            </div>
          </div>
        )}

        {/* Error display */}
        {state.error && (
          <div className="mb-6 p-4 bg-red-50 border border-red-200 rounded-lg">
            <div className="flex items-start gap-3">
              <AlertCircle className="w-5 h-5 text-red-600 flex-shrink-0 mt-0.5" />
              <div className="flex-1">
                <p className="text-red-800 font-medium">Generation Failed</p>
                <p className="text-red-700 text-sm mt-1">{state.error}</p>
                <button
                  onClick={handleTryAgain}
                  className="mt-3 btn-secondary text-sm"
                >
                  Try Again
                </button>
              </div>
            </div>
          </div>
        )}

        {/* Success message */}
        {state.isComplete && (
          <div className="mb-6 p-4 bg-blue-50 border border-blue-200 rounded-lg">
            <div className="flex items-center gap-3">
              <Sparkles className="w-5 h-5 text-blue-600" />
              <div>
                <p className="text-blue-800 font-medium">Story Complete!</p>
                <p className="text-blue-600 text-sm">Redirecting to your story...</p>
              </div>
            </div>
          </div>
        )}

        {/* Title (appears first) */}
        {state.title && (
          <div className="card p-6 md:p-8 mb-6">
            <h1 className="text-2xl sm:text-3xl md:text-4xl font-display font-bold text-gray-800 text-center">
              {state.title}
            </h1>
          </div>
        )}

        {/* Story Content */}
        {(state.paragraphs.length > 0 || (!state.error && state.started)) && (
          <div className="card p-6 md:p-8 lg:p-12">
            <div className="max-w-none space-y-6">
              {state.paragraphs.map((text, index) => (
                <p
                  key={index}
                  className="text-gray-800 leading-relaxed text-base md:text-lg animate-fadeIn"
                  style={{ lineHeight: '1.8' }}
                >
                  {text}
                </p>
              ))}

              {/* Skeleton for next paragraph while streaming */}
              {!state.isComplete && !state.error && state.started && (
                <div className="animate-pulse space-y-3">
                  <div className="h-4 bg-gray-200 rounded w-full"></div>
                  <div className="h-4 bg-gray-200 rounded w-11/12"></div>
                  <div className="h-4 bg-gray-200 rounded w-4/5"></div>
                </div>
              )}
            </div>

            {/* Moral Section */}
            {state.moral && (
              <div className="mt-12 mb-4 p-6 md:p-8 bg-primary-50 rounded-2xl border border-primary-200">
                <div className="flex items-start gap-3">
                  <Heart className="w-5 h-5 text-primary-600 flex-shrink-0 mt-1" />
                  <div>
                    <h3 className="font-bold text-lg text-primary-900 mb-3">
                      The Moral of the Story
                    </h3>
                    <p className="text-primary-800 text-base md:text-lg leading-relaxed">
                      {state.moral}
                    </p>
                  </div>
                </div>
              </div>
            )}
          </div>
        )}

        {/* Empty state while waiting */}
        {!state.title && !state.error && state.started && (
          <div className="card p-12 text-center">
            <div className="w-16 h-16 mx-auto mb-4 rounded-full bg-blue-100 flex items-center justify-center">
              <Sparkles className="w-8 h-8 text-blue-600 animate-pulse" />
            </div>
            <p className="text-gray-600 mb-2">Your story is being crafted...</p>
            <p className="text-gray-400 text-sm">The title will appear here shortly</p>
          </div>
        )}
      </div>
    </div>
  )
}
