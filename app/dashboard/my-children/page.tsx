'use client'

import { useState, useEffect } from 'react'
import Link from 'next/link'
import { createClient } from '@/lib/supabase/client'
import { Plus, Edit, Trash2, User, Calendar, Heart } from 'lucide-react'
import { useRouter } from 'next/navigation'

interface ChildProfile {
  id: string
  name: string
  attributes: any
  is_primary: boolean
  created_at: string
  avatar_cache?: {
    image_url: string
  } | null
}

export default function MyChildrenPage() {
  const [children, setChildren] = useState<ChildProfile[]>([])
  const [loading, setLoading] = useState(true)
  const [error, setError] = useState<string | null>(null)
  const [userTier, setUserTier] = useState<any>(null)
  const router = useRouter()
  const supabase = createClient()

  useEffect(() => {
    loadChildren()
    loadUserTier()
  }, [])

  const loadChildren = async () => {
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
        .eq('character_type', 'child')
        .is('deleted_at', null)
        .order('created_at', { ascending: true })

      if (error) throw error

      // Manually fetch avatars for each character
      const childrenWithAvatars = await Promise.all(
        (data || []).map(async (child) => {
          if (child.avatar_cache_id) {
            const { data: avatar } = await supabase
              .from('avatar_cache')
              .select('image_url')
              .eq('id', child.avatar_cache_id)
              .single()

            return { ...child, avatar_cache: avatar }
          }
          return { ...child, avatar_cache: null }
        })
      )

      setChildren(childrenWithAvatars)
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
            max_child_profiles
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
    if (!confirm('Are you sure you want to delete this child profile?')) return

    try {
      const { error } = await supabase
        .from('character_profiles')
        .update({ deleted_at: new Date().toISOString() })
        .eq('id', id)

      if (error) throw error
      loadChildren()
    } catch (err: any) {
      alert('Failed to delete profile: ' + err.message)
    }
  }

  const calculateAge = (dateOfBirth: string) => {
    if (!dateOfBirth) return null
    const today = new Date()
    const birthDate = new Date(dateOfBirth)
    let age = today.getFullYear() - birthDate.getFullYear()
    const monthDiff = today.getMonth() - birthDate.getMonth()
    if (monthDiff < 0 || (monthDiff === 0 && today.getDate() < birthDate.getDate())) {
      age--
    }
    return age
  }

  const maxChildren = userTier?.max_child_profiles !== undefined ? userTier.max_child_profiles : 1
  const canAddMore = maxChildren === null || children.length < maxChildren

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
      <div className="max-w-7xl mx-auto px-4 sm:px-6 py-8 md:py-12 pt-20 md:pt-24">
        {/* Header */}
        <div className="mb-8 md:mb-10">
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
                  My Children
                </h1>
                <p className="text-base md:text-lg text-gray-600">
                  Manage your children's profiles for personalized stories
                </p>
              </div>
              <div className="text-center md:text-right flex-shrink-0">
                <p className="text-sm md:text-base text-gray-500 mb-3 md:mb-4">
                  {children.length} / {maxChildren === null ? '∞' : maxChildren} profiles
                </p>
                {canAddMore ? (
                  <Link
                    href="/dashboard/my-children/create"
                    className="btn-primary btn-md inline-flex items-center gap-2"
                  >
                    <Plus className="w-5 h-5" />
                    Add Child
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

        {/* Children Grid */}
        {children.length === 0 ? (
          <div className="card p-8 md:p-12 text-center">
            <User className="w-14 h-14 md:w-16 md:h-16 text-gray-300 mx-auto mb-4 md:mb-6" />
            <h3 className="text-xl md:text-2xl font-bold text-gray-700 mb-2 md:mb-3">No children yet</h3>
            <p className="text-base md:text-lg text-gray-500 mb-6 md:mb-8">Add your first child to start creating personalized stories</p>
            {canAddMore && (
              <Link
                href="/dashboard/my-children/create"
                className="btn-primary btn-md inline-flex items-center gap-2"
              >
                <Plus className="w-5 h-5" />
                Add Your First Child
              </Link>
            )}
          </div>
        ) : (
          <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6 md:gap-8">
            {children.map(child => (
              <div key={child.id} className="card p-6 md:p-8 active:shadow-card-hover active:scale-[0.98] md:hover:shadow-card-hover md:hover:-translate-y-1 transition-all duration-300">
                <div>
                  {/* Avatar */}
                  <div className="w-24 h-24 mx-auto mb-4 flex items-center justify-center">
                    {child.avatar_cache?.image_url ? (
                      <img
                        src={child.avatar_cache.image_url}
                        alt={child.name}
                        className="w-24 h-24 rounded-full object-cover"
                      />
                    ) : (
                      <div className="w-24 h-24 bg-gradient-to-br from-blue-200 to-purple-200 rounded-full flex items-center justify-center">
                        <span className="text-3xl font-bold text-white">
                          {child.name.charAt(0).toUpperCase()}
                        </span>
                      </div>
                    )}
                  </div>

                  {/* Name & Primary Badge */}
                  <div className="text-center mb-3 md:mb-4">
                    <h3 className="text-xl md:text-2xl font-bold text-gray-800">
                      {child.name}
                    </h3>
                    {child.is_primary && (
                      <span className="inline-block mt-2 badge-primary text-xs md:text-sm">
                        Primary
                      </span>
                    )}
                  </div>

                  {/* Details */}
                  <div className="space-y-2 text-sm md:text-base text-gray-600 mb-4 md:mb-6">
                    {child.attributes.dateOfBirth && (
                      <div className="flex items-center gap-2 justify-center md:justify-start">
                        <Calendar className="w-4 h-4" />
                        <span>Age: {calculateAge(child.attributes.dateOfBirth)} years</span>
                      </div>
                    )}
                    {child.attributes.gender && (
                      <div className="text-center md:text-left">Gender: {child.attributes.gender}</div>
                    )}
                    {child.attributes.interests && child.attributes.interests.length > 0 && (
                      <div className="text-center md:text-left">Interests: {child.attributes.interests.slice(0, 3).join(', ')}</div>
                    )}
                  </div>

                  {/* Actions */}
                  <div className="flex gap-2 md:gap-3">
                    <Link
                      href={`/dashboard/my-children/${child.id}/edit`}
                      className="flex-1 flex items-center justify-center gap-2 px-4 py-3 bg-primary-50 text-primary-600 font-semibold rounded-xl active:bg-primary-100 md:hover:bg-primary-100 transition-colors min-h-[44px]"
                    >
                      <Edit className="w-4 h-4" />
                      Edit
                    </Link>
                    <button
                      onClick={() => handleDelete(child.id)}
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
          <div className="mt-6 md:mt-8 bg-gradient-to-r from-purple-50 to-primary-50 rounded-2xl p-6 md:p-8 text-center">
            <p className="text-base md:text-lg text-gray-700 font-medium mb-4 md:mb-6">
              You've reached the limit for your {userTier.display_name} plan.
            </p>
            <Link
              href="/pricing"
              className="btn-purple btn-md inline-flex items-center gap-2"
            >
              Upgrade for More Profiles
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