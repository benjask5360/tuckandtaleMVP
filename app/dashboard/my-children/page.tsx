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
    <div className="min-h-screen bg-white p-6">
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
                  My Children
                </h1>
                <p className="text-neutral-600">
                  Manage your children's profiles for personalized stories
                </p>
              </div>
              <div className="text-right">
                <p className="text-sm text-neutral-500 mb-2">
                  {children.length} / {maxChildren === null ? '∞' : maxChildren} profiles
                </p>
                {canAddMore ? (
                  <Link
                    href="/dashboard/my-children/create"
                    className="inline-flex items-center gap-2 px-6 py-3 bg-gradient-to-r from-blue-500 to-blue-600 text-white font-semibold rounded-xl hover:shadow-lg transition-all duration-300"
                  >
                    <Plus className="w-5 h-5" />
                    Add Child
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

        {/* Children Grid */}
        {children.length === 0 ? (
          <div className="bg-white rounded-2xl shadow-lg p-12 text-center">
            <User className="w-16 h-16 text-neutral-300 mx-auto mb-4" />
            <h3 className="text-xl font-semibold text-neutral-700 mb-2">No children yet</h3>
            <p className="text-neutral-500 mb-6">Add your first child to start creating personalized stories</p>
            {canAddMore && (
              <Link
                href="/dashboard/my-children/create"
                className="inline-flex items-center gap-2 px-6 py-3 bg-gradient-to-r from-blue-500 to-blue-600 text-white font-semibold rounded-xl hover:shadow-lg transition-all duration-300"
              >
                <Plus className="w-5 h-5" />
                Add Your First Child
              </Link>
            )}
          </div>
        ) : (
          <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
            {children.map(child => (
              <div key={child.id} className="bg-white rounded-xl shadow-lg hover:shadow-xl transition-shadow duration-300">
                <div className="p-6">
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
                  <div className="text-center mb-3">
                    <h3 className="text-xl font-bold text-neutral-800">
                      {child.name}
                    </h3>
                    {child.is_primary && (
                      <span className="inline-block mt-1 px-2 py-1 bg-yellow-100 text-yellow-800 text-xs font-medium rounded-full">
                        Primary
                      </span>
                    )}
                  </div>

                  {/* Details */}
                  <div className="space-y-2 text-sm text-neutral-600 mb-4">
                    {child.attributes.dateOfBirth && (
                      <div className="flex items-center gap-2">
                        <Calendar className="w-4 h-4" />
                        <span>Age: {calculateAge(child.attributes.dateOfBirth)} years</span>
                      </div>
                    )}
                    {child.attributes.gender && (
                      <div>Gender: {child.attributes.gender}</div>
                    )}
                    {child.attributes.interests && child.attributes.interests.length > 0 && (
                      <div>Interests: {child.attributes.interests.slice(0, 3).join(', ')}</div>
                    )}
                  </div>

                  {/* Actions */}
                  <div className="flex gap-2">
                    <Link
                      href={`/dashboard/my-children/${child.id}/edit`}
                      className="flex-1 flex items-center justify-center gap-2 px-4 py-2 bg-blue-50 text-blue-600 font-medium rounded-lg hover:bg-blue-100 transition-colors"
                    >
                      <Edit className="w-4 h-4" />
                      Edit
                    </Link>
                    <button
                      onClick={() => handleDelete(child.id)}
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
          <div className="mt-6 bg-gradient-to-r from-purple-50 to-blue-50 rounded-xl p-6 text-center">
            <p className="text-neutral-700 mb-3">
              You've reached the limit for your {userTier.display_name} plan.
            </p>
            <Link
              href="/pricing"
              className="inline-flex items-center gap-2 px-6 py-2 bg-gradient-to-r from-purple-500 to-blue-500 text-white font-medium rounded-lg hover:shadow-lg transition-all"
            >
              Upgrade for More Profiles
            </Link>
          </div>
        )}
      </div>

      {/* Footer */}
      <footer className="py-8 bg-white border-t border-neutral-200 mt-16">
        <div className="max-w-6xl mx-auto px-6">
          <div className="flex flex-col items-center gap-4 text-sm text-neutral-600">
            <p className="flex items-center gap-1 text-primary-500">
              Made with <Heart className="w-4 h-4 fill-red-500 text-red-500" /> for little dreamers everywhere
            </p>
            <div className="flex flex-col md:flex-row justify-between items-center w-full gap-4">
              <p className="text-center md:text-left">© 2024 Tuck and Tale™. All rights reserved.</p>
              <nav className="grid grid-cols-2 sm:grid-cols-3 md:flex md:flex-row gap-x-6 gap-y-3 text-center md:text-left">
                <a href="#" className="hover:text-primary-500 transition-colors">About</a>
                <a href="#" className="hover:text-primary-500 transition-colors">Contact Us</a>
                <a href="#" className="hover:text-primary-500 transition-colors">FAQ</a>
                <a href="#" className="hover:text-primary-500 transition-colors">Founder Parents</a>
                <a href="#" className="hover:text-primary-500 transition-colors">Privacy Policy</a>
                <a href="#" className="hover:text-primary-500 transition-colors">Terms of Service</a>
              </nav>
            </div>
          </div>
        </div>
      </footer>
    </div>
  )
}