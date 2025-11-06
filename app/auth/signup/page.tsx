'use client'

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
      },
    })

    if (error) {
      setError(error.message)
      setLoading(false)
      return
    }

    // Redirect to onboarding (auth callback will handle this)
    router.push('/onboarding/character')
  }

  return (
    <div className="min-h-screen bg-blue-50 flex">
      {/* Left Side - Marketing Content */}
      <div className="hidden lg:flex lg:w-1/2 flex-col justify-center items-end py-12 pr-8">
        <div className="max-w-lg w-full -mt-8" style={{ transform: 'scale(0.9)', transformOrigin: 'right center' }}>
          <Link href="/" className="flex items-center gap-2 sm:gap-2.5 mb-8">
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
              <span className="gradient-text whitespace-nowrap" style={{ fontWeight: 800, fontSize: 'clamp(1.5rem, 4.5vw, 2.5rem)' }}>
                Tuck and Tale
              </span>
              <span className="gradient-text" style={{ fontWeight: 800, fontSize: 'clamp(1.125rem, 3.5vw, 1.875rem)' }}>™</span>
            </div>
          </Link>

          <h1 className="text-5xl font-bold text-neutral-900 mb-4">
            Join the Adventure!
          </h1>
          <p className="text-xl text-neutral-600 mb-8">
            Create magical bedtime stories personalized for your family
          </p>

          <div className="bg-blue-100 rounded-xl p-4 mb-8 inline-block">
            <p className="text-blue-700 font-semibold">
              Join thousands of families creating magical stories every night
            </p>
          </div>

          <div className="space-y-6">
            <div className="flex gap-4">
              <div className="w-12 h-12 rounded-full flex items-center justify-center flex-shrink-0" style={{ background: 'linear-gradient(135deg, #4AC5FF 0%, #2D5BFF 100%)' }}>
                <Star className="w-6 h-6 text-white fill-white" />
              </div>
              <div>
                <h3 className="font-bold text-neutral-900 mb-1">AI-powered personalized stories</h3>
                <p className="text-neutral-600">Every story crafted uniquely for your child</p>
              </div>
            </div>

            <div className="flex gap-4">
              <div className="w-12 h-12 rounded-full flex items-center justify-center flex-shrink-0" style={{ background: 'linear-gradient(135deg, #4AC5FF 0%, #2D5BFF 100%)' }}>
                <Users className="w-6 h-6 text-white" />
              </div>
              <div>
                <h3 className="font-bold text-neutral-900 mb-1">Perfect for your whole family</h3>
                <p className="text-neutral-600">Include humans, pets, and magical creatures in stories</p>
              </div>
            </div>

            <div className="flex gap-4">
              <div className="w-12 h-12 rounded-full flex items-center justify-center flex-shrink-0" style={{ background: 'linear-gradient(135deg, #4AC5FF 0%, #2D5BFF 100%)' }}>
                <ImageIcon className="w-6 h-6 text-white" />
              </div>
              <div>
                <h3 className="font-bold text-neutral-900 mb-1">Beautiful illustrations included</h3>
                <p className="text-neutral-600">AI-generated artwork brings stories to life</p>
              </div>
            </div>

            <div className="flex gap-4">
              <div className="w-12 h-12 rounded-full flex items-center justify-center flex-shrink-0" style={{ background: 'linear-gradient(135deg, #4AC5FF 0%, #2D5BFF 100%)' }}>
                <Check className="w-6 h-6 text-white" />
              </div>
              <div>
                <h3 className="font-bold text-neutral-900 mb-1">Start free, no credit card required</h3>
                <p className="text-neutral-600">Try 3 stories per month on us</p>
              </div>
            </div>
          </div>
        </div>
      </div>

      {/* Right Side - Signup Form */}
      <div className="w-full lg:w-1/2 flex items-center justify-start px-4 py-12 lg:pl-8">
        <div className="w-full max-w-lg">
          {/* Logo for mobile */}
          <Link href="/" className="flex lg:hidden items-center justify-center gap-2 sm:gap-2.5 hover:opacity-80 transition-opacity mb-8">
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
              <span className="gradient-text whitespace-nowrap" style={{ fontWeight: 800, fontSize: 'clamp(1.5rem, 4.5vw, 2.5rem)' }}>
                Tuck and Tale
              </span>
              <span className="gradient-text" style={{ fontWeight: 800, fontSize: 'clamp(1.125rem, 3.5vw, 1.875rem)' }}>™</span>
            </div>
          </Link>

          <div className="bg-white rounded-2xl shadow-2xl p-8">
            <h2 className="text-2xl font-bold text-neutral-900 mb-6 text-center">Create Your Account</h2>

            <form onSubmit={handleSignup} className="space-y-5">
              {error && (
                <div className="bg-red-50 border border-red-200 text-red-800 px-4 py-3 rounded-lg text-sm">
                  {error}
                </div>
              )}

              <div className="grid grid-cols-2 gap-3">
                <div>
                  <label htmlFor="firstName" className="block text-sm font-semibold text-neutral-700 mb-2">
                    First Name
                  </label>
                  <input
                    id="firstName"
                    type="text"
                    value={firstName}
                    onChange={(e) => setFirstName(e.target.value)}
                    required
                    className="w-full px-4 py-3 bg-blue-50 border-0 rounded-xl focus:ring-2 focus:ring-primary-400 focus:bg-white transition-all text-neutral-900 placeholder-neutral-500"
                    placeholder="John"
                  />
                </div>

                <div>
                  <label htmlFor="lastName" className="block text-sm font-semibold text-neutral-700 mb-2">
                    Last Name
                  </label>
                  <input
                    id="lastName"
                    type="text"
                    value={lastName}
                    onChange={(e) => setLastName(e.target.value)}
                    required
                    className="w-full px-4 py-3 bg-blue-50 border-0 rounded-xl focus:ring-2 focus:ring-primary-400 focus:bg-white transition-all text-neutral-900 placeholder-neutral-500"
                    placeholder="Doe"
                  />
                </div>
              </div>

              <div>
                <label htmlFor="email" className="block text-sm font-semibold text-neutral-700 mb-2">
                  Email
                </label>
                <input
                  id="email"
                  type="email"
                  value={email}
                  onChange={(e) => setEmail(e.target.value)}
                  required
                  className="w-full px-4 py-3 bg-blue-50 border-0 rounded-xl focus:ring-2 focus:ring-primary-400 focus:bg-white transition-all text-neutral-900 placeholder-neutral-500"
                  placeholder="your@email.com"
                />
              </div>

              <div>
                <label htmlFor="password" className="block text-sm font-semibold text-neutral-700 mb-2">
                  Password
                </label>
                <input
                  id="password"
                  type="password"
                  value={password}
                  onChange={(e) => setPassword(e.target.value)}
                  required
                  minLength={6}
                  className="w-full px-4 py-3 bg-blue-50 border-0 rounded-xl focus:ring-2 focus:ring-primary-400 focus:bg-white transition-all text-neutral-900 placeholder-neutral-500"
                  placeholder="At least 6 characters"
                />
              </div>

              <div>
                <label htmlFor="confirmPassword" className="block text-sm font-semibold text-neutral-700 mb-2">
                  Confirm Password
                </label>
                <input
                  id="confirmPassword"
                  type="password"
                  value={confirmPassword}
                  onChange={(e) => setConfirmPassword(e.target.value)}
                  required
                  minLength={6}
                  className="w-full px-4 py-3 bg-blue-50 border-0 rounded-xl focus:ring-2 focus:ring-primary-400 focus:bg-white transition-all text-neutral-900 placeholder-neutral-500"
                  placeholder="Confirm your password"
                />
              </div>

              <button
                type="submit"
                disabled={loading}
                className="w-full px-8 py-4 text-white font-semibold rounded-3xl transition-all duration-300 focus:outline-none focus:ring-2 focus:ring-offset-2 focus:ring-primary-400 disabled:opacity-50 disabled:cursor-not-allowed hover:scale-105"
                style={{
                  background: 'linear-gradient(135deg, #4AC5FF 0%, #2D5BFF 100%)',
                  boxShadow: '0 8px 24px rgba(45, 91, 255, 0.3)'
                }}
                onMouseEnter={(e) => {
                  if (!loading) {
                    e.currentTarget.style.boxShadow = '0 12px 32px rgba(45, 91, 255, 0.4)'
                  }
                }}
                onMouseLeave={(e) => {
                  if (!loading) {
                    e.currentTarget.style.boxShadow = '0 8px 24px rgba(45, 91, 255, 0.3)'
                  }
                }}
              >
                {loading ? 'Creating account...' : 'Create Account'}
              </button>

              <p className="text-center text-sm text-neutral-600">
                Already have an account?{' '}
                <Link href="/auth/login" className="text-blue-500 hover:text-blue-600 font-semibold">
                  Login
                </Link>
              </p>

              <p className="text-center text-xs text-neutral-500">
                No credit card required • Start with 3 free stories
              </p>
            </form>

            {/* Back to Home Link */}
            <div className="text-center mt-6">
              <Link
                href="/"
                className="text-sm text-blue-500 hover:text-blue-600 font-medium inline-flex items-center gap-1"
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
