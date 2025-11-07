import { createClient } from '@/lib/supabase/server'
import { redirect } from 'next/navigation'
import { BookOpen, Users, Sparkles, Library, Settings, User } from 'lucide-react'
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
      full_name,
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

  // Get first name from full_name
  const firstName = userProfile?.full_name?.split(' ')[0] || 'there'

  // Fetch all characters
  const { data: allCharacters } = await supabase
    .from('character_profiles')
    .select('*')
    .eq('user_id', user.id)
    .is('deleted_at', null)
    .order('created_at', { ascending: false })

  // Separate children from other characters
  const children = allCharacters?.filter(c => c.character_type === 'child') || []
  const otherCharacters = allCharacters?.filter(c => c.character_type !== 'child') || []

  const primaryCharacter = children.find((c) => c.is_primary) || children[0]

  // Calculate limits (null means unlimited, so only use defaults if undefined)
  const maxChildren = userTier?.max_child_profiles !== undefined ? userTier.max_child_profiles : 1
  const maxOtherCharacters = userTier?.max_other_characters !== undefined ? userTier.max_other_characters : 0

  return (
    <div className="min-h-screen bg-gradient-to-br from-blue-50 to-purple-50">
      <div className="max-w-6xl mx-auto px-6 py-8">

        {/* Header with Settings and Sign Out */}
        <div className="flex justify-between items-center mb-8">
          <div>
            <h1 className="text-3xl font-bold text-neutral-900">Welcome back, {firstName}!</h1>
          </div>
          <div className="flex items-center gap-4">
            <Link
              href="/dashboard/settings"
              className="p-2 hover:bg-white/50 rounded-lg transition-colors"
              aria-label="Settings"
            >
              <Settings className="w-5 h-5 text-neutral-700" />
            </Link>
            <form action="/auth/signout" method="post" className="inline">
              <button
                type="submit"
                className="px-4 py-2 text-neutral-700 hover:bg-white/50 rounded-lg transition-colors font-medium"
              >
                Sign Out
              </button>
            </form>
          </div>
        </div>

        {/* Subscription Plan Badge */}
        <div className="mb-8">
          <div className="inline-flex items-center gap-2 px-4 py-2 bg-white rounded-full shadow-sm">
            <span className="text-sm font-semibold text-neutral-700">{userTier.display_name} Plan</span>
            <span className="text-sm text-neutral-500">•</span>
            <span className="text-sm text-neutral-600">
              0 stories this month ({maxChildren === null ? 'Unlimited' : '3 remaining'})
            </span>
          </div>
        </div>

        {/* Create Story CTA - Fully Clickable */}
        {primaryCharacter ? (
          <button className="w-full mb-8 p-8 bg-gradient-to-r from-blue-500 to-purple-500 rounded-2xl shadow-lg hover:shadow-xl transition-all duration-300 group">
            <div className="flex items-center justify-between">
              <div className="flex items-center gap-4">
                <div className="w-16 h-16 bg-white/20 rounded-full flex items-center justify-center">
                  <Sparkles className="w-8 h-8 text-white" />
                </div>
                <div className="text-left">
                  <h2 className="text-2xl font-bold text-white mb-1">Create Story</h2>
                  <p className="text-blue-100">Generate magical personalized stories</p>
                </div>
              </div>
              <div className="text-white/60 text-sm">Coming Soon</div>
            </div>
          </button>
        ) : (
          <div className="w-full mb-8 p-8 bg-yellow-50 rounded-2xl border-2 border-yellow-200">
            <div className="text-center">
              <p className="text-yellow-800 mb-3">Add a child profile first to create stories</p>
              <Link
                href="/dashboard/my-children/create"
                className="inline-flex items-center gap-2 text-blue-600 hover:text-blue-700 font-semibold"
              >
                Add Your First Child →
              </Link>
            </div>
          </div>
        )}

        {/* Three Main Sections */}
        <div className="grid grid-cols-1 md:grid-cols-3 gap-6">

          {/* Child Profiles - Fully Clickable */}
          <Link
            href="/dashboard/my-children"
            className="bg-white rounded-2xl shadow-lg hover:shadow-xl transition-all duration-300 p-8 group"
          >
            <div className="flex items-center gap-3 mb-4">
              <div className="w-12 h-12 bg-gradient-to-br from-blue-400 to-cyan-400 rounded-full flex items-center justify-center">
                <User className="w-6 h-6 text-white" />
              </div>
              <h2 className="text-xl font-bold text-neutral-900">Child Profiles</h2>
            </div>

            <div className="text-center py-6">
              <div className="text-4xl font-bold text-neutral-900 mb-1">{children.length}</div>
              <div className="text-sm text-neutral-500">
                {maxChildren === null ? 'Unlimited' : `of ${maxChildren} profiles`}
              </div>
            </div>

            <button className="w-full mt-4 px-4 py-3 bg-gradient-to-r from-blue-500 to-cyan-500 text-white font-medium rounded-lg hover:shadow-lg transition-all">
              Manage Profiles
            </button>
          </Link>

          {/* Character Profiles - Fully Clickable */}
          <Link
            href="/dashboard/other-characters"
            className="bg-white rounded-2xl shadow-lg hover:shadow-xl transition-all duration-300 p-8 group"
          >
            <div className="flex items-center gap-3 mb-4">
              <div className="w-12 h-12 bg-gradient-to-br from-purple-500 to-pink-500 rounded-full flex items-center justify-center">
                <Users className="w-6 h-6 text-white" />
              </div>
              <h2 className="text-xl font-bold text-neutral-900">Character Profiles</h2>
            </div>

            <div className="text-center py-6">
              <div className="text-4xl font-bold text-neutral-900 mb-1">{otherCharacters.length}</div>
              <div className="text-sm text-neutral-500">
                {maxOtherCharacters === null ? 'Unlimited' : `of ${maxOtherCharacters} characters`}
              </div>
            </div>

            <button className="w-full mt-4 px-4 py-3 bg-gradient-to-r from-purple-500 to-pink-500 text-white font-medium rounded-lg hover:shadow-lg transition-all">
              Manage Characters
            </button>
          </Link>

          {/* Story Library - Fully Clickable */}
          <div className="bg-white rounded-2xl shadow-lg hover:shadow-xl transition-all duration-300 p-8 opacity-60 cursor-not-allowed">
            <div className="flex items-center gap-3 mb-4">
              <div className="w-12 h-12 bg-gradient-to-br from-green-500 to-teal-500 rounded-full flex items-center justify-center">
                <Library className="w-6 h-6 text-white" />
              </div>
              <h2 className="text-xl font-bold text-neutral-900">Story Library</h2>
            </div>

            <div className="text-center py-6">
              <div className="text-4xl font-bold text-neutral-900 mb-1">0</div>
              <div className="text-sm text-neutral-500">stories created</div>
            </div>

            <button disabled className="w-full mt-4 px-4 py-3 bg-gray-200 text-gray-500 font-medium rounded-lg cursor-not-allowed">
              Coming Soon
            </button>
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