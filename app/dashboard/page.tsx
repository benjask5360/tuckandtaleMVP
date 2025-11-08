import { createClient } from '@/lib/supabase/server'
import { redirect } from 'next/navigation'
import { Users, Sparkles, Library, User, Heart } from 'lucide-react'
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

  // Fetch story count
  const { count: storyCount } = await supabase
    .from('stories')
    .select('*', { count: 'exact', head: true })
    .eq('user_id', user.id)

  // Calculate limits (null means unlimited, so only use defaults if undefined)
  const maxChildren = userTier?.max_child_profiles !== undefined ? userTier.max_child_profiles : 1
  const maxOtherCharacters = userTier?.max_other_characters !== undefined ? userTier.max_other_characters : 0

  return (
    <div className="min-h-screen bg-gray-50">
      <div className="max-w-7xl mx-auto px-4 sm:px-6 py-4 md:py-6 pt-18">

        {/* Header - Centered and mobile-optimized */}
        <div className="mb-3 md:mb-4 text-center">
          <h1 className="text-3xl sm:text-4xl md:text-5xl font-display font-bold text-gray-900 mb-2 md:mb-3">
            Welcome back, {firstName}!
          </h1>
          <p className="text-base md:text-lg text-gray-600">Ready to create some magical stories?</p>
        </div>

        {/* Subscription Plan Badge - Centered and mobile-optimized */}
        <div className="mb-4 md:mb-6 flex justify-center">
          <div className="inline-flex flex-col sm:flex-row items-center gap-2 sm:gap-3 px-5 md:px-6 py-2.5 md:py-3 badge-primary text-sm md:text-base shadow-blue-glow text-center">
            <span className="font-semibold">{userTier.display_name} Plan</span>
            <span className="hidden sm:inline">•</span>
            <span className="text-xs sm:text-sm md:text-base">
              0 stories this month ({maxChildren === null ? 'Unlimited' : '3 remaining'})
            </span>
          </div>
        </div>

        {/* Create Story CTA - Mobile-optimized */}
        {primaryCharacter ? (
          <button className="w-full mb-6 md:mb-8 p-6 md:p-10 bg-gradient-primary rounded-2xl md:rounded-3xl shadow-blue-glow active:shadow-xl active:scale-[0.98] md:hover:shadow-xl transition-all duration-300 group md:hover:scale-[1.02] min-h-[120px]">
            <div className="flex flex-col sm:flex-row items-center justify-between gap-4">
              <div className="flex flex-col sm:flex-row items-center gap-4 md:gap-5">
                <div className="w-16 h-16 md:w-20 md:h-20 bg-white/20 backdrop-blur-sm rounded-xl md:rounded-2xl flex items-center justify-center shadow-soft flex-shrink-0">
                  <Sparkles className="w-8 h-8 md:w-10 md:h-10 text-white" />
                </div>
                <div className="text-center sm:text-left">
                  <h2 className="text-2xl md:text-3xl font-bold text-white mb-1 md:mb-2">Create Story</h2>
                  <p className="text-sky-100 text-base md:text-lg">Generate magical personalized stories</p>
                </div>
              </div>
              <div className="badge bg-white/20 text-white border-white/30 text-xs md:text-sm px-3 md:px-4 py-1.5 md:py-2">Coming Soon</div>
            </div>
          </button>
        ) : (
          <div className="w-full mb-6 md:mb-8 p-6 md:p-10 bg-gradient-to-br from-yellow-50 to-orange-50 rounded-2xl md:rounded-3xl border-2 border-yellow-300 shadow-soft">
            <div className="text-center">
              <p className="text-yellow-900 font-semibold text-base md:text-lg mb-4">Add a child profile first to create stories</p>
              <Link
                href="/dashboard/my-children"
                className="btn-primary btn-md inline-flex items-center gap-2"
              >
                Add Your First Child →
              </Link>
            </div>
          </div>
        )}

        {/* Three Main Sections - Mobile-optimized */}
        <div className="grid grid-cols-1 md:grid-cols-3 gap-6 md:gap-8">

          {/* Child Profiles - Mobile-optimized */}
          <Link
            href="/dashboard/my-children"
            className="card p-6 md:p-10 active:shadow-card-hover active:scale-[0.98] md:hover:shadow-card-hover md:hover:-translate-y-2 transition-all duration-300 group md:hover:border-primary-300 min-h-[240px]"
          >
            <div className="flex items-center gap-3 md:gap-4 mb-4 md:mb-6">
              <div className="w-14 h-14 md:w-16 md:h-16 bg-gradient-sky rounded-xl md:rounded-2xl flex items-center justify-center shadow-blue-glow flex-shrink-0">
                <User className="w-7 h-7 md:w-8 md:h-8 text-white" />
              </div>
              <h2 className="text-xl md:text-2xl font-bold text-gray-900">Child Profiles</h2>
            </div>

            <div className="text-center py-6 md:py-8">
              <div className="text-5xl md:text-6xl font-bold gradient-text mb-2">{children.length}</div>
              <div className="text-xs md:text-sm text-gray-500 font-medium">
                {maxChildren === null ? 'Unlimited' : `of ${maxChildren} profiles`}
              </div>
            </div>

            <button className="w-full mt-4 md:mt-6 btn-primary btn-md pointer-events-none">
              Manage Profiles
            </button>
          </Link>

          {/* Character Profiles - Mobile-optimized */}
          <Link
            href="/dashboard/other-characters"
            className="card p-6 md:p-10 active:shadow-card-hover active:scale-[0.98] md:hover:shadow-card-hover md:hover:-translate-y-2 transition-all duration-300 group md:hover:border-purple-300 min-h-[240px]"
          >
            <div className="flex items-center gap-3 md:gap-4 mb-4 md:mb-6">
              <div className="w-14 h-14 md:w-16 md:h-16 bg-gradient-purple rounded-xl md:rounded-2xl flex items-center justify-center shadow-purple-glow flex-shrink-0">
                <Users className="w-7 h-7 md:w-8 md:h-8 text-white" />
              </div>
              <h2 className="text-xl md:text-2xl font-bold text-gray-900">Character Profiles</h2>
            </div>

            <div className="text-center py-6 md:py-8">
              <div className="text-5xl md:text-6xl font-bold gradient-text-purple mb-2">{otherCharacters.length}</div>
              <div className="text-xs md:text-sm text-gray-500 font-medium">
                {maxOtherCharacters === null ? 'Unlimited' : `of ${maxOtherCharacters} characters`}
              </div>
            </div>

            <button className="w-full mt-4 md:mt-6 btn-purple btn-md pointer-events-none">
              Manage Characters
            </button>
          </Link>

          {/* Story Library - Mobile-optimized */}
          <Link
            href="/dashboard/story-library"
            className="card p-6 md:p-10 active:shadow-card-hover active:scale-[0.98] md:hover:shadow-card-hover md:hover:-translate-y-2 transition-all duration-300 group md:hover:border-teal-300 min-h-[240px]"
          >
            <div className="flex items-center gap-3 md:gap-4 mb-4 md:mb-6">
              <div className="w-14 h-14 md:w-16 md:h-16 bg-gradient-teal rounded-xl md:rounded-2xl flex items-center justify-center shadow-teal-glow flex-shrink-0">
                <Library className="w-7 h-7 md:w-8 md:h-8 text-white" />
              </div>
              <h2 className="text-xl md:text-2xl font-bold text-gray-900">Story Library</h2>
            </div>

            <div className="text-center py-6 md:py-8">
              <div className="text-5xl md:text-6xl font-bold text-gray-900 mb-2">{storyCount || 0}</div>
              <div className="text-xs md:text-sm text-gray-500 font-medium">stories created</div>
            </div>

            <button className="w-full mt-4 md:mt-6 btn-teal btn-md pointer-events-none">
              View Library
            </button>
          </Link>

        </div>
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