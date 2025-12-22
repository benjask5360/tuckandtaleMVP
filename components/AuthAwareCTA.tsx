'use client'

import { useEffect, useState } from 'react'
import { useRouter } from 'next/navigation'
import { createClient } from '@/lib/supabase/client'
import { ArrowRight } from 'lucide-react'

interface AuthAwareCTAProps {
  className?: string
  children?: React.ReactNode
  promo?: string // Optional promo code to pass through auth flow (e.g., 'single-story')
}

export default function AuthAwareCTA({ className = "btn-primary btn-xl group", children, promo }: AuthAwareCTAProps) {
  const [isAuthenticated, setIsAuthenticated] = useState(false)
  const [isLoading, setIsLoading] = useState(true)
  const router = useRouter()
  const supabase = createClient()

  useEffect(() => {
    const checkAuth = async () => {
      const { data: { user } } = await supabase.auth.getUser()
      setIsAuthenticated(!!user)
      setIsLoading(false)
    }

    checkAuth()

    // Listen for auth changes
    const { data: { subscription } } = supabase.auth.onAuthStateChange((_event, session) => {
      setIsAuthenticated(!!session)
    })

    return () => subscription.unsubscribe()
  }, [])

  const handleClick = () => {
    if (isAuthenticated) {
      // If user is already authenticated and has promo, go to single-story pricing
      if (promo === 'single-story') {
        router.push('/onboarding/pricing/single-story')
      } else {
        router.push('/dashboard')
      }
    } else {
      // Pass promo param through auth flow
      const loginUrl = promo ? `/auth/login?promo=${promo}` : '/auth/login'
      router.push(loginUrl)
    }
  }

  if (isLoading) {
    return (
      <button className={className} disabled>
        {children || (
          <>
            Start Your Free Trial
            <ArrowRight className="w-5 h-5 ml-2" />
          </>
        )}
      </button>
    )
  }

  return (
    <button onClick={handleClick} className={className}>
      {children || (
        <>
          {isAuthenticated ? 'Go to Dashboard' : 'Start Your Free Trial'}
          <ArrowRight className="w-5 h-5 ml-2 group-hover:translate-x-1 transition-transform" />
        </>
      )}
    </button>
  )
}
