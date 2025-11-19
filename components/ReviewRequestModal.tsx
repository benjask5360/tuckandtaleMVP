'use client';

import { useState } from 'react';
import { Star, X, Sparkles, Check } from 'lucide-react';

interface ReviewRequestModalProps {
  isOpen: boolean;
  onClose: () => void;
  storyId: string;
  storyTitle?: string;
}

export default function ReviewRequestModal({
  isOpen,
  onClose,
  storyId,
}: ReviewRequestModalProps) {
  const [rating, setRating] = useState<number>(0);
  const [hoveredRating, setHoveredRating] = useState<number>(0);
  const [comment, setComment] = useState<string>('');
  const [isSubmitting, setIsSubmitting] = useState(false);
  const [showConfirmation, setShowConfirmation] = useState(false);

  if (!isOpen) return null;

  const handleStarClick = (starNumber: number) => {
    setRating(starNumber);
  };

  const handleStarHover = (starNumber: number) => {
    setHoveredRating(starNumber);
  };

  const handleStarLeave = () => {
    setHoveredRating(0);
  };

  const handleSubmit = async () => {
    if (rating === 0) return;

    setIsSubmitting(true);

    try {
      const response = await fetch('/api/reviews', {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
        },
        body: JSON.stringify({
          story_id: storyId,
          rating,
          comment: comment.trim() || null,
        }),
      });

      if (!response.ok) {
        throw new Error('Failed to submit review');
      }

      // Show confirmation state
      setShowConfirmation(true);

      // Auto-dismiss after 2 seconds
      setTimeout(() => {
        onClose();
      }, 2000);
    } catch (error) {
      console.error('Error submitting review:', error);
      alert('Failed to submit review. Please try again.');
      setIsSubmitting(false);
    }
  };

  const handleNotNow = async () => {
    try {
      // Mark user as having seen the modal
      await fetch('/api/reviews', {
        method: 'PATCH',
      });
      onClose();
    } catch (error) {
      console.error('Error marking modal as shown:', error);
      // Still close the modal even if the API call fails
      onClose();
    }
  };

  const displayRating = hoveredRating || rating;

  return (
    <div className="fixed inset-0 bg-black bg-opacity-50 flex items-center justify-center z-50 p-4 animate-fade-in">
      <div className="bg-white rounded-2xl md:rounded-3xl p-6 md:p-8 max-w-md w-full animate-scale-in shadow-2xl relative">
        {!showConfirmation ? (
          <>
            {/* Close button */}
            <button
              onClick={handleNotNow}
              className="absolute top-4 right-4 p-2 text-gray-400 hover:text-gray-600 rounded-lg transition-colors hover:bg-gray-100"
              aria-label="Close"
            >
              <X className="w-5 h-5" />
            </button>

            {/* Playful illustration */}
            <div className="flex justify-center mb-4">
              <div className="relative">
                <Sparkles className="w-12 h-12 text-primary-500" />
                <div className="absolute -top-1 -right-1 w-3 h-3 bg-yellow-400 rounded-full animate-pulse" />
              </div>
            </div>

            {/* Header */}
            <h3 className="text-2xl md:text-3xl font-display font-bold text-gray-900 text-center mb-3">
              Thanks for favoriting this story! 🌟
            </h3>

            {/* Copy */}
            <p className="text-base md:text-lg text-gray-600 text-center mb-6">
              If it made your little one smile, tap to leave a quick review.
            </p>

            {/* Star Rating */}
            <div className="mb-6">
              <div className="flex justify-center gap-2 mb-2">
                {[1, 2, 3, 4, 5].map((starNumber) => (
                  <button
                    key={starNumber}
                    onClick={() => handleStarClick(starNumber)}
                    onMouseEnter={() => handleStarHover(starNumber)}
                    onMouseLeave={handleStarLeave}
                    className="transition-all duration-200 ease-smooth hover:scale-110 active:scale-95 focus:outline-none focus:ring-2 focus:ring-primary-400 rounded-lg p-1"
                    aria-label={`Rate ${starNumber} star${starNumber !== 1 ? 's' : ''}`}
                    style={{ minWidth: '44px', minHeight: '44px' }}
                  >
                    <Star
                      className={`w-8 h-8 md:w-10 md:h-10 transition-all duration-200 ${
                        starNumber <= displayRating
                          ? 'fill-yellow-400 text-yellow-400'
                          : 'fill-transparent text-gray-300'
                      }`}
                    />
                  </button>
                ))}
              </div>
              {rating > 0 && (
                <p className="text-sm text-gray-500 text-center animate-fade-in">
                  {rating} of 5 stars
                </p>
              )}
            </div>

            {/* Optional Comment Box */}
            <div className="mb-6">
              <label htmlFor="review-comment" className="label">
                Tell us what you loved! <span className="label-optional">(optional)</span>
              </label>
              <textarea
                id="review-comment"
                value={comment}
                onChange={(e) => setComment(e.target.value)}
                placeholder="What made this story special for your child?"
                className="textarea"
                rows={3}
                maxLength={500}
              />
              <p className="text-xs text-gray-400 mt-1 text-right">
                {comment.length}/500
              </p>
            </div>

            {/* Action Buttons */}
            <div className="flex flex-col-reverse sm:flex-row gap-3">
              <button
                onClick={handleNotNow}
                className="btn btn-secondary btn-md flex-1"
                disabled={isSubmitting}
              >
                Not Now
              </button>
              <button
                onClick={handleSubmit}
                disabled={rating === 0 || isSubmitting}
                className="btn btn-primary btn-md flex-1"
              >
                {isSubmitting ? (
                  <span className="flex items-center gap-2">
                    <span className="w-4 h-4 border-2 border-white border-t-transparent rounded-full animate-spin" />
                    Submitting...
                  </span>
                ) : (
                  'Submit'
                )}
              </button>
            </div>
          </>
        ) : (
          /* Confirmation State */
          <div className="py-8 text-center animate-fade-in">
            <div className="flex justify-center mb-4">
              <div className="w-16 h-16 bg-green-100 rounded-full flex items-center justify-center">
                <Check className="w-8 h-8 text-green-600" />
              </div>
            </div>
            <h3 className="text-2xl md:text-3xl font-display font-bold text-gray-900 mb-2">
              Thanks for your feedback! ✓
            </h3>
            <p className="text-lg text-gray-600">
              We appreciate you sharing your thoughts!
            </p>
          </div>
        )}
      </div>
    </div>
  );
}
