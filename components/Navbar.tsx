'use client'

import Image from 'next/image'
import Link from 'next/link'
import { useEffect, useState, useRef } from 'react'
import { usePathname } from 'next/navigation'
import { createClient } from '@/lib/supabase/client'
import { Menu, Settings, HelpCircle, Shield, FileText, LogOut, CreditCard, Sparkles, Info, BookOpen } from 'lucide-react'
import { useSubscription } from '@/contexts/SubscriptionContext'

export default function Navbar() {
  const [isAuthenticated, setIsAuthenticated] = useState(false)
  const [isAdmin, setIsAdmin] = useState(false)
  const [isMenuOpen, setIsMenuOpen] = useState(false)
  const [focusedIndex, setFocusedIndex] = useState(-1)
  const supabase = createClient()
  const pathname = usePathname()
  const { hasActiveSubscription, subscriptionTier, storiesRemaining, monthlyLimit } = useSubscription()

  // Hide hamburger menu on onboarding pages for a cleaner focused experience
  const hideHamburgerMenu = pathname?.startsWith('/onboarding')

  // Hide Get Started button on waitlist page
  const hideGetStarted = pathname === '/waitlist'
  const dropdownRef = useRef<HTMLDivElement>(null)
  const menuButtonRef = useRef<HTMLButtonElement>(null)
  const menuItemRefs = useRef<(HTMLAnchorElement | HTMLButtonElement | null)[]>([])

  useEffect(() => {
    const checkAuth = async () => {
      const { data: { user } } = await supabase.auth.getUser()
      setIsAuthenticated(!!user)

      // Check if user is admin
      if (user) {
        const { data: userProfile } = await supabase
          .from('user_profiles')
          .select('user_type')
          .eq('id', user.id)
          .single()

        setIsAdmin(userProfile?.user_type === 'admin')
      }
    }

    checkAuth()

    // Listen for auth changes
    const { data: { subscription } } = supabase.auth.onAuthStateChange((_event, session) => {
      setIsAuthenticated(!!session)
      if (!session) {
        setIsAdmin(false)
      }
    })

    return () => subscription.unsubscribe()
  }, [])

  // Handle click outside and Escape key
  useEffect(() => {
    const handleClickOutside = (event: MouseEvent) => {
      if (
        dropdownRef.current &&
        !dropdownRef.current.contains(event.target as Node) &&
        menuButtonRef.current &&
        !menuButtonRef.current.contains(event.target as Node)
      ) {
        setIsMenuOpen(false)
        setFocusedIndex(-1)
      }
    }

    const handleEscape = (event: KeyboardEvent) => {
      if (event.key === 'Escape' && isMenuOpen) {
        setIsMenuOpen(false)
        setFocusedIndex(-1)
        menuButtonRef.current?.focus()
      }
    }

    if (isMenuOpen) {
      document.addEventListener('mousedown', handleClickOutside)
      document.addEventListener('keydown', handleEscape)
    }

    return () => {
      document.removeEventListener('mousedown', handleClickOutside)
      document.removeEventListener('keydown', handleEscape)
    }
  }, [isMenuOpen])

  // Focus first item when menu opens
  useEffect(() => {
    if (isMenuOpen && menuItemRefs.current[0]) {
      setFocusedIndex(0)
      menuItemRefs.current[0]?.focus()
    }
  }, [isMenuOpen])

  // Update focus when focusedIndex changes
  useEffect(() => {
    if (focusedIndex >= 0 && menuItemRefs.current[focusedIndex]) {
      menuItemRefs.current[focusedIndex]?.focus()
    }
  }, [focusedIndex])

  const handleMenuToggle = () => {
    setIsMenuOpen(!isMenuOpen)
    setFocusedIndex(-1)
  }

  const handleKeyDown = (event: React.KeyboardEvent, index: number, totalItems: number) => {
    switch (event.key) {
      case 'ArrowDown':
        event.preventDefault()
        setFocusedIndex((index + 1) % totalItems)
        break
      case 'ArrowUp':
        event.preventDefault()
        setFocusedIndex((index - 1 + totalItems) % totalItems)
        break
      case 'Home':
        event.preventDefault()
        setFocusedIndex(0)
        break
      case 'End':
        event.preventDefault()
        setFocusedIndex(totalItems - 1)
        break
    }
  }

  const closeMenu = () => {
    setIsMenuOpen(false)
    setFocusedIndex(-1)
  }

  // Menu items configuration (excluding Sign Out which needs special form handling)
  const menuItems = [
    { icon: Info, label: 'About', href: '/about' },
    { icon: CreditCard, label: 'Billing & Subscription', href: '/dashboard/billing' },
    ...(isAdmin ? [{ icon: Shield, label: 'Admin Dashboard', href: '/dashboard/admin' }] : []),
    { icon: Settings, label: 'Settings', href: '/dashboard/settings' },
    { icon: HelpCircle, label: 'Help', href: '/faq' },
    { icon: Shield, label: 'Privacy Policy', href: '/privacy' },
    { icon: FileText, label: 'Terms of Service', href: '/terms' },
  ]

  return (
    <nav className="fixed top-0 left-0 right-0 z-50 bg-white border-b border-gray-200 shadow-soft">
      <div className="container-narrow section-padding pr-4 md:pr-6">
        <div className="flex items-center justify-center md:justify-between gap-4 h-20">
          {hideHamburgerMenu ? (
            // Non-clickable logo on onboarding pages
            <div className="flex items-center gap-2 min-h-[44px]">
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
            </div>
          ) : (
            // Clickable logo on other pages
            <Link href={isAuthenticated ? "/dashboard" : "/auth/login"} className="flex items-center gap-2 active:opacity-70 transition-opacity min-h-[44px]">
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
          )}

          {/* Auth Actions */}
          {isAuthenticated && !hideHamburgerMenu ? (
            <div className="relative">
              <button
                ref={menuButtonRef}
                onClick={handleMenuToggle}
                className="px-4 py-2.5 text-sm md:text-base min-h-[44px] rounded-xl md:rounded-2xl border-2 border-primary-600 text-primary-600 active:bg-primary-50 transition-all flex items-center justify-center gap-2 font-semibold"
                aria-label="Open menu"
                aria-expanded={isMenuOpen}
                aria-haspopup="true"
              >
                <Menu className="w-5 h-5" />
              </button>

              {/* Dropdown Menu */}
              {isMenuOpen && (
                <div
                  ref={dropdownRef}
                  className="absolute right-0 top-full mt-2 w-64 bg-white rounded-2xl shadow-card border border-gray-200 overflow-hidden transition-all duration-200 ease-smooth opacity-100 scale-100"
                  role="menu"
                  aria-orientation="vertical"
                >
                  {/* Subscription Status Header */}
                  <div className="px-4 py-3 bg-gradient-to-r from-sky-50 to-primary-50 border-b border-gray-200">
                    <div className="flex items-center justify-between">
                      <div className="flex items-center gap-2">
                        {hasActiveSubscription ? (
                          <>
                            <Sparkles className="w-4 h-4 text-primary-600" />
                            <span className="text-sm font-semibold text-primary-700">Stories Plus</span>
                          </>
                        ) : (
                          <>
                            <BookOpen className="w-4 h-4 text-gray-600" />
                            <span className="text-sm font-semibold text-gray-700">Free</span>
                          </>
                        )}
                      </div>
                      {!hasActiveSubscription && (
                        <Link
                          href="/pricing"
                          onClick={closeMenu}
                          className="text-xs font-semibold text-primary-600 hover:text-primary-700 flex items-center gap-1"
                        >
                          <Sparkles className="w-3 h-3" />
                          Upgrade
                        </Link>
                      )}
                      {hasActiveSubscription && storiesRemaining !== null && (
                        <span className="text-xs text-gray-600">
                          {storiesRemaining}/{monthlyLimit} stories
                        </span>
                      )}
                    </div>
                  </div>

                  <div className="py-2">
                    {menuItems.map((item, index) => {
                      const Icon = item.icon
                      return (
                        <Link
                          key={item.href}
                          href={item.href}
                          ref={(el) => { menuItemRefs.current[index] = el }}
                          onClick={closeMenu}
                          onKeyDown={(e) => handleKeyDown(e, index, menuItems.length + 1)}
                          className="flex items-center gap-3 px-4 py-3 text-sm md:text-base text-primary-600 hover:bg-primary-50 transition-colors duration-200 focus:bg-primary-50 focus:outline-none"
                          role="menuitem"
                          tabIndex={0}
                        >
                          <Icon className="w-5 h-5 flex-shrink-0" />
                          <span className="font-medium">{item.label}</span>
                        </Link>
                      )
                    })}

                    {/* Divider */}
                    <div className="my-2 border-t border-gray-200" />

                    {/* Sign Out */}
                    <form action="/auth/signout" method="post">
                      <button
                        type="submit"
                        ref={(el) => { menuItemRefs.current[menuItems.length] = el }}
                        onKeyDown={(e) => handleKeyDown(e, menuItems.length, menuItems.length + 1)}
                        className="w-full flex items-center gap-3 px-4 py-3 text-sm md:text-base text-primary-600 hover:bg-primary-50 transition-colors duration-200 focus:bg-primary-50 focus:outline-none"
                        role="menuitem"
                        tabIndex={0}
                      >
                        <LogOut className="w-5 h-5 flex-shrink-0" />
                        <span className="font-medium">Sign Out</span>
                      </button>
                    </form>
                  </div>
                </div>
              )}
            </div>
          ) : !isAuthenticated && !hideGetStarted ? (
            <Link href="/auth/login" className="hidden md:block">
              <button className="btn-primary px-5 py-2.5 text-sm md:text-base min-h-[44px] rounded-xl md:rounded-2xl whitespace-nowrap">
                Get Started
              </button>
            </Link>
          ) : null}
        </div>
      </div>
    </nav>
  )
}
