'use client'

import { useState } from 'react'
import { createClient } from '@/lib/supabase/client'
import Link from 'next/link'
import Image from 'next/image'

export default function ResetPasswordPage() {
  const [email, setEmail] = useState('')
  const [loading, setLoading] = useState(false)
  const [message, setMessage] = useState<{ type: 'success' | 'error', text: string } | null>(null)
  const supabase = createClient()

  const handleResetPassword = async (e: React.FormEvent) => {
    e.preventDefault()
    setMessage(null)
    setLoading(true)

    const { error } = await supabase.auth.resetPasswordForEmail(email, {
      redirectTo: `${window.location.origin}/auth/update-password`,
    })

    if (error) {
      setMessage({ type: 'error', text: error.message })
    } else {
      setMessage({
        type: 'success',
        text: 'Check your email for the password reset link!'
      })
    }

    setLoading(false)
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
            Reset Your Password
          </h1>
          <p className="text-center text-base md:text-lg text-gray-600 mb-6 md:mb-8">
            Enter your email and we'll send you a link to reset your password
          </p>

          {/* Alert Messages */}
          {message && (
            <div className={`px-5 py-4 rounded-2xl mb-6 border-2 font-medium ${
              message.type === 'success'
                ? 'bg-green-50 text-green-700 border-green-200'
                : 'bg-red-50 text-red-700 border-red-200'
            }`}>
              {message.text}
            </div>
          )}

          {/* Form */}
          <form onSubmit={handleResetPassword} className="space-y-6">
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
                placeholder="your@email.com"
              />
            </div>

            <button
              type="submit"
              disabled={loading}
              className="btn-primary btn-lg w-full"
            >
              {loading ? 'Sending...' : 'Send Reset Link'}
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