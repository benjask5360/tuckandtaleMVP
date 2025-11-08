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
        <div className="flex items-center justify-between h-16 md:h-20">
          {/* Logo and Brand */}
          <Link href="/" className="flex items-center gap-2 active:opacity-70 transition-opacity min-h-[44px]">
            <div className="w-[50px] h-[50px] md:w-[60px] md:h-[60px] relative flex-shrink-0">
              <Image
                src="/images/logo.png"
                alt="Tuck and Tale Logo"
                width={60}
                height={60}
                className="object-contain"
                priority
              />
            </div>
            <div className="flex items-start gap-0.5">
              <span className="gradient-text whitespace-nowrap font-display font-extrabold text-xl md:text-2xl lg:text-3xl">
                Tuck and Tale
              </span>
              <span className="gradient-text font-display font-extrabold text-base md:text-lg lg:text-xl">™</span>
            </div>
          </Link>

          {/* Auth Actions - Mobile optimized */}
          {isAuthenticated ? (
            <div className="flex items-center gap-1 sm:gap-2">
              <Link
                href="/dashboard/settings"
                className="p-3 active:bg-primary-100 rounded-xl transition-all min-h-[44px] min-w-[44px] flex items-center justify-center"
                aria-label="Settings"
              >
                <Settings className="w-5 h-5 md:w-6 md:h-6 text-gray-700" />
              </Link>
              <form action="/auth/signout" method="post" className="inline">
                <button
                  type="submit"
                  className="btn-ghost px-3 py-2 text-sm md:text-base min-h-[44px]"
                >
                  Sign Out
                </button>
              </form>
            </div>
          ) : (
            <Link href="/auth/login">
              <button className="btn-primary px-5 py-2.5 text-sm md:text-base min-h-[44px] rounded-xl md:rounded-2xl">
                Login
              </button>
            </Link>
          )}
        </div>
      </div>
    </nav>
  )
}
