'use client'

import Link from 'next/link'
import Image from 'next/image'

export default function AuthCodeErrorPage() {
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
            Invalid or Expired Link
          </h1>
          <p className="text-center text-base md:text-lg text-gray-600 mb-6 md:mb-8">
            This password reset link is invalid or has expired. Please request a new one.
          </p>

          {/* Error Message */}
          <div className="bg-red-50 border-2 border-red-200 text-red-700 px-5 py-4 rounded-2xl mb-6 text-sm font-medium text-center">
            The authentication code could not be verified
          </div>

          {/* Actions */}
          <div className="space-y-4">
            <Link
              href="/auth/reset-password"
              className="btn-primary btn-lg w-full block text-center"
            >
              Request New Reset Link
            </Link>
            <Link
              href="/auth/login"
              className="btn-secondary btn-lg w-full block text-center"
            >
              Back to Login
            </Link>
          </div>
        </div>
      </div>
    </div>
  )
}
