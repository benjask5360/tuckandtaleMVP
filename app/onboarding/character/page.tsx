'use client'

import { getCharacterTypeById } from '@/lib/character-types'
import DynamicCharacterForm from '@/components/forms/DynamicCharacterForm'
import { useRouter, useSearchParams } from 'next/navigation'
import { useEffect, useState, useRef, Suspense } from 'react'
import { createClient } from '@/lib/supabase/client'
import TermsConsentModal from '@/components/auth/TermsConsentModal'
import ParentNameCollector from '@/components/onboarding/ParentNameCollector'
import { getStoredUTMs, clearStoredUTMs } from '@/lib/utils/utm'

function CharacterOnboardingContent() {
  const router = useRouter()
  const searchParams = useSearchParams()
  const childType = getCharacterTypeById('child')
  const [showTermsModal, setShowTermsModal] = useState(false)
  const [showNameCollector, setShowNameCollector] = useState(false)
  const [userId, setUserId] = useState<string | null>(null)
  const [isLoading, setIsLoading] = useState(true)
  const leadPixelFired = useRef(false)

  // Fire Lead pixel for new Google OAuth users
  useEffect(() => {
    const isNewUser = searchParams.get('newuser') === 'true'
    if (isNewUser && !leadPixelFired.current) {
      leadPixelFired.current = true
      if (typeof window !== 'undefined' && window.fbq) {
        window.fbq('track', 'Lead')
      }
    }
  }, [searchParams])

  // Check if user needs to provide name or accept terms
  useEffect(() => {
    const checkUserProfile = async () => {
      const supabase = createClient()
      const { data: { user } } = await supabase.auth.getUser()
      if (!user) {
        setIsLoading(false)
        return
      }

      setUserId(user.id)

      // Get user profile
      const { data: profile, error } = await supabase
        .from('user_profiles')
        .select('full_name, terms_accepted_at, privacy_accepted_at')
        .eq('id', user.id)
        .single()

      if (error) {
        console.error('Error fetching user profile:', error)
        setIsLoading(false)
        return
      }

      // Priority 1: Check if name is missing (for all users)
      if (!profile.full_name || profile.full_name.trim() === '') {
        setShowNameCollector(true)
      }
      // Priority 2: Check if terms need to be accepted (OAuth users)
      else if (!profile.terms_accepted_at || !profile.privacy_accepted_at) {
        setShowTermsModal(true)
      }

      setIsLoading(false)
    }

    checkUserProfile()
  }, [])

  // Show loading state while checking profile
  if (isLoading) {
    return (
      <div className="min-h-screen bg-white flex items-center justify-center p-4 sm:p-6">
        <div className="card p-6 md:p-8 max-w-md">
          <p className="text-gray-600 font-medium text-center">Loading...</p>
        </div>
      </div>
    )
  }

  // Show name collector if name is missing
  if (showNameCollector) {
    return (
      <ParentNameCollector
        onComplete={() => {
          // Save UTM params to user profile (non-blocking)
          try {
            const utms = getStoredUTMs()
            if (utms) {
              fetch('/api/utm', {
                method: 'POST',
                headers: { 'Content-Type': 'application/json' },
                body: JSON.stringify(utms),
              }).then(() => clearStoredUTMs()).catch(() => {})
            }
          } catch (e) {
            // Silent fail - UTM is non-critical
          }

          setShowNameCollector(false)
          // Recheck profile to see if terms modal should be shown
          const recheckProfile = async () => {
            const supabase = createClient()
            const { data: profile } = await supabase
              .from('user_profiles')
              .select('terms_accepted_at, privacy_accepted_at')
              .eq('id', userId!)
              .single()

            if (profile && (!profile.terms_accepted_at || !profile.privacy_accepted_at)) {
              setShowTermsModal(true)
            }
          }
          recheckProfile()
        }}
      />
    )
  }

  if (!childType) {
    return (
      <div className="min-h-screen bg-white flex items-center justify-center p-4 sm:p-6">
        <div className="card p-6 md:p-8 max-w-md">
          <p className="text-red-600 font-medium text-center">Configuration error: Child character type not found</p>
        </div>
      </div>
    )
  }

  const handleSubmit = async (data: any) => {
    // Add is_primary flag for first character during onboarding
    const submitData = {
      ...data,
      is_primary: true
    }

    const response = await fetch('/api/characters/create', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify(submitData)
    })

    if (!response.ok) {
      const errorData = await response.json()
      throw new Error(errorData.error || 'Failed to create character')
    }

    // Return the response data so DynamicCharacterForm can get the character ID
    const responseData = await response.json()

    // Return the response data so DynamicCharacterForm can get the character ID
    // The form will handle the avatar linking
    if (responseData.id) {
      // Return the data and include a redirect instruction
      return { ...responseData, shouldRedirect: true }
    }

    router.push('/dashboard')
  }

  return (
    <div className="min-h-screen bg-white flex items-center justify-center p-4 sm:p-6 pt-8 sm:pt-10">
      <div className="w-full max-w-3xl">
        <div className="card p-6 md:p-8 lg:p-10">
          <div className="text-center mb-6 md:mb-8">
            <h1 className="text-2xl sm:text-3xl md:text-4xl font-display font-bold text-gray-900 mb-3">
              Let's Create Your Child's Profile
            </h1>
            <p className="text-base md:text-lg text-gray-600">
              Just a few details to personalize their magical stories
            </p>
          </div>

          <DynamicCharacterForm
            characterType={childType}
            onSubmit={handleSubmit}
          />
        </div>

        <p className="text-center text-sm text-neutral-500 mt-6">
          Don't worry, you can always add more children and characters later!
        </p>
      </div>

      {/* Terms Consent Modal for OAuth users */}
      {showTermsModal && userId && (
        <TermsConsentModal
          userId={userId}
          onAccept={() => setShowTermsModal(false)}
        />
      )}
    </div>
  )
}

export default function CharacterOnboarding() {
  return (
    <Suspense fallback={<div className="min-h-screen bg-white flex items-center justify-center">Loading...</div>}>
      <CharacterOnboardingContent />
    </Suspense>
  )
}