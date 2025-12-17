'use client'

// Signup page component
import { useState, Suspense } from 'react'
import { createClient } from '@/lib/supabase/client'
import { useRouter, useSearchParams } from 'next/navigation'
import Link from 'next/link'
import Image from 'next/image'
import { Check } from 'lucide-react'
import GoogleButton from '@/components/auth/GoogleButton'

function SignupForm() {
  const searchParams = useSearchParams()
  const prefillEmail = searchParams.get('email') || ''
  const [email, setEmail] = useState(prefillEmail)
  const [password, setPassword] = useState('')
  const [acceptedTerms, setAcceptedTerms] = useState(false)
  const [loading, setLoading] = useState(false)
  const [googleLoading, setGoogleLoading] = useState(false)
  const [error, setError] = useState<string | null>(null)
  const router = useRouter()
  const supabase = createClient()

  const handleGoogleSignup = async () => {
    setError(null)
    setGoogleLoading(true)

    // Note: Google OAuth users will need to accept terms in the onboarding modal
    // since we can't get their consent before OAuth redirect
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

  const handleSignup = async (e: React.FormEvent) => {
    e.preventDefault()
    setError(null)

    if (!acceptedTerms) {
      setError('You must accept the Terms of Service and Privacy Policy to continue')
      return
    }

    if (password.length < 6) {
      setError('Password must be at least 6 characters')
      return
    }

    setLoading(true)

    const { data, error } = await supabase.auth.signUp({
      email,
      password,
      options: {
        emailRedirectTo: `${window.location.origin}/auth/callback`,
        data: {
          terms_accepted_at: new Date().toISOString(),
          privacy_accepted_at: new Date().toISOString(),
        },
      },
    })

    if (error) {
      setError(error.message)
      setLoading(false)
      return
    }

    // Notify admin of new signup (non-blocking)
    fetch('/api/notify-admin-signup', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({
        email,
        name: '(Not provided yet)',
        userId: 'pending' // User ID not available until session is established
      })
    }).catch(err => console.error('Failed to notify admin:', err))

    // Welcome email will be sent after name collection in onboarding
    // Redirect to onboarding (auth callback will handle this)
    router.push('/onboarding/character')
  }

  return (
    <div className="min-h-screen bg-gradient-bg-warm flex items-center justify-center px-4 py-12">
      <div className="w-full max-w-lg">
          {/* Logo */}
          <Link href="/" className="flex items-center justify-center gap-2 sm:gap-2.5 hover:opacity-90 transition-all hover:scale-[1.02] mb-10">
            <div className="w-[60px] h-[60px] sm:w-[75px] sm:h-[75px] relative flex-shrink-0">
              <Image
                src="/images/logo.png"
                alt="Tuck and Tale Logo"
                width={75}
                height={75}
                className="object-contain"
                priority
              />
            </div>
            <div className="flex items-start gap-0.5">
              <span className="gradient-text whitespace-nowrap font-display" style={{ fontWeight: 800, fontSize: 'clamp(1.5rem, 4.5vw, 2.5rem)' }}>
                Tuck and Tale
              </span>
              <span className="gradient-text font-display" style={{ fontWeight: 800, fontSize: 'clamp(1.125rem, 3.5vw, 1.875rem)' }}>™</span>
            </div>
          </Link>

          <div className="card p-6 md:p-10">
            <h2 className="text-2xl sm:text-3xl md:text-4xl font-display font-bold text-gray-900 mb-6 md:mb-8 text-center">Create Your Account</h2>

            <div className="space-y-6">
              {error && (
                <div className="bg-red-50 border-2 border-red-200 text-red-700 px-5 py-4 rounded-2xl text-sm font-medium">
                  {error}
                </div>
              )}

              {/* Google Signup */}
              <GoogleButton onClick={handleGoogleSignup} loading={googleLoading} />

              {/* Divider */}
              <div className="relative">
                <div className="absolute inset-0 flex items-center">
                  <div className="w-full border-t border-gray-300"></div>
                </div>
                <div className="relative flex justify-center text-sm">
                  <span className="px-4 bg-white text-gray-500 font-medium">or sign up with email</span>
                </div>
              </div>

              {/* Email/Password Form */}
              <form onSubmit={handleSignup} className="space-y-6">
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
                  placeholder="your@example.com"
                />
              </div>

              <div>
                <label htmlFor="password" className="label">
                  Password
                </label>
                <input
                  id="password"
                  type="password"
                  value={password}
                  onChange={(e) => setPassword(e.target.value)}
                  required
                  minLength={6}
                  className="input"
                  placeholder="At least 6 characters"
                />
              </div>

              {/* Terms and Privacy Policy Acceptance */}
              <div className="flex items-start gap-3">
                <input
                  type="checkbox"
                  id="terms"
                  checked={acceptedTerms}
                  onChange={(e) => setAcceptedTerms(e.target.checked)}
                  required
                  className="checkbox mt-1"
                />
                <label htmlFor="terms" className="text-sm text-gray-600 cursor-pointer">
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
                type="submit"
                disabled={loading}
                className="btn-primary btn-lg w-full"
              >
                {loading ? 'Creating account...' : 'Create Account'}
              </button>

              <p className="text-center text-sm text-gray-600">
                Already have an account?{' '}
                <Link href="/auth/login" className="text-primary-600 hover:text-primary-700 font-semibold transition-colors">
                  Login
                </Link>
              </p>

              <p className="text-center text-xs text-gray-500 flex items-center justify-center gap-2">
                <Check className="w-4 h-4 text-primary-500" />
                7-day free trial • Cancel anytime, pay nothing
              </p>
              </form>
            </div>

            {/* Back to Home Link */}
            <div className="text-center mt-6">
              <Link
                href="/"
                className="text-sm text-primary-600 hover:text-primary-700 font-semibold inline-flex items-center gap-1 transition-colors"
              >
                ← Back to Home
              </Link>
            </div>
          </div>
        </div>
    </div>
  )
}

export default function SignupPage() {
  return (
    <Suspense fallback={<div className="min-h-screen bg-gradient-bg-warm flex items-center justify-center">Loading...</div>}>
      <SignupForm />
    </Suspense>
  )
}
