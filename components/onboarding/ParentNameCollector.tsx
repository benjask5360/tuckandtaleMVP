'use client'

import { useState } from 'react'

interface ParentNameCollectorProps {
  onComplete: (firstName: string, lastName: string) => void
}

export default function ParentNameCollector({ onComplete }: ParentNameCollectorProps) {
  const [firstName, setFirstName] = useState('')
  const [lastName, setLastName] = useState('')
  const [loading, setLoading] = useState(false)
  const [error, setError] = useState<string | null>(null)

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault()
    setError(null)

    if (!firstName.trim()) {
      setError('Please enter your first name')
      return
    }

    setLoading(true)

    try {
      const response = await fetch('/api/user/update-name', {
        method: 'PATCH',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          firstName: firstName.trim(),
          lastName: lastName.trim()
        })
      })

      if (!response.ok) {
        const errorData = await response.json()
        throw new Error(errorData.error || 'Failed to save your name')
      }

      // Success - notify parent component
      onComplete(firstName.trim(), lastName.trim())
    } catch (err) {
      console.error('Error saving name:', err)
      setError(err instanceof Error ? err.message : 'Failed to save your name')
      setLoading(false)
    }
  }

  return (
    <div className="min-h-screen bg-gray-50 flex items-center justify-center p-4 sm:p-6">
      <div className="w-full max-w-md">
        <div className="card p-6 md:p-8">
          <div className="text-center mb-6 md:mb-8">
            <h1 className="text-2xl sm:text-3xl md:text-4xl font-display font-bold text-gray-900 mb-3">
              What's your name?
            </h1>
            <p className="text-base md:text-lg text-gray-600">
              We'll use this to personalize your experience
            </p>
          </div>

          {error && (
            <div className="bg-red-50 border-2 border-red-200 text-red-700 px-5 py-4 rounded-2xl text-sm font-medium mb-6">
              {error}
            </div>
          )}

          <form onSubmit={handleSubmit} className="space-y-6">
            <div>
              <label htmlFor="firstName" className="label">
                First Name
              </label>
              <input
                id="firstName"
                type="text"
                value={firstName}
                onChange={(e) => setFirstName(e.target.value)}
                required
                autoFocus
                className="input"
                placeholder="John"
              />
            </div>

            <div>
              <label htmlFor="lastName" className="label">
                Last Name <span className="text-gray-400 font-normal">(optional)</span>
              </label>
              <input
                id="lastName"
                type="text"
                value={lastName}
                onChange={(e) => setLastName(e.target.value)}
                className="input"
                placeholder="Doe"
              />
            </div>

            <button
              type="submit"
              disabled={loading || !firstName.trim()}
              className="btn-primary btn-lg w-full"
            >
              {loading ? 'Saving...' : 'Continue'}
            </button>
          </form>
        </div>
      </div>
    </div>
  )
}
