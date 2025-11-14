'use client'

import { useState } from 'react'
import { createClient } from '@/lib/supabase/client'
import { useRouter } from 'next/navigation'
import Link from 'next/link'
import Image from 'next/image'

export default function UpdatePasswordPage() {
  const [password, setPassword] = useState('')
  const [confirmPassword, setConfirmPassword] = useState('')
  const [loading, setLoading] = useState(false)
  const [error, setError] = useState<string | null>(null)
  const router = useRouter()
  const supabase = createClient()

  const handleUpdatePassword = async (e: React.FormEvent) => {
    e.preventDefault()
    setError(null)

    // Validate passwords match
    if (password !== confirmPassword) {
      setError('Passwords do not match')
      return
    }

    // Validate password length
    if (password.length < 6) {
      setError('Password must be at least 6 characters long')
      return
    }

    setLoading(true)

    const { error } = await supabase.auth.updateUser({
      password: password
    })

    if (error) {
      setError(error.message)
      setLoading(false)
      return
    }

    // Success! Redirect to login
    router.push('/auth/login?message=Password updated successfully')
  }

  return (
    <div className="min-h-screen bg-gray-50 flex items-center justify-center p-4 sm:p-6">
      <div className="w-full max-w-md">
        <div className="card p-6 md:p-8">
          {/* Logo */}
          <div className="flex justify-center mb-6 md:mb-8">
            <Link href="/" className="flex items-center gap-2 min-h-[44px] hover:opacity-80 transition-opacity">
              <div className="w-14 h-14 md:w-16 md:h-16 relative">
                <Image
                  src="/images/logo.png"
                  alt="Tuck and Tale Logo"
                  width={64}
                  height={64}
                  className="object-contain"
                  priority
                />
              </div>
              <span className="gradient-text text-2xl md:text-3xl font-display font-extrabold">
                Tuck and Tale™
              </span>
            </Link>
          </div>

          {/* Title */}
          <h1 className="text-2xl md:text-3xl font-display font-bold text-center text-gray-900 mb-2">
            Set New Password
          </h1>
          <p className="text-center text-base md:text-lg text-gray-600 mb-6 md:mb-8">
            Enter your new password below
          </p>

          {/* Form */}
          <form onSubmit={handleUpdatePassword} className="space-y-6">
            {error && (
              <div className="bg-red-50 border-2 border-red-200 text-red-700 px-5 py-4 rounded-2xl text-sm font-medium">
                {error}
              </div>
            )}

            <div>
              <label htmlFor="password" className="label">
                New Password
              </label>
              <input
                id="password"
                type="password"
                value={password}
                onChange={(e) => setPassword(e.target.value)}
                required
                className="input"
                placeholder="••••••••"
                minLength={6}
              />
            </div>

            <div>
              <label htmlFor="confirmPassword" className="label">
                Confirm New Password
              </label>
              <input
                id="confirmPassword"
                type="password"
                value={confirmPassword}
                onChange={(e) => setConfirmPassword(e.target.value)}
                required
                className="input"
                placeholder="••••••••"
                minLength={6}
              />
            </div>

            <button
              type="submit"
              disabled={loading}
              className="btn-primary btn-lg w-full"
            >
              {loading ? 'Updating...' : 'Update Password'}
            </button>
          </form>

          {/* Links */}
          <div className="mt-6 md:mt-8 text-center">
            <p className="text-sm md:text-base text-gray-600">
              Remember your password?{' '}
              <Link href="/auth/login" className="text-primary-600 hover:text-primary-700 font-semibold transition-colors">
                Back to Login
              </Link>
            </p>
          </div>
        </div>
      </div>
    </div>
  )
}
