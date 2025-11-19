'use client'

import { useState } from 'react'
import Link from 'next/link'
import { createClient } from '@/lib/supabase/client'

interface TermsConsentModalProps {
  userId: string
  onAccept: () => void
}

export default function TermsConsentModal({ userId, onAccept }: TermsConsentModalProps) {
  const [acceptedTerms, setAcceptedTerms] = useState(false)
  const [loading, setLoading] = useState(false)
  const [error, setError] = useState<string | null>(null)
  const supabase = createClient()

  const handleAccept = async () => {
    if (!acceptedTerms) {
      setError('You must accept the Terms of Service and Privacy Policy to continue')
      return
    }

    setLoading(true)
    setError(null)

    try {
      const now = new Date().toISOString()

      // Update user profile with consent timestamps
      const { error: updateError } = await supabase
        .from('user_profiles')
        .update({
          terms_accepted_at: now,
          privacy_accepted_at: now,
        })
        .eq('id', userId)

      if (updateError) {
        throw updateError
      }

      onAccept()
    } catch (err) {
      console.error('Error accepting terms:', err)
      setError('Failed to save your consent. Please try again.')
      setLoading(false)
    }
  }

  return (
    <div className="fixed inset-0 bg-black/50 backdrop-blur-sm flex items-center justify-center p-4 z-50">
      <div className="card p-6 md:p-8 max-w-md w-full">
        <h2 className="text-2xl font-display font-bold text-gray-900 mb-4">
          Welcome to Tuck and Tale!
        </h2>

        <p className="text-gray-600 mb-6">
          Before you continue, please review and accept our Terms of Service and Privacy Policy.
        </p>

        {error && (
          <div className="bg-red-50 border-2 border-red-200 text-red-700 px-4 py-3 rounded-xl text-sm font-medium mb-6">
            {error}
          </div>
        )}

        <div className="flex items-start gap-3 mb-6">
          <input
            type="checkbox"
            id="terms-consent"
            checked={acceptedTerms}
            onChange={(e) => setAcceptedTerms(e.target.checked)}
            className="checkbox mt-1"
          />
          <label htmlFor="terms-consent" className="text-sm text-gray-600 cursor-pointer">
            I agree to the{' '}
            <Link
              href="/terms"
              target="_blank"
              rel="noopener noreferrer"
              className="text-primary-600 hover:text-primary-700 font-semibold transition-colors"
            >
              Terms of Service
            </Link>
            {' '}and{' '}
            <Link
              href="/privacy"
              target="_blank"
              rel="noopener noreferrer"
              className="text-primary-600 hover:text-primary-700 font-semibold transition-colors"
            >
              Privacy Policy
            </Link>
          </label>
        </div>

        <button
          onClick={handleAccept}
          disabled={loading || !acceptedTerms}
          className="btn-primary btn-lg w-full"
        >
          {loading ? 'Accepting...' : 'Continue'}
        </button>
      </div>
    </div>
  )
}
