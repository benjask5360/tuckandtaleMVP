'use client'

import { useState } from 'react'
import { createClient } from '@/lib/supabase/client'
import { useRouter } from 'next/navigation'
import AuthCard from '@/components/auth/AuthCard'
import { Loader2 } from 'lucide-react'

export default function CharacterOnboarding() {
  const [name, setName] = useState('')
  const [age, setAge] = useState(5)
  const [favoriteAnimal, setFavoriteAnimal] = useState('')
  const [favoriteColor, setFavoriteColor] = useState('')
  const [favoriteHobby, setFavoriteHobby] = useState('')
  const [loading, setLoading] = useState(false)
  const [error, setError] = useState<string | null>(null)
  const router = useRouter()
  const supabase = createClient()

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault()
    setError(null)
    setLoading(true)

    try {
      const { data: { user } } = await supabase.auth.getUser()

      if (!user) {
        setError('You must be logged in to create a character')
        setLoading(false)
        return
      }

      // Build attributes object
      const attributes = {
        age,
        favoriteAnimal,
        favoriteColor,
        favoriteHobby,
      }

      // Generate appearance description from attributes
      const appearanceDescription = `A ${age}-year-old child who loves ${favoriteAnimal}s, the color ${favoriteColor}, and ${favoriteHobby}. Happy and playful with a bright smile.`

      // Create character
      const response = await fetch('/api/characters/create', {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
        },
        body: JSON.stringify({
          name,
          attributes,
          appearanceDescription,
          isFirstTime: true, // This will trigger avatar generation
        }),
      })

      const data = await response.json()

      if (!response.ok) {
        throw new Error(data.error || 'Failed to create character')
      }

      // Redirect to dashboard
      router.push('/dashboard')
    } catch (err: any) {
      setError(err.message)
      setLoading(false)
    }
  }

  return (
    <AuthCard
      title={`Let's create ${name || 'your child'}'s first character`}
      subtitle="Just a few details to personalize their stories"
    >
      <form onSubmit={handleSubmit} className="space-y-6">
        {error && (
          <div className="bg-red-50 border border-red-200 text-red-800 px-4 py-3 rounded-lg text-sm">
            {error}
          </div>
        )}

        {/* Character Name */}
        <div>
          <label htmlFor="name" className="block text-sm font-medium text-neutral-700 mb-2">
            Child's Name
          </label>
          <input
            id="name"
            type="text"
            value={name}
            onChange={(e) => setName(e.target.value)}
            required
            className="w-full px-4 py-3 border border-neutral-300 rounded-lg focus:ring-2 focus:ring-primary-500 focus:border-transparent transition-shadow"
            placeholder="e.g., Emma"
          />
        </div>

        {/* Age Slider */}
        <div>
          <label htmlFor="age" className="block text-sm font-medium text-neutral-700 mb-2">
            Age: {age} years old
          </label>
          <input
            id="age"
            type="range"
            min="2"
            max="12"
            value={age}
            onChange={(e) => setAge(parseInt(e.target.value))}
            className="w-full h-2 bg-neutral-200 rounded-lg appearance-none cursor-pointer slider"
          />
          <div className="flex justify-between text-xs text-neutral-500 mt-1">
            <span>2</span>
            <span>12</span>
          </div>
        </div>

        {/* Favorite Things */}
        <div className="grid grid-cols-1 gap-4">
          <div>
            <label htmlFor="favoriteAnimal" className="block text-sm font-medium text-neutral-700 mb-2">
              Favorite Animal
            </label>
            <input
              id="favoriteAnimal"
              type="text"
              value={favoriteAnimal}
              onChange={(e) => setFavoriteAnimal(e.target.value)}
              required
              className="w-full px-4 py-3 border border-neutral-300 rounded-lg focus:ring-2 focus:ring-primary-500 focus:border-transparent transition-shadow"
              placeholder="e.g., elephant, dragon, bunny"
            />
          </div>

          <div>
            <label htmlFor="favoriteColor" className="block text-sm font-medium text-neutral-700 mb-2">
              Favorite Color
            </label>
            <input
              id="favoriteColor"
              type="text"
              value={favoriteColor}
              onChange={(e) => setFavoriteColor(e.target.value)}
              required
              className="w-full px-4 py-3 border border-neutral-300 rounded-lg focus:ring-2 focus:ring-primary-500 focus:border-transparent transition-shadow"
              placeholder="e.g., blue, pink, rainbow"
            />
          </div>

          <div>
            <label htmlFor="favoriteHobby" className="block text-sm font-medium text-neutral-700 mb-2">
              Favorite Activity/Hobby
            </label>
            <input
              id="favoriteHobby"
              type="text"
              value={favoriteHobby}
              onChange={(e) => setFavoriteHobby(e.target.value)}
              required
              className="w-full px-4 py-3 border border-neutral-300 rounded-lg focus:ring-2 focus:ring-primary-500 focus:border-transparent transition-shadow"
              placeholder="e.g., drawing, dancing, exploring"
            />
          </div>
        </div>

        {/* Submit Button */}
        <button
          type="submit"
          disabled={loading}
          className="w-full btn-primary btn-lg flex items-center justify-center gap-2"
        >
          {loading ? (
            <>
              <Loader2 className="w-5 h-5 animate-spin" />
              Creating {name}'s character...
            </>
          ) : (
            `Create ${name}'s Character`
          )}
        </button>

        <p className="text-center text-xs text-neutral-500">
          We'll generate a unique avatar for {name || 'your child'} in the next step!
        </p>
      </form>

      <style jsx>{`
        .slider::-webkit-slider-thumb {
          appearance: none;
          width: 20px;
          height: 20px;
          background: linear-gradient(90deg, #60a5fa 0%, #3b82f6 50%, #2563eb 100%);
          cursor: pointer;
          border-radius: 50%;
        }

        .slider::-moz-range-thumb {
          width: 20px;
          height: 20px;
          background: linear-gradient(90deg, #60a5fa 0%, #3b82f6 50%, #2563eb 100%);
          cursor: pointer;
          border-radius: 50%;
          border: none;
        }
      `}</style>
    </AuthCard>
  )
}
