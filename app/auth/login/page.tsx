'use client'

import { useState } from 'react'
import { createClient } from '@/lib/supabase/client'
import { useRouter } from 'next/navigation'
import Link from 'next/link'
import AuthCard from '@/components/auth/AuthCard'

export default function LoginPage() {
  const [email, setEmail] = useState('')
  const [password, setPassword] = useState('')
  const [loading, setLoading] = useState(false)
  const [error, setError] = useState<string | null>(null)
  const router = useRouter()
  const supabase = createClient()

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
      <form onSubmit={handleLogin} className="space-y-5">
        {error && (
          <div className="bg-red-50 border border-red-200 text-red-800 px-4 py-3 rounded-lg text-sm">
            {error}
          </div>
        )}

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
            placeholder="ben@novapointai.com"
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
            className="w-full px-4 py-3 bg-blue-50 border-0 rounded-xl focus:ring-2 focus:ring-primary-400 focus:bg-white transition-all text-neutral-900"
            placeholder="••••••••"
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
          {loading ? 'Logging in...' : 'Login'}
        </button>

        <p className="text-center text-sm text-neutral-600">
          Don't have an account?{' '}
          <Link href="/auth/signup" className="text-blue-500 hover:text-blue-600 font-semibold">
            Sign up
          </Link>
        </p>
      </form>
    </AuthCard>
  )
}
