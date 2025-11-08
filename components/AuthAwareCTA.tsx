'use client'

import { useEffect, useState } from 'react'
import { useRouter } from 'next/navigation'
import { createClient } from '@/lib/supabase/client'
import { ArrowRight } from 'lucide-react'

interface AuthAwareCTAProps {
  className?: string
  children?: React.ReactNode
}

export default function AuthAwareCTA({ className = "btn-primary btn-xl group", children }: AuthAwareCTAProps) {
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
      router.push('/dashboard')
    } else {
      router.push('/auth/signup')
    }
  }

  if (isLoading) {
    return (
      <button className={className} disabled>
        {children || (
          <>
            Start Creating Stories
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
          {isAuthenticated ? 'Go to Dashboard' : 'Start Creating Stories'}
          <ArrowRight className="w-5 h-5 ml-2 group-hover:translate-x-1 transition-transform" />
        </>
      )}
    </button>
  )
}
