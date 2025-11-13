'use client'

// Signup page component
import { useState } from 'react'
import { createClient } from '@/lib/supabase/client'
import { useRouter } from 'next/navigation'
import Link from 'next/link'
import Image from 'next/image'
import { Star, Users, Image as ImageIcon, Check } from 'lucide-react'

export default function SignupPage() {
  const [firstName, setFirstName] = useState('')
  const [lastName, setLastName] = useState('')
  const [email, setEmail] = useState('')
  const [password, setPassword] = useState('')
  const [confirmPassword, setConfirmPassword] = useState('')
  const [loading, setLoading] = useState(false)
  const [error, setError] = useState<string | null>(null)
  const router = useRouter()
  const supabase = createClient()

  const handleSignup = async (e: React.FormEvent) => {
    e.preventDefault()
    setError(null)

    if (password !== confirmPassword) {
      setError('Passwords do not match')
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
          full_name: `${firstName} ${lastName}`.trim(),
          first_name: firstName,
          last_name: lastName,
        },
      },
    })

    if (error) {
      setError(error.message)
      setLoading(false)
      return
    }

    // Send welcome email (non-blocking)
    if (data.user) {
      fetch('/api/send-welcome', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          email,
          name: `${firstName} ${lastName}`.trim() || firstName
        })
      }).catch(error => {
        // Log error but don't block user flow
        console.error('Failed to send welcome email:', error)
      })
    }

    // Redirect to onboarding (auth callback will handle this)
    router.push('/onboarding/character')
  }

  return (
    <div className="min-h-screen bg-gradient-bg-warm flex">
      {/* Left Side - Marketing Content */}
      <div className="hidden lg:flex lg:w-1/2 flex-col justify-center items-end py-16 pr-12 relative overflow-hidden">
        <div className="absolute inset-0 gradient-mesh opacity-30"></div>
        <div className="max-w-lg w-full relative z-10">
          <Link href="/" className="flex items-center gap-2 sm:gap-2.5 mb-12 hover:opacity-90 transition-all hover:scale-[1.02]">
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

          <h1 className="text-5xl font-display font-bold text-gray-900 mb-5">
            Join the Adventure!
          </h1>
          <p className="text-xl text-gray-600 mb-10 leading-relaxed">
            Create magical bedtime stories personalized for your family
          </p>

          <div className="badge-primary px-5 py-3 mb-10 inline-block text-base">
            Join thousands of families creating magical stories every night
          </div>

          <div className="space-y-6">
            <div className="flex gap-4 items-start">
              <div className="w-14 h-14 rounded-2xl bg-gradient-primary flex items-center justify-center flex-shrink-0 shadow-blue-glow">
                <Star className="w-7 h-7 text-white fill-white" />
              </div>
              <div>
                <h3 className="font-bold text-gray-900 mb-2 text-lg">AI-powered personalized stories</h3>
                <p className="text-gray-600 leading-relaxed">Every story crafted uniquely for your child</p>
              </div>
            </div>

            <div className="flex gap-4 items-start">
              <div className="w-14 h-14 rounded-2xl bg-gradient-purple flex items-center justify-center flex-shrink-0 shadow-purple-glow">
                <Users className="w-7 h-7 text-white" />
              </div>
              <div>
                <h3 className="font-bold text-gray-900 mb-2 text-lg">Perfect for your whole family</h3>
                <p className="text-gray-600 leading-relaxed">Include humans, pets, and magical creatures in stories</p>
              </div>
            </div>

            <div className="flex gap-4 items-start">
              <div className="w-14 h-14 rounded-2xl bg-gradient-teal flex items-center justify-center flex-shrink-0 shadow-teal-glow">
                <ImageIcon className="w-7 h-7 text-white" />
              </div>
              <div>
                <h3 className="font-bold text-gray-900 mb-2 text-lg">Beautiful illustrations included</h3>
                <p className="text-gray-600 leading-relaxed">AI-generated artwork brings stories to life</p>
              </div>
            </div>

            <div className="flex gap-4 items-start">
              <div className="w-14 h-14 rounded-2xl bg-gradient-sky flex items-center justify-center flex-shrink-0 shadow-blue-glow">
                <Check className="w-7 h-7 text-white" />
              </div>
              <div>
                <h3 className="font-bold text-gray-900 mb-2 text-lg">Start free, no credit card required</h3>
                <p className="text-gray-600 leading-relaxed">Try 3 stories per month on us</p>
              </div>
            </div>
          </div>
        </div>
      </div>

      {/* Right Side - Signup Form */}
      <div className="w-full lg:w-1/2 flex items-center justify-start px-4 py-12 lg:pl-12">
        <div className="w-full max-w-lg">
          {/* Logo for mobile */}
          <Link href="/" className="flex lg:hidden items-center justify-center gap-2 sm:gap-2.5 hover:opacity-90 transition-all hover:scale-[1.02] mb-10">
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

            <form onSubmit={handleSignup} className="space-y-6">
              {error && (
                <div className="bg-red-50 border-2 border-red-200 text-red-700 px-5 py-4 rounded-2xl text-sm font-medium">
                  {error}
                </div>
              )}

              <div className="grid grid-cols-2 gap-4">
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
                    className="input"
                    placeholder="John"
                  />
                </div>

                <div>
                  <label htmlFor="lastName" className="label">
                    Last Name
                  </label>
                  <input
                    id="lastName"
                    type="text"
                    value={lastName}
                    onChange={(e) => setLastName(e.target.value)}
                    required
                    className="input"
                    placeholder="Doe"
                  />
                </div>
              </div>

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

              <div>
                <label htmlFor="confirmPassword" className="label">
                  Confirm Password
                </label>
                <input
                  id="confirmPassword"
                  type="password"
                  value={confirmPassword}
                  onChange={(e) => setConfirmPassword(e.target.value)}
                  required
                  minLength={6}
                  className="input"
                  placeholder="Confirm your password"
                />
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
                No credit card required
              </p>
            </form>

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
    </div>
  )
}
