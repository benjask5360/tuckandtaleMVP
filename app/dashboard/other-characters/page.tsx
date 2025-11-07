'use client'

import { useState, useEffect } from 'react'
import Link from 'next/link'
import { createClient } from '@/lib/supabase/client'
import { Plus, Edit, Trash2, Star, Dog, Sparkles } from 'lucide-react'
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
        .select(`
          *,
          avatar_cache:avatar_cache_id (
            image_url
          )
        `)
        .eq('user_id', user.id)
        .neq('character_type', 'child')
        .is('deleted_at', null)
        .order('created_at', { ascending: true })

      if (error) throw error
      setCharacters(data || [])
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
      <div className="min-h-screen bg-gradient-to-br from-blue-50 to-purple-50 p-6">
        <div className="max-w-6xl mx-auto">
          <p className="text-neutral-600">Loading...</p>
        </div>
      </div>
    )
  }

  return (
    <div className="min-h-screen bg-gradient-to-br from-blue-50 to-purple-50 p-6">
      <div className="max-w-6xl mx-auto">
        {/* Header */}
        <div className="mb-8">
          <Link
            href="/dashboard"
            className="inline-flex items-center gap-2 text-blue-600 hover:text-blue-700 font-medium mb-4"
          >
            ← Back to Dashboard
          </Link>

          <div className="bg-white rounded-2xl shadow-lg p-8">
            <div className="flex justify-between items-center">
              <div>
                <h1 className="text-3xl font-bold text-neutral-900 mb-2">
                  Other Characters
                </h1>
                <p className="text-neutral-600">
                  Manage your magical friends, pets, and storybook characters
                </p>
              </div>
              <div className="text-right">
                <p className="text-sm text-neutral-500 mb-2">
                  {characters.length} / {maxCharacters === null ? '∞' : maxCharacters} characters
                </p>
                {canAddMore ? (
                  <Link
                    href="/dashboard/other-characters/create"
                    className="inline-flex items-center gap-2 px-6 py-3 bg-gradient-to-r from-purple-500 to-pink-500 text-white font-semibold rounded-xl hover:shadow-lg transition-all duration-300"
                  >
                    <Plus className="w-5 h-5" />
                    Add Character
                  </Link>
                ) : (
                  <button
                    disabled
                    className="inline-flex items-center gap-2 px-6 py-3 bg-gray-300 text-gray-500 font-semibold rounded-xl cursor-not-allowed"
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
          <div className="bg-red-50 border border-red-200 text-red-800 px-4 py-3 rounded-lg text-sm mb-6">
            {error}
          </div>
        )}

        {/* Characters Grid */}
        {characters.length === 0 ? (
          <div className="bg-white rounded-2xl shadow-lg p-12 text-center">
            <Sparkles className="w-16 h-16 text-neutral-300 mx-auto mb-4" />
            <h3 className="text-xl font-semibold text-neutral-700 mb-2">No characters yet</h3>
            <p className="text-neutral-500 mb-6">Add magical friends to enrich your stories</p>
            {canAddMore && (
              <Link
                href="/dashboard/other-characters/create"
                className="inline-flex items-center gap-2 px-6 py-3 bg-gradient-to-r from-purple-500 to-pink-500 text-white font-semibold rounded-xl hover:shadow-lg transition-all duration-300"
              >
                <Plus className="w-5 h-5" />
                Add Your First Character
              </Link>
            )}
            {!canAddMore && userTier?.tier_name === 'free' && (
              <div className="mt-6 p-4 bg-yellow-50 rounded-lg">
                <p className="text-yellow-800 text-sm">
                  Upgrade to add magical characters to your stories!
                </p>
              </div>
            )}
          </div>
        ) : (
          <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
            {characters.map(character => (
              <div key={character.id} className="bg-white rounded-xl shadow-lg hover:shadow-xl transition-shadow duration-300">
                <div className="p-6">
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
                  <div className="text-center mb-3">
                    <h3 className="text-xl font-bold text-neutral-800">
                      {character.name}
                    </h3>
                    <span className="inline-block mt-1 px-3 py-1 bg-purple-100 text-purple-800 text-xs font-medium rounded-full">
                      {getCharacterTypeDisplay(character.character_type)}
                    </span>
                  </div>

                  {/* Details */}
                  <div className="space-y-2 text-sm text-neutral-600 mb-4">
                    {character.character_type === 'pet' && character.attributes.species && (
                      <div>Species: {character.attributes.species}</div>
                    )}
                    {character.character_type === 'pet' && character.attributes.breed && (
                      <div>Breed: {character.attributes.breed}</div>
                    )}
                    {character.character_type === 'magical_creature' && character.attributes.creatureType && (
                      <div>Type: {character.attributes.creatureType}</div>
                    )}
                    {character.character_type === 'storybook_character' && character.attributes.age && (
                      <div>Age: {character.attributes.age} years</div>
                    )}
                  </div>

                  {/* Actions */}
                  <div className="flex gap-2">
                    <Link
                      href={`/dashboard/other-characters/${character.id}/edit`}
                      className="flex-1 flex items-center justify-center gap-2 px-4 py-2 bg-purple-50 text-purple-600 font-medium rounded-lg hover:bg-purple-100 transition-colors"
                    >
                      <Edit className="w-4 h-4" />
                      Edit
                    </Link>
                    <button
                      onClick={() => handleDelete(character.id)}
                      className="flex-1 flex items-center justify-center gap-2 px-4 py-2 bg-red-50 text-red-600 font-medium rounded-lg hover:bg-red-100 transition-colors"
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
          <div className="mt-6 bg-gradient-to-r from-purple-50 to-pink-50 rounded-xl p-6 text-center">
            <p className="text-neutral-700 mb-3">
              You've reached the character limit for your {userTier.display_name} plan.
            </p>
            <Link
              href="/pricing"
              className="inline-flex items-center gap-2 px-6 py-2 bg-gradient-to-r from-purple-500 to-pink-500 text-white font-medium rounded-lg hover:shadow-lg transition-all"
            >
              Upgrade for More Characters
            </Link>
          </div>
        )}
      </div>
    </div>
  )
}