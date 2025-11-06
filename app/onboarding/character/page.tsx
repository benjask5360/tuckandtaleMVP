'use client'

import { getCharacterTypeById } from '@/lib/character-types'
import DynamicCharacterForm from '@/components/forms/DynamicCharacterForm'
import { useRouter } from 'next/navigation'
import Image from 'next/image'
import Link from 'next/link'

export default function CharacterOnboarding() {
  const router = useRouter()
  const childType = getCharacterTypeById('child')

  if (!childType) {
    return (
      <div className="min-h-screen bg-gradient-to-br from-blue-50 to-purple-50 p-6 flex items-center justify-center">
        <p className="text-red-600">Configuration error: Child character type not found</p>
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

    router.push('/dashboard')
  }

  return (
    <div className="min-h-screen bg-gradient-to-br from-blue-50 to-purple-50 p-6 flex items-center justify-center">
      <div className="w-full max-w-3xl">
        {/* Logo */}
        <Link href="/" className="flex items-center justify-center gap-2 mb-8">
          <div className="w-[60px] h-[60px] relative flex-shrink-0">
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
            <span className="gradient-text whitespace-nowrap" style={{ fontWeight: 800, fontSize: '2rem' }}>
              Tuck and Tale
            </span>
            <span className="gradient-text" style={{ fontWeight: 800, fontSize: '1.5rem' }}>™</span>
          </div>
        </Link>

        <div className="bg-white rounded-2xl shadow-2xl p-8">
          <div className="text-center mb-8">
            <h1 className="text-3xl font-bold text-neutral-900 mb-3">
              Let's Create Your Child's Profile
            </h1>
            <p className="text-neutral-600">
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
    </div>
  )
}