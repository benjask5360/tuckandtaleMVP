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
      <div className="max-w-7xl mx-auto px-6 py-12">

        {/* Header */}
        <div className="mb-10">
          <h1 className="text-4xl md:text-5xl font-display font-bold text-gray-900 mb-3">
            Welcome back, {firstName}!
          </h1>
          <p className="text-lg text-gray-600">Ready to create some magical stories?</p>
        </div>

        {/* Subscription Plan Badge */}
        <div className="mb-10">
          <div className="inline-flex items-center gap-3 px-6 py-3 badge-primary text-base shadow-blue-glow">
            <span className="font-semibold">{userTier.display_name} Plan</span>
            <span>•</span>
            <span>
              0 stories this month ({maxChildren === null ? 'Unlimited' : '3 remaining'})
            </span>
          </div>
        </div>

        {/* Create Story CTA - Fully Clickable */}
        {primaryCharacter ? (
          <button className="w-full mb-12 p-10 bg-gradient-primary rounded-3xl shadow-blue-glow hover:shadow-xl transition-all duration-300 group hover:scale-[1.02]">
            <div className="flex items-center justify-between">
              <div className="flex items-center gap-5">
                <div className="w-20 h-20 bg-white/20 backdrop-blur-sm rounded-2xl flex items-center justify-center shadow-soft">
                  <Sparkles className="w-10 h-10 text-white" />
                </div>
                <div className="text-left">
                  <h2 className="text-3xl font-bold text-white mb-2">Create Story</h2>
                  <p className="text-sky-100 text-lg">Generate magical personalized stories</p>
                </div>
              </div>
              <div className="badge bg-white/20 text-white border-white/30 text-sm">Coming Soon</div>
            </div>
          </button>
        ) : (
          <div className="w-full mb-12 p-10 bg-gradient-to-br from-yellow-50 to-orange-50 rounded-3xl border-2 border-yellow-300 shadow-soft">
            <div className="text-center">
              <p className="text-yellow-900 font-semibold text-lg mb-4">Add a child profile first to create stories</p>
              <Link
                href="/dashboard/my-children/create"
                className="btn-primary btn-md inline-flex items-center gap-2"
              >
                Add Your First Child →
              </Link>
            </div>
          </div>
        )}

        {/* Three Main Sections */}
        <div className="grid grid-cols-1 md:grid-cols-3 gap-8">

          {/* Child Profiles - Fully Clickable */}
          <Link
            href="/dashboard/my-children"
            className="card p-10 hover:shadow-card-hover hover:-translate-y-2 transition-all duration-300 group hover:border-primary-300"
          >
            <div className="flex items-center gap-4 mb-6">
              <div className="w-16 h-16 bg-gradient-sky rounded-2xl flex items-center justify-center shadow-blue-glow">
                <User className="w-8 h-8 text-white" />
              </div>
              <h2 className="text-2xl font-bold text-gray-900">Child Profiles</h2>
            </div>

            <div className="text-center py-8">
              <div className="text-6xl font-bold gradient-text mb-2">{children.length}</div>
              <div className="text-sm text-gray-500 font-medium">
                {maxChildren === null ? 'Unlimited' : `of ${maxChildren} profiles`}
              </div>
            </div>

            <button className="w-full mt-6 btn-primary btn-md">
              Manage Profiles
            </button>
          </Link>

          {/* Character Profiles - Fully Clickable */}
          <Link
            href="/dashboard/other-characters"
            className="card p-10 hover:shadow-card-hover hover:-translate-y-2 transition-all duration-300 group hover:border-purple-300"
          >
            <div className="flex items-center gap-4 mb-6">
              <div className="w-16 h-16 bg-gradient-purple rounded-2xl flex items-center justify-center shadow-purple-glow">
                <Users className="w-8 h-8 text-white" />
              </div>
              <h2 className="text-2xl font-bold text-gray-900">Character Profiles</h2>
            </div>

            <div className="text-center py-8">
              <div className="text-6xl font-bold gradient-text-purple mb-2">{otherCharacters.length}</div>
              <div className="text-sm text-gray-500 font-medium">
                {maxOtherCharacters === null ? 'Unlimited' : `of ${maxOtherCharacters} characters`}
              </div>
            </div>

            <button className="w-full mt-6 btn-purple btn-md">
              Manage Characters
            </button>
          </Link>

          {/* Story Library - Fully Clickable */}
          <Link
            href="/dashboard/story-library"
            className="card p-10 hover:shadow-card-hover hover:-translate-y-2 transition-all duration-300 group hover:border-teal-300"
          >
            <div className="flex items-center gap-4 mb-6">
              <div className="w-16 h-16 bg-gradient-teal rounded-2xl flex items-center justify-center shadow-teal-glow">
                <Library className="w-8 h-8 text-white" />
              </div>
              <h2 className="text-2xl font-bold text-gray-900">Story Library</h2>
            </div>

            <div className="text-center py-8">
              <div className="text-6xl font-bold text-gray-900 mb-2">{storyCount || 0}</div>
              <div className="text-sm text-gray-500 font-medium">stories created</div>
            </div>

            <button className="w-full mt-6 btn-teal btn-md">
              View Library
            </button>
          </Link>

        </div>
      </div>

      {/* Footer */}
      <footer className="py-12 bg-gray-900 text-gray-300 mt-20">
        <div className="max-w-7xl mx-auto px-6">
          <div className="flex flex-col items-center gap-6 text-sm">
            <p className="flex items-center gap-2 text-lg">
              Made with <Heart className="w-5 h-5 fill-red-500 text-red-500 animate-pulse-soft" /> for little dreamers everywhere
            </p>
            <div className="flex flex-col md:flex-row justify-between items-center w-full gap-6">
              <p className="text-center md:text-left text-gray-400">© 2024 Tuck and Tale™. All rights reserved.</p>
              <nav className="grid grid-cols-2 sm:grid-cols-3 md:flex md:flex-row gap-x-8 gap-y-4 text-center md:text-left">
                <a href="#" className="hover:text-primary-400 transition-colors">About</a>
                <a href="#" className="hover:text-primary-400 transition-colors">Contact Us</a>
                <a href="#" className="hover:text-primary-400 transition-colors">FAQ</a>
                <a href="#" className="hover:text-primary-400 transition-colors">Founder Parents</a>
                <a href="#" className="hover:text-primary-400 transition-colors">Privacy Policy</a>
                <a href="#" className="hover:text-primary-400 transition-colors">Terms of Service</a>
              </nav>
            </div>
          </div>
        </div>
      </footer>
    </div>
  )
}