'use client'

import { useState, useEffect } from 'react'
import { createClient } from '@/lib/supabase/client'
import { useRouter } from 'next/navigation'
import { Loader2, Sparkles, Target, Heart } from 'lucide-react'

interface CharacterProfile {
  id: string
  name: string
  character_type: string
  avatar_cache?: {
    image_url: string
  }
}

interface StoryGenerationFormProps {
  childProfiles: CharacterProfile[]
}

interface StoryParameter {
  id: string
  type: string
  name: string
  display_name: string
  description: string
  metadata: any
  display_order: number
}

interface GroupedParameters {
  genre?: StoryParameter[]
  tone?: StoryParameter[]
  length?: StoryParameter[]
  growth_category?: StoryParameter[]
  growth_topic?: StoryParameter[]
  moral_lesson?: StoryParameter[]
}

export default function StoryGenerationForm({ childProfiles }: StoryGenerationFormProps) {
  const router = useRouter()
  const supabase = createClient()

  // Configuration
  const MAX_ILLUSTRATED_CHARACTERS = 3

  // Form state
  const [heroId, setHeroId] = useState<string>(childProfiles[0]?.id || '')
  const [additionalCharacterIds, setAdditionalCharacterIds] = useState<string[]>([])
  const [mode, setMode] = useState<'fun' | 'growth'>('fun')
  const [genreId, setGenreId] = useState<string>('')
  const [toneId, setToneId] = useState<string>('')
  const [lengthId, setLengthId] = useState<string>('')
  const [growthCategoryId, setGrowthCategoryId] = useState<string>('')
  const [growthTopicId, setGrowthTopicId] = useState<string>('')
  const [moralLessonId, setMoralLessonId] = useState<string>('')
  const [customInstructions, setCustomInstructions] = useState<string>('')
  const [includeIllustrations, setIncludeIllustrations] = useState<boolean>(false)
  const [characterLimitMessage, setCharacterLimitMessage] = useState<string | null>(null)

  // Data state
  const [parameters, setParameters] = useState<GroupedParameters>({})
  const [loading, setLoading] = useState(true)
  const [generating, setGenerating] = useState(false)
  const [error, setError] = useState<string | null>(null)

  useEffect(() => {
    loadParameters()
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [])

  const loadParameters = async () => {
    try {
      const response = await fetch('/api/stories/parameters')
      const data = await response.json()

      if (!response.ok) throw new Error(data.error || 'Failed to load parameters')

      setParameters(data.parameters)

      // Set default selections
      if (data.parameters.genre?.[0]) setGenreId(data.parameters.genre[0].id)
      if (data.parameters.tone?.[0]) setToneId(data.parameters.tone[0].id)
      if (data.parameters.length?.[1]) setLengthId(data.parameters.length[1].id) // Medium by default
    } catch (err: any) {
      console.error('Error loading parameters:', err)
      setError(err.message)
    } finally {
      setLoading(false)
    }
  }

  const filteredGrowthTopics = parameters.growth_topic?.filter(topic => {
    if (!growthCategoryId) return true
    const selectedCategory = parameters.growth_category?.find(c => c.id === growthCategoryId)
    return topic.metadata?.category_name === selectedCategory?.name
  })

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault()
    setGenerating(true)
    setError(null)

    try {
      const requestBody: any = {
        heroId,
        mode,
        genreId,
        toneId,
        lengthId,
        characterIds: additionalCharacterIds,
        adHocCharacters: [],
      }

      if (mode === 'growth' && growthTopicId) {
        requestBody.growthTopicId = growthTopicId
      }

      if (mode === 'fun' && moralLessonId) {
        requestBody.moralLessonId = moralLessonId
      }

      if (customInstructions.trim()) {
        requestBody.customInstructions = customInstructions.trim()
      }

      // Add includeIllustrations flag
      requestBody.includeIllustrations = includeIllustrations

      // Use text story generation API endpoint
      const endpoint = '/api/stories/generate'

      const response = await fetch(endpoint, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(requestBody),
      })

      const data = await response.json()

      if (!response.ok) {
        if (response.status === 429) {
          throw new Error(`You've reached your story generation limit. ${data.error}`)
        }
        throw new Error(data.error || 'Failed to generate story')
      }

      // Success! Redirect to the story viewer
      router.push(`/dashboard/stories/${data.story.id}`)
    } catch (err: any) {
      console.error('Error generating story:', err)
      setError(err.message)
      setGenerating(false)
    }
  }

  if (loading) {
    return (
      <div className="text-center py-8">
        <Loader2 className="w-8 h-8 animate-spin text-primary-600 mx-auto mb-4" />
        <p className="text-gray-600">Loading story options...</p>
      </div>
    )
  }

  return (
    <form onSubmit={handleSubmit} className="space-y-6">
      {/* Include Illustrations Toggle */}
      <div>
        <label className="block text-sm font-semibold text-gray-900 mb-2">
          Include Illustrations
        </label>
        <div className="flex items-center space-x-3">
          <button
            type="button"
            onClick={() => {
              setIncludeIllustrations(!includeIllustrations)
              // Clear character limit message when toggling
              setCharacterLimitMessage(null)
            }}
            className={`relative inline-flex h-6 w-11 items-center rounded-full transition-colors ${
              includeIllustrations ? 'bg-primary-600' : 'bg-gray-200'
            }`}
          >
            <span className="sr-only">Include illustrations</span>
            <span
              className={`inline-block h-4 w-4 transform rounded-full bg-white transition-transform ${
                includeIllustrations ? 'translate-x-6' : 'translate-x-1'
              }`}
            />
          </button>
          {includeIllustrations && (
            <span className="text-sm text-gray-600">
              Story will include personalized illustrations inspired by each scene.
            </span>
          )}
        </div>
      </div>

      {/* Hero Selection */}
      <div>
        <label className="block text-sm font-semibold text-gray-900 mb-3">
          Who is the hero of this story? <span className="text-red-500">*</span>
        </label>
        <div className="grid grid-cols-2 sm:grid-cols-3 md:grid-cols-4 gap-3">
          {childProfiles.filter(p => p.character_type === 'child').map(child => (
            <button
              key={child.id}
              type="button"
              onClick={() => {
                setHeroId(child.id)
                // Remove the new hero from additional characters if they were selected
                setAdditionalCharacterIds(prev => prev.filter(id => id !== child.id))
              }}
              className={`flex flex-col items-center p-3 rounded-lg border-2 transition-all min-h-[120px] ${
                heroId === child.id
                  ? 'border-primary-600 bg-primary-50'
                  : 'border-gray-200 hover:border-gray-300'
              }`}
            >
              {child.avatar_cache?.image_url ? (
                <img
                  src={child.avatar_cache.image_url}
                  alt={child.name}
                  className="w-16 h-16 rounded-full object-cover mb-2"
                />
              ) : (
                <div className="w-16 h-16 rounded-full bg-gray-200 flex items-center justify-center mb-2">
                  <span className="text-2xl text-gray-400">👤</span>
                </div>
              )}
              <span className="text-sm font-medium text-gray-900 text-center">{child.name}</span>
            </button>
          ))}
        </div>
      </div>

      {/* Additional Characters Selection */}
      <div>
        <label className="block text-sm font-semibold text-gray-900 mb-3">
          Who else should be in the story? (Optional)
        </label>
        <div className="grid grid-cols-2 sm:grid-cols-3 md:grid-cols-4 gap-3">
          {/* Show non-hero children first, then other character types */}
          {childProfiles
            .filter(p => p.id !== heroId) // Exclude the hero
            .sort((a, b) => {
              // Sort children first, then others
              if (a.character_type === 'child' && b.character_type !== 'child') return -1
              if (a.character_type !== 'child' && b.character_type === 'child') return 1
              return 0
            })
            .map(character => (
            <button
              key={character.id}
              type="button"
              onClick={() => {
                const totalCharacters = 1 + additionalCharacterIds.length // 1 for hero
                const isCharacterSelected = additionalCharacterIds.includes(character.id)

                // If deselecting, always allow
                if (isCharacterSelected) {
                  setAdditionalCharacterIds(prev => prev.filter(id => id !== character.id))
                  setCharacterLimitMessage(null)
                  return
                }

                // If selecting and illustrations are on, check limit
                if (includeIllustrations && totalCharacters >= MAX_ILLUSTRATED_CHARACTERS) {
                  setCharacterLimitMessage(`Illustrated stories support up to ${MAX_ILLUSTRATED_CHARACTERS} characters.`)
                  return
                }

                // Otherwise, add the character
                setAdditionalCharacterIds(prev => [...prev, character.id])
                setCharacterLimitMessage(null)
              }}
              disabled={
                includeIllustrations &&
                !additionalCharacterIds.includes(character.id) &&
                (1 + additionalCharacterIds.length) >= MAX_ILLUSTRATED_CHARACTERS
              }
              className={`flex flex-col items-center p-3 rounded-lg border-2 transition-all min-h-[120px] ${
                additionalCharacterIds.includes(character.id)
                  ? 'border-primary-600 bg-primary-50'
                  : includeIllustrations && (1 + additionalCharacterIds.length) >= MAX_ILLUSTRATED_CHARACTERS
                  ? 'border-gray-200 opacity-50 cursor-not-allowed'
                  : 'border-gray-200 hover:border-gray-300'
              }`}
            >
              {character.avatar_cache?.image_url ? (
                <img
                  src={character.avatar_cache.image_url}
                  alt={character.name}
                  className="w-16 h-16 rounded-full object-cover mb-2"
                />
              ) : (
                <div className="w-16 h-16 rounded-full bg-gray-200 flex items-center justify-center mb-2">
                  <span className="text-2xl text-gray-400">
                    {character.character_type === 'child' ? '👤' : character.character_type === 'pet' ? '🐾' : '✨'}
                  </span>
                </div>
              )}
              <span className="text-sm font-medium text-gray-900 text-center">{character.name}</span>
              <span className="text-xs text-gray-500 capitalize mt-1">{character.character_type}</span>
            </button>
          ))}
        </div>

        {/* Character count and helper text when illustrations are enabled */}
        {includeIllustrations && (
          <div className="mt-3 space-y-2">
            <p className="text-sm text-gray-600">
              With illustrations enabled, you can choose up to {MAX_ILLUSTRATED_CHARACTERS} characters for the clearest artwork.
            </p>
            <p className="text-sm text-gray-600">
              {1 + additionalCharacterIds.length} / {MAX_ILLUSTRATED_CHARACTERS} characters selected
            </p>
          </div>
        )}

        {/* Soft inline message when limit is reached */}
        {characterLimitMessage && (
          <div className="mt-3 p-3 bg-blue-50 border border-blue-200 rounded-lg">
            <p className="text-gray-700 text-sm">{characterLimitMessage}</p>
          </div>
        )}

        {!includeIllustrations && additionalCharacterIds.length === 0 && (
          <p className="text-sm text-gray-500 mt-2">No additional characters selected</p>
        )}
      </div>

      {/* Story Mode */}
      <div>
        <label className="block text-sm font-semibold text-gray-900 mb-3">
          What kind of story? <span className="text-red-500">*</span>
        </label>
        <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
          <button
            type="button"
            onClick={() => setMode('fun')}
            className={`p-4 rounded-lg border-2 transition-all text-left min-h-[44px] ${
              mode === 'fun'
                ? 'border-primary-600 bg-primary-50'
                : 'border-gray-200 hover:border-gray-300'
            }`}
          >
            <div className="flex items-start gap-3">
              <Sparkles className={`w-5 h-5 flex-shrink-0 mt-0.5 ${mode === 'fun' ? 'text-primary-600' : 'text-gray-400'}`} />
              <div>
                <div className="font-semibold text-gray-900">Just for Fun</div>
                <div className="text-sm text-gray-600">Imaginative bedtime stories</div>
              </div>
            </div>
          </button>

          <button
            type="button"
            onClick={() => setMode('growth')}
            className={`p-4 rounded-lg border-2 transition-all text-left min-h-[44px] ${
              mode === 'growth'
                ? 'border-primary-600 bg-primary-50'
                : 'border-gray-200 hover:border-gray-300'
            }`}
          >
            <div className="flex items-start gap-3">
              <Target className={`w-5 h-5 flex-shrink-0 mt-0.5 ${mode === 'growth' ? 'text-primary-600' : 'text-gray-400'}`} />
              <div>
                <div className="font-semibold text-gray-900">Help My Child Grow</div>
                <div className="text-sm text-gray-600">Stories that teach life skills</div>
              </div>
            </div>
          </button>
        </div>
      </div>

      {/* Growth Category & Topic (only for growth mode) */}
      {mode === 'growth' && (
        <>
          <div>
            <label htmlFor="growthCategory" className="block text-sm font-semibold text-gray-900 mb-2">
              What area should we focus on? <span className="text-red-500">*</span>
            </label>
            <select
              id="growthCategory"
              value={growthCategoryId}
              onChange={(e) => {
                setGrowthCategoryId(e.target.value)
                setGrowthTopicId('') // Reset topic when category changes
              }}
              required={mode === 'growth'}
              className="w-full px-4 py-3 border border-gray-300 rounded-lg focus:ring-2 focus:ring-primary-500 focus:border-primary-500"
            >
              <option value="">Select a growth area...</option>
              {parameters.growth_category?.map(category => (
                <option key={category.id} value={category.id}>
                  {category.metadata?.icon} {category.display_name}
                </option>
              ))}
            </select>
            {growthCategoryId && parameters.growth_category?.find(c => c.id === growthCategoryId)?.metadata?.description_long && (
              <p className="mt-2 text-sm text-gray-600">
                {parameters.growth_category.find(c => c.id === growthCategoryId)?.metadata?.description_long}
              </p>
            )}
          </div>

          {growthCategoryId && (
            <div>
              <label htmlFor="growthTopic" className="block text-sm font-semibold text-gray-900 mb-2">
                What specific topic? <span className="text-red-500">*</span>
              </label>
              <select
                id="growthTopic"
                value={growthTopicId}
                onChange={(e) => setGrowthTopicId(e.target.value)}
                required={mode === 'growth'}
                className="w-full px-4 py-3 border border-gray-300 rounded-lg focus:ring-2 focus:ring-primary-500 focus:border-primary-500"
              >
                <option value="">Select a topic...</option>
                {filteredGrowthTopics?.map(topic => (
                  <option key={topic.id} value={topic.id}>
                    {topic.display_name}
                  </option>
                ))}
              </select>
              {growthTopicId && filteredGrowthTopics?.find(t => t.id === growthTopicId)?.description && (
                <p className="mt-2 text-sm text-gray-600">
                  {filteredGrowthTopics.find(t => t.id === growthTopicId)?.description}
                </p>
              )}
            </div>
          )}
        </>
      )}

      {/* Moral Lesson (optional for fun mode) */}
      {mode === 'fun' && parameters.moral_lesson && (
        <div>
          <label htmlFor="moralLesson" className="block text-sm font-semibold text-gray-900 mb-2">
            Add a moral lesson? (Optional)
          </label>
          <select
            id="moralLesson"
            value={moralLessonId}
            onChange={(e) => setMoralLessonId(e.target.value)}
            className="w-full px-4 py-3 border border-gray-300 rounded-lg focus:ring-2 focus:ring-primary-500 focus:border-primary-500"
          >
            <option value="">No specific moral</option>
            {parameters.moral_lesson?.map(lesson => (
              <option key={lesson.id} value={lesson.id}>
                {lesson.display_name}
              </option>
            ))}
          </select>
        </div>
      )}

      {/* Genre */}
      <div>
        <label htmlFor="genre" className="block text-sm font-semibold text-gray-900 mb-2">
          What genre? <span className="text-red-500">*</span>
        </label>
        <select
          id="genre"
          value={genreId}
          onChange={(e) => setGenreId(e.target.value)}
          required
          className="w-full px-4 py-3 border border-gray-300 rounded-lg focus:ring-2 focus:ring-primary-500 focus:border-primary-500"
        >
          {parameters.genre?.map(genre => (
            <option key={genre.id} value={genre.id}>
              {genre.display_name}
            </option>
          ))}
        </select>
      </div>

      {/* Tone */}
      <div>
        <label htmlFor="tone" className="block text-sm font-semibold text-gray-900 mb-2">
          What writing style? <span className="text-red-500">*</span>
        </label>
        <select
          id="tone"
          value={toneId}
          onChange={(e) => setToneId(e.target.value)}
          required
          className="w-full px-4 py-3 border border-gray-300 rounded-lg focus:ring-2 focus:ring-primary-500 focus:border-primary-500"
        >
          {parameters.tone?.map(tone => (
            <option key={tone.id} value={tone.id}>
              {tone.display_name}
            </option>
          ))}
        </select>
      </div>

      {/* Length */}
      <div>
        <label htmlFor="length" className="block text-sm font-semibold text-gray-900 mb-2">
          How long? <span className="text-red-500">*</span>
        </label>
        <div className="grid grid-cols-1 sm:grid-cols-3 gap-3">
          {parameters.length?.map(length => (
            <button
              key={length.id}
              type="button"
              onClick={() => setLengthId(length.id)}
              className={`p-4 rounded-lg border-2 transition-all text-center min-h-[44px] ${
                lengthId === length.id
                  ? 'border-primary-600 bg-primary-50'
                  : 'border-gray-200 hover:border-gray-300'
              }`}
            >
              <div className="font-semibold text-gray-900">{length.display_name}</div>
              {length.description && (
                <div className="text-sm text-gray-600 mt-1">{length.description}</div>
              )}
            </button>
          ))}
        </div>
      </div>

      {/* Custom Instructions */}
      <div>
        <label htmlFor="customInstructions" className="block text-sm font-semibold text-gray-900 mb-2">
          Any special requests? (Optional)
        </label>
        <textarea
          id="customInstructions"
          value={customInstructions}
          onChange={(e) => setCustomInstructions(e.target.value)}
          rows={3}
          placeholder="E.g., Include their favorite toy, set it in a specific location, etc."
          className="w-full px-4 py-3 border border-gray-300 rounded-lg focus:ring-2 focus:ring-primary-500 focus:border-primary-500 resize-none"
        />
      </div>

      {/* Error Display */}
      {error && (
        <div className="p-4 bg-red-50 border border-red-200 rounded-lg">
          <p className="text-red-800 text-sm">{error}</p>
        </div>
      )}

      {/* Disclaimer */}
      <div className="pt-2 pb-2">
        <p className="text-xs text-gray-500 text-center italic">
          Story style names are used for descriptive purposes only and are not affiliated with or endorsed by any brand.
        </p>
      </div>

      {/* Submit Button */}
      <div className="pt-2">
        <button
          type="submit"
          disabled={generating || !heroId || !genreId || !toneId || !lengthId || (mode === 'growth' && !growthTopicId)}
          className="w-full btn-primary min-h-[44px] flex items-center justify-center gap-2"
        >
          {generating ? (
            <>
              <Loader2 className="w-5 h-5 animate-spin" />
              Generating your story... (this may take 30-60 seconds)
            </>
          ) : (
            <>
              <Sparkles className="w-5 h-5" />
              Generate Story
            </>
          )}
        </button>
        {!generating && (
          <p className="text-sm text-gray-600 text-center mt-2">
            Story generation typically takes 30-60 seconds
          </p>
        )}
      </div>
    </form>
  )
}
