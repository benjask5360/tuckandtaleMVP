import { ReactNode } from 'react'
import Link from 'next/link'
import Image from 'next/image'

interface AuthCardProps {
  children: ReactNode
  title?: string
  subtitle?: string
}

export default function AuthCard({ children, title, subtitle }: AuthCardProps) {
  return (
    <section className="relative min-h-screen flex items-center justify-center bg-white py-12 md:py-16">
      <div className="w-full max-w-lg px-4 sm:px-6 relative z-10">
        {/* Logo/Brand */}
        <Link href="/" className="flex items-center justify-center gap-2 sm:gap-2.5 hover:opacity-80 transition-opacity mb-6 md:mb-8 min-h-[44px]">
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

        {/* Title and Subtitle outside white box */}
        {(title || subtitle) && (
          <div className="text-center mb-6 md:mb-8">
            {title && (
              <h1 className="font-display text-2xl sm:text-3xl md:text-4xl font-bold gradient-text mb-2">
                {title}
              </h1>
            )}
            {subtitle && (
              <p className="text-base md:text-lg text-gray-600">
                {subtitle}
              </p>
            )}
          </div>
        )}

        {/* White card with form */}
        <div className="card p-6 md:p-8">
          {children}
        </div>

        {/* Back to Home Link */}
        <div className="text-center mt-6">
          <Link
            href="/"
            className="text-sm md:text-base text-primary-600 hover:text-primary-700 font-semibold inline-flex items-center gap-1 transition-colors min-h-[44px]"
          >
            ← Back to Home
          </Link>
        </div>
      </div>
    </section>
  )
}
