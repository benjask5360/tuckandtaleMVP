import { createClient } from '@/lib/supabase/server'
import { redirect } from 'next/navigation'
import { BookOpen, Users, Sparkles, Library, Plus, ChevronRight, User, Star } from 'lucide-react'
import Link from 'next/link'

export default async function DashboardPage() {
  const supabase = await createClient()

  // Get authenticated user
  const {
    data: { user },
  } = await supabase.auth.getUser()

  if (!user) {
    redirect('/auth/login')
  }

  // Fetch user's profile and subscription info
  const { data: userProfile } = await supabase
    .from('user_profiles')
    .select(`
      subscription_tier_id,
      subscription_tiers (
        tier_name,
        display_name,
        max_child_profiles,
        max_other_characters
      )
    `)
    .eq('id', user.id)
    .single()

  const userTier = (userProfile?.subscription_tiers as any) || {
    tier_name: 'free',
    display_name: 'Free',
    max_child_profiles: 1,
    max_other_characters: 0
  }

  // Fetch all characters
  const { data: allCharacters } = await supabase
    .from('character_profiles')
    .select('*')
    .eq('user_profile_id', user.id)
    .is('deleted_at', null)
    .order('created_at', { ascending: false })

  // Separate children from other characters
  const children = allCharacters?.filter(c => c.character_type === 'child') || []
  const otherCharacters = allCharacters?.filter(c => c.character_type !== 'child') || []

  const primaryCharacter = children.find((c) => c.is_primary) || children[0]

  // Calculate limits
  const maxChildren = userTier?.max_child_profiles ?? 1
  const maxOtherCharacters = userTier?.max_other_characters ?? 0

  return (
    <div className="min-h-screen bg-gradient-to-br from-blue-50 to-purple-50 py-8">
      <div className="max-w-7xl mx-auto px-6">

        {/* Welcome Header */}
        <div className="text-center mb-10">
          <h1 className="text-4xl md:text-5xl font-bold text-neutral-900 mb-3">
            Welcome{primaryCharacter ? ` to ${primaryCharacter.name}'s Story World` : ' to Tuck and Tale'}!
          </h1>
          <p className="text-xl text-neutral-600">
            {primaryCharacter ? `Ready for magical adventures with ${primaryCharacter.name}` : 'Create your first character to begin'}
          </p>
        </div>

        {/* 4 Main Sections Grid */}
        <div className="grid grid-cols-1 lg:grid-cols-2 gap-8">

          {/* Section 1: Create Story */}
          <div className="bg-white rounded-2xl shadow-lg hover:shadow-xl transition-shadow duration-300">
            <div className="p-8">
              <div className="flex items-center justify-between mb-6">
                <div className="flex items-center gap-3">
                  <div className="w-12 h-12 bg-gradient-to-br from-blue-500 to-purple-500 rounded-full flex items-center justify-center">
                    <BookOpen className="w-6 h-6 text-white" />
                  </div>
                  <h2 className="text-2xl font-bold text-neutral-900">Create Story</h2>
                </div>
                <ChevronRight className="w-6 h-6 text-neutral-400" />
              </div>

              <p className="text-neutral-600 mb-6">
                Generate magical personalized stories featuring your characters
              </p>

              {primaryCharacter ? (
                <button className="w-full px-6 py-4 bg-gradient-to-r from-blue-500 to-purple-500 text-white font-semibold rounded-xl hover:shadow-lg transition-all duration-300 flex items-center justify-center gap-2">
                  <Sparkles className="w-5 h-5" />
                  Create New Story
                  <span className="text-xs opacity-80">(Coming Soon)</span>
                </button>
              ) : (
                <div className="p-6 bg-yellow-50 rounded-xl text-center">
                  <p className="text-yellow-800 mb-3">Add a child first to create stories</p>
                  <Link
                    href="/dashboard/my-children/create"
                    className="inline-flex items-center gap-2 text-blue-600 hover:text-blue-700 font-medium"
                  >
                    Add Your First Child →
                  </Link>
                </div>
              )}

              <div className="mt-6 pt-6 border-t border-neutral-100">
                <div className="flex justify-between text-sm">
                  <span className="text-neutral-600">Stories Created</span>
                  <span className="font-bold text-neutral-900">0</span>
                </div>
                <div className="flex justify-between text-sm mt-2">
                  <span className="text-neutral-600">Stories Remaining</span>
                  <span className="font-bold text-primary-600">3 / month</span>
                </div>
              </div>
            </div>
          </div>

          {/* Section 2: My Children */}
          <div className="bg-white rounded-2xl shadow-lg hover:shadow-xl transition-shadow duration-300">
            <div className="p-8">
              <div className="flex items-center justify-between mb-6">
                <div className="flex items-center gap-3">
                  <div className="w-12 h-12 bg-gradient-to-br from-blue-400 to-cyan-400 rounded-full flex items-center justify-center">
                    <User className="w-6 h-6 text-white" />
                  </div>
                  <h2 className="text-2xl font-bold text-neutral-900">My Children</h2>
                </div>
                <span className="text-sm text-neutral-500">
                  {children.length} / {maxChildren === null ? '∞' : maxChildren}
                </span>
              </div>

              {children.length > 0 ? (
                <div className="space-y-3 mb-6">
                  {children.slice(0, 3).map(child => (
                    <div key={child.id} className="flex items-center gap-3 p-3 bg-blue-50 rounded-lg">
                      <div className="w-10 h-10 bg-gradient-to-br from-blue-300 to-cyan-300 rounded-full flex items-center justify-center text-white font-bold">
                        {child.name[0]}
                      </div>
                      <div className="flex-1">
                        <p className="font-semibold text-neutral-900">{child.name}</p>
                        <p className="text-xs text-neutral-600">
                          {child.attributes.age || calculateAge(child.attributes.dateOfBirth)} years old
                        </p>
                      </div>
                      {child.is_primary && (
                        <Star className="w-4 h-4 text-yellow-500 fill-yellow-500" />
                      )}
                    </div>
                  ))}
                </div>
              ) : (
                <div className="p-6 bg-blue-50 rounded-xl text-center mb-6">
                  <User className="w-12 h-12 text-blue-300 mx-auto mb-2" />
                  <p className="text-blue-800">No children profiles yet</p>
                </div>
              )}

              <div className="flex gap-3">
                <Link
                  href="/dashboard/my-children"
                  className="flex-1 px-4 py-3 bg-blue-50 text-blue-600 font-medium rounded-lg hover:bg-blue-100 transition-colors text-center"
                >
                  View All
                </Link>
                {children.length < (maxChildren || Infinity) ? (
                  <Link
                    href="/dashboard/my-children/create"
                    className="flex-1 px-4 py-3 bg-gradient-to-r from-blue-500 to-cyan-500 text-white font-medium rounded-lg hover:shadow-lg transition-all text-center flex items-center justify-center gap-2"
                  >
                    <Plus className="w-4 h-4" />
                    Add Child
                  </Link>
                ) : (
                  <button
                    disabled
                    className="flex-1 px-4 py-3 bg-gray-300 text-gray-500 font-medium rounded-lg cursor-not-allowed text-center"
                  >
                    Limit Reached
                  </button>
                )}
              </div>
            </div>
          </div>

          {/* Section 3: Other Characters */}
          <div className="bg-white rounded-2xl shadow-lg hover:shadow-xl transition-shadow duration-300">
            <div className="p-8">
              <div className="flex items-center justify-between mb-6">
                <div className="flex items-center gap-3">
                  <div className="w-12 h-12 bg-gradient-to-br from-purple-500 to-pink-500 rounded-full flex items-center justify-center">
                    <Sparkles className="w-6 h-6 text-white" />
                  </div>
                  <h2 className="text-2xl font-bold text-neutral-900">Other Characters</h2>
                </div>
                <span className="text-sm text-neutral-500">
                  {otherCharacters.length} / {maxOtherCharacters === null ? '∞' : maxOtherCharacters}
                </span>
              </div>

              {otherCharacters.length > 0 ? (
                <div className="space-y-3 mb-6">
                  {otherCharacters.slice(0, 3).map(character => (
                    <div key={character.id} className="flex items-center gap-3 p-3 bg-purple-50 rounded-lg">
                      <div className="w-10 h-10 bg-gradient-to-br from-purple-300 to-pink-300 rounded-full flex items-center justify-center text-white font-bold">
                        {character.name[0]}
                      </div>
                      <div className="flex-1">
                        <p className="font-semibold text-neutral-900">{character.name}</p>
                        <p className="text-xs text-neutral-600 capitalize">
                          {character.character_type.replace('_', ' ')}
                        </p>
                      </div>
                    </div>
                  ))}
                </div>
              ) : (
                <div className="p-6 bg-purple-50 rounded-xl text-center mb-6">
                  <Sparkles className="w-12 h-12 text-purple-300 mx-auto mb-2" />
                  <p className="text-purple-800">No other characters yet</p>
                </div>
              )}

              <div className="flex gap-3">
                <Link
                  href="/dashboard/other-characters"
                  className="flex-1 px-4 py-3 bg-purple-50 text-purple-600 font-medium rounded-lg hover:bg-purple-100 transition-colors text-center"
                >
                  View All
                </Link>
                {otherCharacters.length < (maxOtherCharacters || 0) || maxOtherCharacters === null ? (
                  <Link
                    href="/dashboard/other-characters/create"
                    className="flex-1 px-4 py-3 bg-gradient-to-r from-purple-500 to-pink-500 text-white font-medium rounded-lg hover:shadow-lg transition-all text-center flex items-center justify-center gap-2"
                  >
                    <Plus className="w-4 h-4" />
                    Add Character
                  </Link>
                ) : (
                  <button
                    disabled
                    className="flex-1 px-4 py-3 bg-gray-300 text-gray-500 font-medium rounded-lg cursor-not-allowed text-center"
                  >
                    {maxOtherCharacters === 0 ? 'Upgrade Plan' : 'Limit Reached'}
                  </button>
                )}
              </div>
            </div>
          </div>

          {/* Section 4: Story Library */}
          <div className="bg-white rounded-2xl shadow-lg hover:shadow-xl transition-shadow duration-300">
            <div className="p-8">
              <div className="flex items-center justify-between mb-6">
                <div className="flex items-center gap-3">
                  <div className="w-12 h-12 bg-gradient-to-br from-green-500 to-teal-500 rounded-full flex items-center justify-center">
                    <Library className="w-6 h-6 text-white" />
                  </div>
                  <h2 className="text-2xl font-bold text-neutral-900">Story Library</h2>
                </div>
                <span className="text-sm text-neutral-500">0 stories</span>
              </div>

              <div className="p-6 bg-green-50 rounded-xl text-center mb-6">
                <Library className="w-12 h-12 text-green-300 mx-auto mb-2" />
                <p className="text-green-800 mb-2">Your story library is empty</p>
                <p className="text-xs text-green-700">Stories you create will appear here</p>
              </div>

              <button
                disabled
                className="w-full px-4 py-3 bg-gray-100 text-gray-400 font-medium rounded-lg cursor-not-allowed text-center"
              >
                Coming Soon
              </button>
            </div>
          </div>
        </div>

        {/* Footer */}
        <div className="mt-12 text-center">
          <div className="inline-flex items-center gap-6 text-sm text-neutral-500">
            <span>
              Plan: <span className="font-semibold text-neutral-700">{userTier.display_name}</span>
            </span>
            {userTier.tier_name !== 'supernova' && (
              <Link href="/pricing" className="text-blue-600 hover:text-blue-700 font-medium">
                Upgrade Plan →
              </Link>
            )}
            <form action="/auth/signout" method="post" className="inline">
              <button
                type="submit"
                className="text-neutral-500 hover:text-neutral-700"
              >
                Sign Out
              </button>
            </form>
          </div>
        </div>
      </div>
    </div>
  )
}

function calculateAge(dateOfBirth: string): number | null {
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