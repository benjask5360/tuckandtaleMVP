'use client'

import { useState, useEffect } from 'react'
import Link from 'next/link'
import { createClient } from '@/lib/supabase/client'
import { Plus, Edit, Trash2, Star, Dog, Sparkles, Heart } from 'lucide-react'
import { useRouter } from 'next/navigation'
import { getCharacterTypeById } from '@/lib/character-types'

interface CharacterProfile {
  id: string
  name: string
  character_type: string
  attributes: any
  created_at: string
  avatar_cache?: {
    image_url: string
  } | null
}

export default function OtherCharactersPage() {
  const [characters, setCharacters] = useState<CharacterProfile[]>([])
  const [loading, setLoading] = useState(true)
  const [error, setError] = useState<string | null>(null)
  const [userTier, setUserTier] = useState<any>(null)
  const router = useRouter()
  const supabase = createClient()

  useEffect(() => {
    loadCharacters()
    loadUserTier()
  }, [])

  const loadCharacters = async () => {
    try {
      const { data: { user } } = await supabase.auth.getUser()
      if (!user) {
        router.push('/auth/login')
        return
      }

      const { data, error } = await supabase
        .from('character_profiles')
        .select('*')
        .eq('user_id', user.id)
        .neq('character_type', 'child')
        .is('deleted_at', null)
        .order('created_at', { ascending: true })

      if (error) throw error

      // Manually fetch avatars for each character
      const charactersWithAvatars = await Promise.all(
        (data || []).map(async (character) => {
          if (character.avatar_cache_id) {
            const { data: avatar } = await supabase
              .from('avatar_cache')
              .select('image_url')
              .eq('id', character.avatar_cache_id)
              .single()

            return { ...character, avatar_cache: avatar }
          }
          return { ...character, avatar_cache: null }
        })
      )

      setCharacters(charactersWithAvatars)
    } catch (err: any) {
      setError(err.message)
    } finally {
      setLoading(false)
    }
  }

  const loadUserTier = async () => {
    try {
      const { data: { user } } = await supabase.auth.getUser()
      if (!user) return

      const { data } = await supabase
        .from('user_profiles')
        .select(`
          subscription_tier_id,
          subscription_tiers (
            tier_name,
            display_name,
            max_other_characters
          )
        `)
        .eq('id', user.id)
        .single()

      setUserTier(data?.subscription_tiers)
    } catch (err) {
      console.error('Error loading user tier:', err)
    }
  }

  const handleDelete = async (id: string) => {
    if (!confirm('Are you sure you want to delete this character?')) return

    try {
      const { error } = await supabase
        .from('character_profiles')
        .update({ deleted_at: new Date().toISOString() })
        .eq('id', id)

      if (error) throw error
      loadCharacters()
    } catch (err: any) {
      alert('Failed to delete character: ' + err.message)
    }
  }

  const getCharacterIcon = (type: string) => {
    switch(type) {
      case 'pet':
        return <Dog className="w-6 h-6" />
      case 'magical_creature':
        return <Sparkles className="w-6 h-6" />
      case 'storybook_character':
      default:
        return <Star className="w-6 h-6" />
    }
  }

  const getCharacterTypeDisplay = (type: string) => {
    const config = getCharacterTypeById(type)
    return config?.displayName || type
  }

  const maxCharacters = userTier?.max_other_characters !== undefined ? userTier.max_other_characters : 0
  const canAddMore = maxCharacters === null || characters.length < maxCharacters

  if (loading) {
    return (
      <div className="min-h-screen bg-white p-6">
        <div className="max-w-6xl mx-auto">
          <p className="text-neutral-600">Loading...</p>
        </div>
      </div>
    )
  }

  return (
    <div className="min-h-screen bg-gray-50">
      <div className="max-w-7xl mx-auto px-4 sm:px-6 py-6 md:py-8 pt-16 md:pt-20">
        {/* Header */}
        <div className="mb-6 md:mb-8">
          <Link
            href="/dashboard"
            className="inline-flex items-center gap-2 text-primary-600 active:text-primary-700 md:hover:text-primary-700 font-semibold mb-4 md:mb-6 min-h-[44px] transition-colors"
          >
            ← Back to Dashboard
          </Link>

          <div className="card p-6 md:p-8">
            <div className="flex flex-col md:flex-row md:justify-between md:items-center gap-4 md:gap-6">
              <div className="text-center md:text-left">
                <h1 className="text-3xl sm:text-4xl md:text-5xl font-display font-bold text-gray-900 mb-2">
                  Other Characters
                </h1>
                <p className="text-base md:text-lg text-gray-600">
                  Manage your magical friends, pets, and storybook characters
                </p>
              </div>
              <div className="text-center md:text-right flex-shrink-0">
                <p className="text-sm md:text-base text-gray-500 mb-3 md:mb-4">
                  {characters.length} / {maxCharacters === null ? '∞' : maxCharacters} characters
                </p>
                {canAddMore ? (
                  <Link
                    href="/dashboard/other-characters/create"
                    className="btn-purple btn-md inline-flex items-center gap-2"
                  >
                    <Plus className="w-5 h-5" />
                    Add Character
                  </Link>
                ) : (
                  <button
                    disabled
                    className="btn-md inline-flex items-center gap-2 px-6 py-3.5 bg-gray-300 text-gray-500 font-semibold rounded-2xl cursor-not-allowed min-h-[48px]"
                  >
                    <Plus className="w-5 h-5" />
                    Limit Reached
                  </button>
                )}
              </div>
            </div>
          </div>
        </div>

        {/* Error Message */}
        {error && (
          <div className="bg-red-50 border-2 border-red-200 text-red-700 px-5 py-4 rounded-2xl text-sm font-medium mb-6 md:mb-8">
            {error}
          </div>
        )}

        {/* Characters Grid */}
        {characters.length === 0 ? (
          <div className="card p-8 md:p-12 text-center">
            <Sparkles className="w-14 h-14 md:w-16 md:h-16 text-gray-300 mx-auto mb-4 md:mb-6" />
            <h3 className="text-xl md:text-2xl font-bold text-gray-700 mb-2 md:mb-3">No characters yet</h3>
            <p className="text-base md:text-lg text-gray-500 mb-6 md:mb-8">Add magical friends to enrich your stories</p>
            {canAddMore && (
              <Link
                href="/dashboard/other-characters/create"
                className="btn-purple btn-md inline-flex items-center gap-2"
              >
                <Plus className="w-5 h-5" />
                Add Your First Character
              </Link>
            )}
            {!canAddMore && userTier?.tier_name === 'free' && (
              <div className="mt-6 md:mt-8 p-4 md:p-6 bg-yellow-50 rounded-2xl border-2 border-yellow-200">
                <p className="text-yellow-800 text-sm md:text-base font-medium">
                  Upgrade to add magical characters to your stories!
                </p>
              </div>
            )}
          </div>
        ) : (
          <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6 md:gap-8">
            {characters.map(character => (
              <div key={character.id} className="card p-6 md:p-8 active:shadow-card-hover active:scale-[0.98] md:hover:shadow-card-hover md:hover:-translate-y-1 transition-all duration-300">
                <div>
                  {/* Avatar & Type Icon */}
                  <div className="relative">
                    <div className="w-24 h-24 mx-auto mb-4 flex items-center justify-center">
                      {character.avatar_cache?.image_url ? (
                        <img
                          src={character.avatar_cache.image_url}
                          alt={character.name}
                          className="w-24 h-24 rounded-full object-cover"
                        />
                      ) : (
                        <div className="w-24 h-24 bg-gradient-to-br from-purple-200 to-pink-200 rounded-full flex items-center justify-center">
                          <span className="text-3xl font-bold text-white">
                            {character.name.charAt(0).toUpperCase()}
                          </span>
                        </div>
                      )}
                    </div>
                    <div className="absolute top-0 right-1/4 transform translate-x-1/2 -translate-y-1">
                      <div className="bg-white rounded-full p-2 shadow-md text-purple-500">
                        {getCharacterIcon(character.character_type)}
                      </div>
                    </div>
                  </div>

                  {/* Name & Type */}
                  <div className="text-center mb-3 md:mb-4">
                    <h3 className="text-xl md:text-2xl font-bold text-gray-800">
                      {character.name}
                    </h3>
                    <span className="inline-block mt-2 badge-purple text-xs md:text-sm">
                      {getCharacterTypeDisplay(character.character_type)}
                    </span>
                  </div>

                  {/* Details */}
                  <div className="space-y-2 text-sm md:text-base text-gray-600 mb-4 md:mb-6">
                    {character.character_type === 'pet' && character.attributes.species && (
                      <div className="text-center md:text-left">Species: {character.attributes.species}</div>
                    )}
                    {character.character_type === 'pet' && character.attributes.breed && (
                      <div className="text-center md:text-left">Breed: {character.attributes.breed}</div>
                    )}
                    {character.character_type === 'magical_creature' && character.attributes.creatureType && (
                      <div className="text-center md:text-left">Type: {character.attributes.creatureType}</div>
                    )}
                    {character.character_type === 'storybook_character' && character.attributes.age && (
                      <div className="text-center md:text-left">Age: {character.attributes.age} years</div>
                    )}
                  </div>

                  {/* Actions */}
                  <div className="flex gap-2 md:gap-3">
                    <Link
                      href={`/dashboard/other-characters/${character.id}/edit`}
                      className="flex-1 flex items-center justify-center gap-2 px-4 py-3 bg-purple-50 text-purple-600 font-semibold rounded-xl active:bg-purple-100 md:hover:bg-purple-100 transition-colors min-h-[44px]"
                    >
                      <Edit className="w-4 h-4" />
                      Edit
                    </Link>
                    <button
                      onClick={() => handleDelete(character.id)}
                      className="flex-1 flex items-center justify-center gap-2 px-4 py-3 bg-red-50 text-red-600 font-semibold rounded-xl active:bg-red-100 md:hover:bg-red-100 transition-colors min-h-[44px]"
                    >
                      <Trash2 className="w-4 h-4" />
                      Delete
                    </button>
                  </div>
                </div>
              </div>
            ))}
          </div>
        )}

        {/* Upgrade Prompt */}
        {!canAddMore && userTier && (
          <div className="mt-6 md:mt-8 bg-gradient-to-r from-purple-50 to-pink-50 rounded-2xl p-6 md:p-8 text-center">
            <p className="text-base md:text-lg text-gray-700 font-medium mb-4 md:mb-6">
              You've reached the character limit for your {userTier.display_name} plan.
            </p>
            <Link
              href="/pricing"
              className="btn-purple btn-md inline-flex items-center gap-2"
            >
              Upgrade for More Characters
            </Link>
          </div>
        )}
      </div>

      {/* Footer */}
      <footer className="py-12 bg-white border-t border-gray-200 mt-20">
        <div className="max-w-7xl mx-auto px-6">
          <div className="flex flex-col items-center gap-6 text-sm">
            <p className="flex items-center gap-2 text-lg text-gray-700">
              Made with <Heart className="w-5 h-5 fill-red-500 text-red-500 animate-pulse-soft" /> for little dreamers everywhere
            </p>
            <div className="flex flex-col md:flex-row justify-between items-center w-full gap-6">
              <p className="text-center md:text-left text-gray-500">© 2024 Tuck and Tale™. All rights reserved.</p>
              <nav className="grid grid-cols-2 sm:grid-cols-3 md:flex md:flex-row gap-x-8 gap-y-4 text-center md:text-left text-gray-600">
                <a href="#" className="hover:text-primary-600 transition-colors">About</a>
                <a href="#" className="hover:text-primary-600 transition-colors">Contact Us</a>
                <a href="#" className="hover:text-primary-600 transition-colors">FAQ</a>
                <a href="#" className="hover:text-primary-600 transition-colors">Founder Parents</a>
                <a href="#" className="hover:text-primary-600 transition-colors">Privacy Policy</a>
                <a href="#" className="hover:text-primary-600 transition-colors">Terms of Service</a>
              </nav>
            </div>
          </div>
        </div>
      </footer>
    </div>
  )
}