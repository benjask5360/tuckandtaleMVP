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
    <div className="min-h-screen bg-gradient-to-br from-blue-50 to-purple-50 flex items-center justify-center p-4">
      <div className="w-full max-w-md">
        <div className="bg-white rounded-2xl shadow-xl p-8">
          {/* Logo */}
          <div className="flex justify-center mb-8">
            <Link href="/" className="flex items-center gap-2">
              <div className="w-16 h-16 relative">
                <Image
                  src="/images/logo.png"
                  alt="Tuck and Tale Logo"
                  width={64}
                  height={64}
                  className="object-contain"
                />
              </div>
              <span className="gradient-text text-3xl font-bold">
                Tuck and Tale™
              </span>
            </Link>
          </div>

          {/* Title */}
          <h1 className="text-2xl font-bold text-center text-neutral-900 mb-2">
            Reset Your Password
          </h1>
          <p className="text-center text-neutral-600 mb-8">
            Enter your email and we'll send you a link to reset your password
          </p>

          {/* Alert Messages */}
          {message && (
            <div className={`p-4 rounded-lg mb-6 ${
              message.type === 'success'
                ? 'bg-green-50 text-green-800 border border-green-200'
                : 'bg-red-50 text-red-600 border border-red-200'
            }`}>
              {message.text}
            </div>
          )}

          {/* Form */}
          <form onSubmit={handleResetPassword} className="space-y-6">
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

            <button
              type="submit"
              disabled={loading}
              className="w-full px-6 py-3 bg-gradient-to-r from-blue-500 to-purple-500 text-white font-semibold rounded-xl hover:shadow-lg transition-all duration-300 disabled:opacity-50 disabled:cursor-not-allowed"
            >
              {loading ? 'Sending...' : 'Send Reset Link'}
            </button>
          </form>

          {/* Links */}
          <div className="mt-8 text-center">
            <p className="text-neutral-600">
              Remember your password?{' '}
              <Link href="/auth/login" className="text-blue-600 hover:text-blue-700 font-medium">
                Back to Login
              </Link>
            </p>
          </div>
        </div>
      </div>
    </div>
  )
}