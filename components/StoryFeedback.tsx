'use client'

import { useState } from 'react'
import { X, Loader2, Check } from 'lucide-react'

interface StoryFeedbackProps {
  storyId: string
  onFeedbackSubmitted?: () => void
}

type EmojiRating = 'loved' | 'okay' | 'meh' | null

const EMOJI_CONFIG = {
  loved: { emoji: '🥰', rating: 5, label: 'Loved it!', modalPrompt: 'What made it special?' },
  okay: { emoji: '🙂', rating: 3, label: 'It was okay', modalPrompt: 'What could be better?' },
  meh: { emoji: '😕', rating: 1, label: 'Not great', modalPrompt: "What didn't land?" },
} as const

export default function StoryFeedback({ storyId, onFeedbackSubmitted }: StoryFeedbackProps) {
  const [selectedEmoji, setSelectedEmoji] = useState<EmojiRating>(null)
  const [showModal, setShowModal] = useState(false)
  const [comment, setComment] = useState('')
  const [isSubmitting, setIsSubmitting] = useState(false)
  const [isSubmitted, setIsSubmitted] = useState(false)

  const handleEmojiClick = async (emojiKey: EmojiRating) => {
    if (!emojiKey || isSubmitted) return

    setSelectedEmoji(emojiKey)
    setShowModal(true)
  }

  const submitFeedback = async (includeComment: boolean) => {
    if (!selectedEmoji) return

    setIsSubmitting(true)

    try {
      const config = EMOJI_CONFIG[selectedEmoji]
      const response = await fetch('/api/reviews', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          story_id: storyId,
          rating: config.rating,
          comment: includeComment ? comment.trim() || null : null,
        }),
      })

      if (!response.ok) {
        throw new Error('Failed to submit feedback')
      }

      setIsSubmitted(true)
      setShowModal(false)
      onFeedbackSubmitted?.()
    } catch (error) {
      console.error('Error submitting feedback:', error)
      alert('Failed to submit feedback. Please try again.')
    } finally {
      setIsSubmitting(false)
    }
  }

  const handleSubmit = () => submitFeedback(true)
  const handleSkip = () => submitFeedback(false)

  const closeModal = () => {
    setShowModal(false)
    setSelectedEmoji(null)
    setComment('')
  }

  // Already submitted - show thank you state
  if (isSubmitted) {
    return (
      <div className="flex items-center justify-center gap-2 py-4 text-gray-600 animate-fade-in">
        <Check className="w-5 h-5 text-green-500" />
        <span>Thanks for your feedback!</span>
      </div>
    )
  }

  return (
    <>
      {/* Emoji Row */}
      <div className="flex flex-col items-center gap-3 py-4">
        <p className="text-gray-600 text-sm font-medium">How was your story?</p>
        <div className="flex items-center gap-4">
          {(Object.keys(EMOJI_CONFIG) as Array<keyof typeof EMOJI_CONFIG>).map((key) => {
            const config = EMOJI_CONFIG[key]
            const isSelected = selectedEmoji === key
            return (
              <button
                key={key}
                onClick={() => handleEmojiClick(key)}
                className={`text-3xl md:text-4xl transition-all duration-200 hover:scale-125 active:scale-95 p-2 rounded-full ${
                  isSelected ? 'bg-primary-100 scale-110' : 'hover:bg-gray-100'
                }`}
                title={config.label}
                aria-label={config.label}
              >
                {config.emoji}
              </button>
            )
          })}
        </div>
      </div>

      {/* Feedback Modal */}
      {showModal && selectedEmoji && (
        <div className="fixed inset-0 bg-black bg-opacity-50 flex items-center justify-center z-50 p-4 animate-fade-in">
          <div className="bg-white rounded-2xl p-6 max-w-md w-full animate-scale-in shadow-2xl relative">
            {/* Close button */}
            <button
              onClick={closeModal}
              className="absolute top-4 right-4 p-2 text-gray-400 hover:text-gray-600 rounded-lg transition-colors hover:bg-gray-100"
              aria-label="Close"
            >
              <X className="w-5 h-5" />
            </button>

            {/* Header with selected emoji */}
            <div className="text-center mb-4">
              <span className="text-5xl mb-2 block">{EMOJI_CONFIG[selectedEmoji].emoji}</span>
              <h3 className="text-xl font-display font-bold text-gray-900">
                Thanks! {EMOJI_CONFIG[selectedEmoji].modalPrompt}
              </h3>
            </div>

            {/* Optional comment */}
            <div className="mb-6">
              <textarea
                value={comment}
                onChange={(e) => setComment(e.target.value)}
                placeholder="Tell us more (optional)..."
                className="w-full border border-gray-300 rounded-lg p-3 text-gray-700 placeholder-gray-400 focus:outline-none focus:ring-2 focus:ring-primary-500 focus:border-transparent resize-none"
                rows={3}
                maxLength={500}
              />
              <p className="text-xs text-gray-400 mt-1 text-right">
                {comment.length}/500
              </p>
            </div>

            {/* Action buttons */}
            <div className="flex gap-3">
              <button
                onClick={handleSkip}
                disabled={isSubmitting}
                className="flex-1 py-3 px-4 border border-gray-300 text-gray-700 rounded-lg font-medium hover:bg-gray-50 transition-colors disabled:opacity-50"
              >
                Skip
              </button>
              <button
                onClick={handleSubmit}
                disabled={isSubmitting}
                className="flex-1 py-3 px-4 bg-primary-600 text-white rounded-lg font-medium hover:bg-primary-700 transition-colors disabled:opacity-50 flex items-center justify-center gap-2"
              >
                {isSubmitting ? (
                  <>
                    <Loader2 className="w-4 h-4 animate-spin" />
                    Submitting...
                  </>
                ) : (
                  'Submit'
                )}
              </button>
            </div>
          </div>
        </div>
      )}
    </>
  )
}
