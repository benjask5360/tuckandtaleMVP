'use client'

import { useState, useEffect } from 'react'
import { useRouter } from 'next/navigation'
import { Loader2, Sparkles, Target, Plus, AlertTriangle } from 'lucide-react'
import Link from 'next/link'

interface CharacterProfile {
  id: string
  name: string
  character_type: string
  avatar_cache?: {
    image_url: string
  }
}

interface PaywallStatus {
  requiresPaywall: boolean
  storyNumber: number
  hasCredits: boolean
  hasSubscription: boolean
  freeTrialAvailable: boolean
  canGenerate: boolean
  reason?: string
  hasActiveSubscription: boolean
  storiesUsedThisMonth: number
  storiesRemaining: number
  monthlyLimit: number
  daysUntilReset: number | null
  generationCredits: number
}

interface StoryGenerationFormProps {
  childProfiles: CharacterProfile[]
  paywallStatus?: PaywallStatus
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

// Free trial warning modal component
function FreeTrialWarningModal({
  isOpen,
  onClose,
  onConfirm,
}: {
  isOpen: boolean
  onClose: () => void
  onConfirm: () => void
}) {
  if (!isOpen) return null

  return (
    <div className="fixed inset-0 bg-black bg-opacity-50 flex items-center justify-center z-50 p-4">
      <div className="bg-white rounded-2xl p-6 md:p-8 max-w-md w-full">
        <div className="flex items-start gap-4 mb-4">
          <div className="w-12 h-12 bg-amber-100 rounded-full flex items-center justify-center flex-shrink-0">
            <AlertTriangle className="w-6 h-6 text-amber-600" />
          </div>
          <div>
            <h3 className="text-xl font-semibold text-gray-900 mb-2">
              Skip Free Illustrations?
            </h3>
            <p className="text-gray-600">
              Your first story includes <strong>free illustrations</strong>. Are you sure you want to create a text-only story instead?
            </p>
            <p className="text-sm text-gray-500 mt-2">
              You can still use your free illustrated story later.
            </p>
          </div>
        </div>

        <div className="flex gap-3 mt-6">
          <button
            onClick={onClose}
            className="flex-1 px-4 py-3 border border-gray-300 text-gray-700 rounded-xl font-semibold hover:bg-gray-50 transition-colors"
          >
            Go Back
          </button>
          <button
            onClick={onConfirm}
            className="flex-1 px-4 py-3 bg-gray-900 text-white rounded-xl font-semibold hover:bg-gray-800 transition-colors"
          >
            Skip Illustrations
          </button>
        </div>
      </div>
    </div>
  )
}

export default function StoryGenerationForm({ childProfiles, paywallStatus }: StoryGenerationFormProps) {
  const router = useRouter()

  // Form state
  const [heroId, setHeroId] = useState<string>(childProfiles.find(p => p.character_type === 'child')?.id || '')
  const [additionalCharacterIds, setAdditionalCharacterIds] = useState<string[]>([])
  const [mode, setMode] = useState<'fun' | 'growth'>('fun')
  const [genreId, setGenreId] = useState<string>('')
  const [toneId, setToneId] = useState<string>('')
  const [lengthId, setLengthId] = useState<string>('')
  const [growthCategoryId, setGrowthCategoryId] = useState<string>('')
  const [growthTopicId, setGrowthTopicId] = useState<string>('')
  const [moralLessonId, setMoralLessonId] = useState<string>('')
  const [customInstructions, setCustomInstructions] = useState<string>('')
  const [includeIllustrations, setIncludeIllustrations] = useState<boolean>(true) // Default to true now
  const [showFreeTrialWarning, setShowFreeTrialWarning] = useState(false)

  // Data state
  const [parameters, setParameters] = useState<GroupedParameters>({})
  const [loading, setLoading] = useState(true)
  const [generating, setGenerating] = useState(false)
  const [error, setError] = useState<string | null>(null)
  const [generatingMessageIndex, setGeneratingMessageIndex] = useState(0)

  // Rotating messages for generating state
  const generatingMessages = [
    'Building your magical story...',
    'Creating adventures...',
    'Weaving the perfect tale...',
    'Adding the finishing touches...',
  ]

  useEffect(() => {
    loadParameters()
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [])

  // Rotate generating messages
  useEffect(() => {
    if (!generating) {
      setGeneratingMessageIndex(0)
      return
    }
    const interval = setInterval(() => {
      setGeneratingMessageIndex(prev => (prev + 1) % generatingMessages.length)
    }, 4000)
    return () => clearInterval(interval)
  }, [generating, generatingMessages.length])

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

  // Check if we should show free trial warning before generating
  const shouldShowFreeTrialWarning = () => {
    // Show warning if:
    // - User has free trial available
    // - User is on story #1
    // - Illustrations are OFF
    // - User is not a subscriber
    return (
      paywallStatus?.freeTrialAvailable &&
      paywallStatus?.storyNumber === 1 &&
      !includeIllustrations &&
      !paywallStatus?.hasSubscription
    )
  }

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault()

    // Check if we need to warn about skipping free trial illustrations
    if (shouldShowFreeTrialWarning()) {
      setShowFreeTrialWarning(true)
      return
    }

    proceedWithGeneration()
  }

  const proceedWithGeneration = async () => {
    setGenerating(true)
    setError(null)
    setShowFreeTrialWarning(false)

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

      // Also pass hasCredits if user has generation credits
      if (paywallStatus?.hasCredits) {
        requestBody.useCredit = true
      }

      // Redirect to streaming viewer which calls the V3 streaming API
      const params = encodeURIComponent(JSON.stringify(requestBody))
      router.push(`/dashboard/stories/v3/stream?params=${params}`)
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
      <div
        onClick={() => {
          setIncludeIllustrations(!includeIllustrations)
          setCharacterLimitMessage(null)
        }}
        className={`cursor-pointer p-4 rounded-xl border-2 transition-all ${
          includeIllustrations
            ? 'border-primary-600 bg-primary-50'
            : 'border-gray-300 bg-white hover:border-primary-300'
        }`}
      >
        <div className="flex items-start gap-4">
          <div className="flex-shrink-0">
            <div className={`w-12 h-12 rounded-lg flex items-center justify-center ${
              includeIllustrations ? 'bg-primary-100' : 'bg-gray-100'
            }`}>
              <span className="text-2xl">🎨</span>
            </div>
          </div>
          <div className="flex-1">
            <div className="flex items-center justify-between mb-1">
              <h3 className={`text-base font-semibold ${
                includeIllustrations ? 'text-primary-900' : 'text-gray-900'
              }`}>
                Include Illustrations
              </h3>
              <button
                type="button"
                onClick={(e) => {
                  e.stopPropagation();
                  setIncludeIllustrations(!includeIllustrations);
                  setCharacterLimitMessage(null);
                }}
                className={`relative inline-flex h-7 w-12 items-center rounded-full transition-colors ${
                  includeIllustrations ? 'bg-primary-600' : 'bg-gray-300'
                }`}
              >
                <span className="sr-only">Include illustrations</span>
                <span
                  className={`inline-block h-5 w-5 transform rounded-full bg-white transition-transform shadow-sm ${
                    includeIllustrations ? 'translate-x-6' : 'translate-x-1'
                  }`}
                />
              </button>
            </div>
            <p className={`text-sm ${
              includeIllustrations ? 'text-primary-700' : 'text-gray-600'
            }`}>
              {includeIllustrations
                ? 'Your story will include personalized illustrations inspired by each scene.'
                : 'Add beautiful illustrations to bring your story to life.'
              }
            </p>
          </div>
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
              className={`flex flex-col items-center p-3 rounded-lg border-2 transition-all min-h-[140px] ${
                heroId === child.id
                  ? 'border-primary-600 bg-primary-50'
                  : 'border-gray-200 hover:border-gray-300'
              }`}
            >
              {child.avatar_cache?.image_url ? (
                <img
                  src={child.avatar_cache.image_url}
                  alt={child.name}
                  className="w-20 h-20 rounded-lg object-cover object-top mb-2"
                />
              ) : (
                <div className="w-20 h-20 rounded-lg bg-gray-200 flex items-center justify-center mb-2">
                  <span className="text-2xl text-gray-400">👤</span>
                </div>
              )}
              <span className="text-sm font-medium text-gray-900 text-center">{child.name}</span>
            </button>
          ))}
        </div>
        <Link
          href="/dashboard/my-children/create?returnTo=/dashboard/stories/create"
          className="inline-flex items-center gap-1 text-sm text-primary-600 hover:text-primary-700 font-medium mt-3"
        >
          <Plus className="w-4 h-4" />
          Add New Child
        </Link>
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
                // Toggle character selection
                if (isCharacterSelected) {
                  setAdditionalCharacterIds(prev => prev.filter(id => id !== character.id))
                } else {
                  setAdditionalCharacterIds(prev => [...prev, character.id])
                }
              }}
              className={`flex flex-col items-center p-3 rounded-lg border-2 transition-all min-h-[140px] ${
                additionalCharacterIds.includes(character.id)
                  ? 'border-primary-600 bg-primary-50'
                  : 'border-gray-200 hover:border-gray-300'
              }`}
            >
              {character.avatar_cache?.image_url ? (
                <img
                  src={character.avatar_cache.image_url}
                  alt={character.name}
                  className="w-20 h-20 rounded-lg object-cover object-top mb-2"
                />
              ) : (
                <div className="w-20 h-20 rounded-lg bg-gray-200 flex items-center justify-center mb-2">
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

        {/* Warning banner when more than 3 characters selected */}
        {(1 + additionalCharacterIds.length) > 3 && (
          <div className="mt-3 p-3 bg-amber-50 border border-amber-200 rounded-lg">
            <p className="text-amber-800 text-sm">
              AI illustrations work best with up to 3 characters.
            </p>
          </div>
        )}

        {!includeIllustrations && additionalCharacterIds.length === 0 && (
          <p className="text-sm text-gray-500 mt-2">No additional characters selected</p>
        )}

        <Link
          href="/dashboard/other-characters/create?returnTo=/dashboard/stories/create"
          className="inline-flex items-center gap-1 text-sm text-primary-600 hover:text-primary-700 font-medium mt-3"
        >
          <Plus className="w-4 h-4" />
          Add New Character
        </Link>
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
            <label className="block text-sm font-semibold text-gray-900 mb-2">
              What area should we focus on? <span className="text-red-500">*</span>
            </label>
            <div className="grid grid-cols-1 md:grid-cols-2 gap-2">
              {parameters.growth_category?.map(category => {
                const emoji = category.metadata?.icon || '🌱';
                return (
                  <button
                    key={category.id}
                    type="button"
                    onClick={() => {
                      setGrowthCategoryId(category.id);
                      setGrowthTopicId(''); // Reset topic when category changes
                    }}
                    className={`px-3 py-2 rounded-lg border-2 transition-all flex items-center justify-start gap-2 ${
                      growthCategoryId === category.id
                        ? 'border-primary-600 bg-primary-50'
                        : 'border-gray-200 hover:border-gray-300'
                    }`}
                  >
                    <span className="text-base">{emoji}</span>
                    <span className={`text-sm font-medium whitespace-nowrap ${
                      growthCategoryId === category.id ? 'text-primary-700' : 'text-gray-700'
                    }`}>
                      {category.display_name}
                    </span>
                  </button>
                );
              })}
            </div>
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

      {/* Genre */}
      <div>
        <label className="block text-sm font-semibold text-gray-900 mb-3">
          What genre? <span className="text-red-500">*</span>
        </label>
        <div className="grid grid-cols-2 sm:grid-cols-3 lg:grid-cols-4 gap-2">
          {parameters.genre?.map(genre => {
            const genreEmojis: { [key: string]: string } = {
              'adventure': '⚔️',
              'fantasy': '✨',
              'fairy_tale': '🏰',
              'friendship': '🤝',
              'animals': '🐾',
              'space': '🚀',
              'family': '👨‍👩‍👧‍👦',
              'mystery': '🔍'
            };
            const emoji = genreEmojis[genre.name] || '📖';

            return (
              <button
                key={genre.id}
                type="button"
                onClick={() => setGenreId(genre.id)}
                className={`px-3 py-2 rounded-lg border-2 transition-all flex items-center justify-start gap-2 ${
                  genreId === genre.id
                    ? 'border-primary-600 bg-primary-50'
                    : 'border-gray-200 hover:border-gray-300'
                }`}
              >
                <span className="text-base">{emoji}</span>
                <span className={`text-sm font-medium whitespace-nowrap ${genreId === genre.id ? 'text-primary-700' : 'text-gray-700'}`}>
                  {genre.display_name}
                </span>
              </button>
            );
          })}
        </div>
      </div>

      {/* Tone */}
      <div>
        <label className="block text-sm font-semibold text-gray-900 mb-3">
          What writing style? <span className="text-red-500">*</span>
        </label>
        <div className="grid grid-cols-2 sm:grid-cols-3 lg:grid-cols-4 gap-2">
          {parameters.tone?.map(tone => {
            const toneEmojis: { [key: string]: string } = {
              'classic_bedtime': '🌙',
              'pixar_adventure': '🎬',
              'disney_princess': '👑',
              'funny_silly': '😄',
              'gentle_calming': '🕊️',
              'rhyming_seuss': '📝'
            };
            const emoji = toneEmojis[tone.name] || '✍️';

            return (
              <button
                key={tone.id}
                type="button"
                onClick={() => setToneId(tone.id)}
                className={`px-3 py-2 rounded-lg border-2 transition-all flex items-center justify-start gap-2 ${
                  toneId === tone.id
                    ? 'border-primary-600 bg-primary-50'
                    : 'border-gray-200 hover:border-gray-300'
                }`}
              >
                <span className="text-base">{emoji}</span>
                <span className={`text-sm font-medium whitespace-nowrap ${toneId === tone.id ? 'text-primary-700' : 'text-gray-700'}`}>
                  {tone.display_name}
                </span>
              </button>
            );
          })}
        </div>
      </div>

      {/* Length */}
      <div>
        <label className="block text-sm font-semibold text-gray-900 mb-3">
          How long? <span className="text-red-500">*</span>
        </label>
        <div className="grid grid-cols-1 md:grid-cols-3 gap-2">
          {parameters.length?.map(length => {
            const lengthEmojis: { [key: string]: string } = {
              'short': '⚡',
              'medium': '📖',
              'long': '📚'
            };
            const emoji = lengthEmojis[length.name] || '📄';

            return (
              <button
                key={length.id}
                type="button"
                onClick={() => setLengthId(length.id)}
                className={`px-3 py-2 rounded-lg border-2 transition-all flex items-center justify-start gap-2 ${
                  lengthId === length.id
                    ? 'border-primary-600 bg-primary-50'
                    : 'border-gray-200 hover:border-gray-300'
                }`}
              >
                <span className="text-base">{emoji}</span>
                <span className={`text-sm font-medium whitespace-nowrap ${lengthId === length.id ? 'text-primary-700' : 'text-gray-700'}`}>
                  {length.display_name}
                </span>
              </button>
            );
          })}
        </div>
      </div>

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
              {generatingMessages[generatingMessageIndex]}
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

      {/* Free Trial Warning Modal */}
      <FreeTrialWarningModal
        isOpen={showFreeTrialWarning}
        onClose={() => setShowFreeTrialWarning(false)}
        onConfirm={proceedWithGeneration}
      />
    </form>
  )
}
