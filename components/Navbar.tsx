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
      <div className="container-narrow section-padding pr-4 md:pr-6">
        <div className="flex items-center justify-between gap-4 h-20">
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

          {/* Auth Actions */}
          {isAuthenticated ? (
            <div className="flex items-center gap-3">
              <Link
                href="/dashboard/settings"
                className="px-4 py-2.5 text-sm md:text-base min-h-[44px] rounded-xl md:rounded-2xl border-2 border-primary-600 text-primary-600 active:bg-primary-50 transition-all flex items-center justify-center gap-2 font-semibold"
                aria-label="Settings"
              >
                <Settings className="w-4 h-4 md:w-5 md:h-5" />
              </Link>
              <form action="/auth/signout" method="post" className="inline">
                <button
                  type="submit"
                  className="px-4 py-2.5 text-sm md:text-base min-h-[44px] rounded-xl md:rounded-2xl border-2 border-primary-600 text-primary-600 active:bg-primary-50 transition-all flex items-center justify-center font-semibold whitespace-nowrap"
                >
                  Sign Out
                </button>
              </form>
            </div>
          ) : (
            <Link href="/auth/login">
              <button className="btn-primary px-5 py-2.5 text-sm md:text-base min-h-[44px] rounded-xl md:rounded-2xl">
                Get Started
              </button>
            </Link>
          )}
        </div>
      </div>
    </nav>
  )
}
