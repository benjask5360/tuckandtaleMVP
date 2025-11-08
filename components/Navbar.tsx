'use client'

import Image from 'next/image'
import Link from 'next/link'
import { useEffect, useState } from 'react'
import { createClient } from '@/lib/supabase/client'
import { Settings } from 'lucide-react'

export default function Navbar() {
  const [isAuthenticated, setIsAuthenticated] = useState(false)
  const supabase = createClient()

  useEffect(() => {
    const checkAuth = async () => {
      const { data: { user } } = await supabase.auth.getUser()
      setIsAuthenticated(!!user)
    }

    checkAuth()

    // Listen for auth changes
    const { data: { subscription } } = supabase.auth.onAuthStateChange((_event, session) => {
      setIsAuthenticated(!!session)
    })

    return () => subscription.unsubscribe()
  }, [])

  return (
    <nav className="fixed top-0 left-0 right-0 z-50 glass-effect border-b border-gray-200/60 shadow-soft">
      <div className="container-narrow section-padding">
        <div className="flex items-center justify-between h-20">
          {/* Logo and Brand */}
          <Link href="/" className="flex items-center gap-2 sm:gap-2.5 hover:opacity-90 transition-all hover:scale-[1.02]">
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

          {/* Auth Actions */}
          {isAuthenticated ? (
            <div className="flex items-center gap-2 sm:gap-3">
              <Link
                href="/dashboard/settings"
                className="p-2.5 hover:bg-primary-50 rounded-xl transition-all hover:scale-105"
                aria-label="Settings"
              >
                <Settings className="w-5 h-5 text-gray-700 hover:text-primary-600 transition-colors" />
              </Link>
              <form action="/auth/signout" method="post" className="inline">
                <button
                  type="submit"
                  className="btn-ghost btn-sm"
                >
                  Sign Out
                </button>
              </form>
            </div>
          ) : (
            <Link href="/auth/login">
              <button className="btn-primary btn-sm">
                Login
              </button>
            </Link>
          )}
        </div>
      </div>
    </nav>
  )
}
