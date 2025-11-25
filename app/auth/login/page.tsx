'use client'

import { useState } from 'react'
import { createClient } from '@/lib/supabase/client'
import { useRouter } from 'next/navigation'
import Link from 'next/link'
import AuthCard from '@/components/auth/AuthCard'
import GoogleButton from '@/components/auth/GoogleButton'

export default function LoginPage() {
  const [email, setEmail] = useState('')
  const [password, setPassword] = useState('')
  const [step, setStep] = useState<'email' | 'password'>('email')
  const [loading, setLoading] = useState(false)
  const [googleLoading, setGoogleLoading] = useState(false)
  const [error, setError] = useState<string | null>(null)
  const router = useRouter()
  const supabase = createClient()

  const handleGoogleLogin = async () => {
    setError(null)
    setGoogleLoading(true)

    const { error } = await supabase.auth.signInWithOAuth({
      provider: 'google',
      options: {
        redirectTo: `${window.location.origin}/auth/callback`,
      },
    })

    if (error) {
      setError(error.message)
      setGoogleLoading(false)
    }
    // Note: If successful, user will be redirected to Google, so no need to set loading to false
  }

  const handleEmailSubmit = async (e: React.FormEvent) => {
    e.preventDefault()
    setError(null)
    setLoading(true)

    try {
      const response = await fetch('/api/auth/check-email', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ email }),
      })

      const data = await response.json()

      if (!response.ok) {
        setError(data.error || 'Failed to check email')
        setLoading(false)
        return
      }

      if (data.exists) {
        // User exists, show password field
        setStep('password')
      } else {
        // User doesn't exist, redirect to signup with email prefilled
        router.push(`/auth/signup?email=${encodeURIComponent(email)}`)
        return
      }
    } catch {
      setError('Failed to check email. Please try again.')
    }

    setLoading(false)
  }

  const handleLogin = async (e: React.FormEvent) => {
    e.preventDefault()
    setError(null)
    setLoading(true)

    const { data, error } = await supabase.auth.signInWithPassword({
      email,
      password,
    })

    if (error) {
      setError(error.message)
      setLoading(false)
      return
    }

    // Check if user has characters
    if (data.user) {
      const { data: characters } = await supabase
        .from('character_profiles')
        .select('id')
        .eq('user_id', data.user.id)
        .is('deleted_at', null)
        .limit(1)

      // If no characters, redirect to onboarding
      if (!characters || characters.length === 0) {
        router.push('/onboarding/character')
      } else {
        router.push('/dashboard')
      }
    }
  }

  return (
    <AuthCard
      title="Welcome Back!"
      subtitle="Login to continue your story adventures"
    >
      <div className="space-y-6">
        {error && (
          <div className="bg-red-50 border-2 border-red-200 text-red-700 px-5 py-4 rounded-2xl text-sm font-medium">
            {error}
          </div>
        )}

        {/* Google Login */}
        <GoogleButton onClick={handleGoogleLogin} loading={googleLoading} />

        {/* Divider */}
        <div className="relative">
          <div className="absolute inset-0 flex items-center">
            <div className="w-full border-t border-gray-300"></div>
          </div>
          <div className="relative flex justify-center text-sm">
            <span className="px-4 bg-white text-gray-500 font-medium">or continue with email</span>
          </div>
        </div>

        {/* Step 1: Email Form */}
        {step === 'email' && (
          <form onSubmit={handleEmailSubmit} className="space-y-6">
            <div>
              <label htmlFor="email" className="label">
                Email
              </label>
              <input
                id="email"
                type="email"
                value={email}
                onChange={(e) => setEmail(e.target.value)}
                required
                className="input"
                placeholder="you@example.com"
              />
            </div>

            <button
              type="submit"
              disabled={loading}
              className="btn-primary btn-lg w-full"
            >
              {loading ? 'Checking...' : 'Continue'}
            </button>

            <p className="text-center text-sm text-gray-600">
              Don't have an account?{' '}
              <Link href="/auth/signup" className="text-primary-600 hover:text-primary-700 font-semibold transition-colors">
                Sign up
              </Link>
            </p>
          </form>
        )}

        {/* Step 2: Password Form */}
        {step === 'password' && (
          <form onSubmit={handleLogin} className="space-y-6">
            <div>
              <label htmlFor="email-display" className="label">
                Email
              </label>
              <div className="flex items-center gap-2">
                <input
                  id="email-display"
                  type="email"
                  value={email}
                  readOnly
                  className="input bg-gray-50 text-gray-600 flex-1"
                />
                <button
                  type="button"
                  onClick={() => {
                    setStep('email')
                    setPassword('')
                    setError(null)
                  }}
                  className="text-sm text-primary-600 hover:text-primary-700 font-semibold transition-colors whitespace-nowrap"
                >
                  Change
                </button>
              </div>
            </div>

            <div>
              <div className="flex items-center justify-between mb-2">
                <label htmlFor="password" className="label">
                  Password
                </label>
                <Link href="/auth/reset-password" className="text-sm text-primary-600 hover:text-primary-700 font-semibold transition-colors">
                  Forgot password?
                </Link>
              </div>
              <input
                id="password"
                type="password"
                value={password}
                onChange={(e) => setPassword(e.target.value)}
                required
                autoFocus
                className="input"
                placeholder="••••••••"
              />
            </div>

            <button
              type="submit"
              disabled={loading}
              className="btn-primary btn-lg w-full"
            >
              {loading ? 'Logging in...' : 'Login'}
            </button>
          </form>
        )}
      </div>
    </AuthCard>
  )
}
