'use client'

import { getCharacterTypeById } from '@/lib/character-types'
import DynamicCharacterForm from '@/components/forms/DynamicCharacterForm'
import { useRouter } from 'next/navigation'
import Image from 'next/image'
import Link from 'next/link'
import { useEffect, useState } from 'react'
import { createClient } from '@/lib/supabase/client'
import TermsConsentModal from '@/components/auth/TermsConsentModal'

export default function CharacterOnboarding() {
  const router = useRouter()
  const childType = getCharacterTypeById('child')
  const [showTermsModal, setShowTermsModal] = useState(false)
  const [userId, setUserId] = useState<string | null>(null)

  // Check if user needs to accept terms (OAuth users)
  useEffect(() => {
    const checkTermsAcceptance = async () => {
      const supabase = createClient()
      const { data: { user } } = await supabase.auth.getUser()
      if (!user) return

      setUserId(user.id)

      // Check if user has already accepted terms
      const { data: profile, error } = await supabase
        .from('user_profiles')
        .select('terms_accepted_at, privacy_accepted_at')
        .eq('id', user.id)
        .single()

      if (error) {
        console.error('Error fetching user profile for terms check:', error)
        return
      }

      // Show modal if terms haven't been accepted
      if (profile && (!profile.terms_accepted_at || !profile.privacy_accepted_at)) {
        setShowTermsModal(true)
      }
    }

    checkTermsAcceptance()
  }, [])

  if (!childType) {
    return (
      <div className="min-h-screen bg-gray-50 flex items-center justify-center p-4 sm:p-6">
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
    <div className="min-h-screen bg-gray-50 flex items-center justify-center p-4 sm:p-6">
      <div className="w-full max-w-3xl">
        {/* Logo */}
        <Link href="/" className="flex items-center justify-center gap-2 mb-6 md:mb-8 min-h-[44px] hover:opacity-80 transition-opacity">
          <div className="w-[60px] h-[60px] md:w-[70px] md:h-[70px] relative flex-shrink-0">
            <Image
              src="/images/logo.png"
              alt="Tuck and Tale Logo"
              width={70}
              height={70}
              className="object-contain"
              priority
            />
          </div>
          <div className="flex items-start gap-0.5">
            <span className="gradient-text whitespace-nowrap font-display" style={{ fontWeight: 800, fontSize: 'clamp(1.5rem, 5vw, 2rem)' }}>
              Tuck and Tale
            </span>
            <span className="gradient-text font-display" style={{ fontWeight: 800, fontSize: 'clamp(1.125rem, 3.75vw, 1.5rem)' }}>™</span>
          </div>
        </Link>

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