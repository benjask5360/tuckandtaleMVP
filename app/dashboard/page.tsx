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
        max_other_characters,
        stories_per_month
      )
    `)
    .eq('id', user.id)
    .single()

  const userTier = (userProfile?.subscription_tiers as any) || {
    tier_name: 'free',
    display_name: 'Free',
    max_child_profiles: 1,
    max_other_characters: 0,
    stories_per_month: 3
  }

  // Get first name from full_name
  const firstName = userProfile?.full_name?.split(' ')[0] || 'there'

  // Fetch all characters with avatar images
  const { data: allCharacters } = await supabase
    .from('character_profiles')
    .select(`
      *,
      avatar_cache:avatar_cache_id (
        image_url
      )
    `)
    .eq('user_id', user.id)
    .is('deleted_at', null)
    .order('created_at', { ascending: false })

  // Separate children from other characters
  const children = allCharacters?.filter(c => c.character_type === 'child') || []
  const otherCharacters = allCharacters?.filter(c => c.character_type !== 'child') || []

  const primaryCharacter = children.find((c) => c.is_primary) || children[0]

  // Fetch stories with cover illustrations
  const { data: stories, count: storyCount } = await supabase
    .from('stories')
    .select('id, title, story_illustrations', { count: 'exact' })
    .eq('user_id', user.id)
    .order('created_at', { ascending: false })
    .limit(3)

  // Calculate limits (null means unlimited, so only use defaults if undefined)
  const maxChildren = userTier?.max_child_profiles !== undefined ? userTier.max_child_profiles : 1
  const maxOtherCharacters = userTier?.max_other_characters !== undefined ? userTier.max_other_characters : 0
  const maxStories = userTier?.stories_per_month !== undefined ? userTier.stories_per_month : 3

  return (
    <div className="min-h-screen bg-white">
      <div className="max-w-7xl mx-auto px-4 sm:px-6 py-4 md:py-6">

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
          <Link
            href="/dashboard/stories/create"
            className="block relative w-full mb-6 md:mb-8 p-6 md:p-10 bg-gradient-primary rounded-2xl md:rounded-3xl shadow-blue-glow active:shadow-xl active:scale-[0.98] md:hover:shadow-xl transition-all duration-300 group md:hover:scale-[1.02] min-h-[120px] overflow-hidden"
          >
            {/* Decorative faded stars in background */}
            <div className="absolute top-4 right-32 opacity-20">
              <Sparkles className="w-12 h-12 text-yellow-300" />
            </div>
            <div className="absolute bottom-6 right-48 opacity-15">
              <Sparkles className="w-8 h-8 text-yellow-300" />
            </div>
            <div className="absolute top-8 right-20 opacity-10">
              <Sparkles className="w-6 h-6 text-yellow-300" />
            </div>

            <div className="flex flex-col sm:flex-row items-center justify-between gap-4 relative z-10">
              <div className="flex flex-col sm:flex-row items-center gap-4 md:gap-5">
                <div className="w-16 h-16 md:w-20 md:h-20 bg-transparent flex items-center justify-center flex-shrink-0">
                  <Sparkles className="w-8 h-8 md:w-10 md:h-10 text-yellow-400" />
                </div>
                <div className="text-center sm:text-left">
                  <h2 className="text-2xl md:text-3xl font-bold text-white mb-1 md:mb-2">Create Story</h2>
                  <p className="text-sky-100 text-base md:text-lg">Generate a new magical personalized story</p>
                </div>
              </div>
              <div className="flex items-center gap-2 bg-white text-primary-600 px-4 md:px-6 py-2 md:py-3 rounded-full font-semibold shadow-lg group-hover:shadow-xl transition-all">
                <Sparkles className="w-4 h-4 md:w-5 md:h-5 text-yellow-500" />
                <span className="text-sm md:text-base">Create Story</span>
              </div>
            </div>
          </Link>
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

        {/* Three Main Sections - Cleaner Design */}
        <div className="grid grid-cols-1 md:grid-cols-3 gap-4 md:gap-6">

          {/* Child Profiles */}
          <Link
            href="/dashboard/my-children"
            className="bg-white border border-gray-200 rounded-2xl p-4 flex flex-col active:shadow-xl active:scale-[0.98] md:hover:shadow-xl md:hover:scale-[1.02] transition-all duration-300 group"
          >
            {/* Avatar circles - Overlapping cascade */}
            <div className="flex items-center mb-4">
              {children.slice(0, 3).map((child: any, idx: number) => (
                <div
                  key={child.id}
                  className="relative"
                  style={{ marginLeft: idx > 0 ? '-8px' : '0', zIndex: idx }}
                >
                  {child.avatar_cache?.image_url ? (
                    <img
                      src={Array.isArray(child.avatar_cache) ? child.avatar_cache[0]?.image_url : child.avatar_cache.image_url}
                      alt={child.name}
                      className="w-12 h-12 rounded-full object-cover object-top ring-2 ring-white shadow-sm"
                    />
                  ) : (
                    <div className="w-12 h-12 rounded-full bg-gradient-sky flex items-center justify-center ring-2 ring-white shadow-sm">
                      <User className="w-6 h-6 text-white" />
                    </div>
                  )}
                </div>
              ))}
              {children.length > 3 && (
                <div
                  className="w-12 h-12 rounded-full bg-primary-100 flex items-center justify-center ring-2 ring-white shadow-sm"
                  style={{ marginLeft: '-8px', zIndex: 3 }}
                >
                  <span className="text-sm font-semibold text-primary-600">+{children.length - 3}</span>
                </div>
              )}
            </div>

            <div className="flex-grow">
              <h2 className="text-xl font-bold text-gray-900 mb-1">Child Profiles</h2>
              <p className="text-sm text-gray-500">
                {children.length} {children.length === 1 ? 'profile' : 'profiles'} · {maxChildren === null ? 'Unlimited' : `${maxChildren} max`}
              </p>
            </div>

            <button className="w-full py-2 px-4 bg-primary-50 text-primary-600 rounded-lg text-sm font-medium group-hover:bg-primary-100 transition-colors pointer-events-none mt-2">
              Manage Profiles
            </button>
          </Link>

          {/* Character Profiles */}
          <Link
            href="/dashboard/other-characters"
            className="bg-white border border-gray-200 rounded-2xl p-4 flex flex-col active:shadow-xl active:scale-[0.98] md:hover:shadow-xl md:hover:scale-[1.02] transition-all duration-300 group"
          >
            {/* Avatar circles - Overlapping cascade */}
            <div className="flex items-center mb-4">
              {otherCharacters.slice(0, 3).map((character: any, idx: number) => (
                <div
                  key={character.id}
                  className="relative"
                  style={{ marginLeft: idx > 0 ? '-8px' : '0', zIndex: idx }}
                >
                  {character.avatar_cache?.image_url ? (
                    <img
                      src={Array.isArray(character.avatar_cache) ? character.avatar_cache[0]?.image_url : character.avatar_cache.image_url}
                      alt={character.name}
                      className="w-12 h-12 rounded-full object-cover object-top ring-2 ring-white shadow-sm"
                    />
                  ) : (
                    <div className="w-12 h-12 rounded-full bg-gradient-purple flex items-center justify-center ring-2 ring-white shadow-sm">
                      <Users className="w-6 h-6 text-white" />
                    </div>
                  )}
                </div>
              ))}
              {otherCharacters.length > 3 && (
                <div
                  className="w-12 h-12 rounded-full bg-primary-100 flex items-center justify-center ring-2 ring-white shadow-sm"
                  style={{ marginLeft: '-8px', zIndex: 3 }}
                >
                  <span className="text-sm font-semibold text-primary-600">+{otherCharacters.length - 3}</span>
                </div>
              )}
            </div>

            <div className="flex-grow">
              <h2 className="text-xl font-bold text-gray-900 mb-1">Character Profiles</h2>
              <p className="text-sm text-gray-500">
                {otherCharacters.length} {otherCharacters.length === 1 ? 'character' : 'characters'} · {maxOtherCharacters === null ? 'Unlimited' : `${maxOtherCharacters} max`}
              </p>
            </div>

            <button className="w-full py-2 px-4 bg-primary-50 text-primary-600 rounded-lg text-sm font-medium group-hover:bg-primary-100 transition-colors pointer-events-none mt-2">
              Manage Characters
            </button>
          </Link>

          {/* Story Library */}
          <Link
            href="/dashboard/story-library"
            className="bg-white border border-gray-200 rounded-2xl p-4 flex flex-col active:shadow-xl active:scale-[0.98] md:hover:shadow-xl md:hover:scale-[1.02] transition-all duration-300 group"
          >
            {/* Story cover circles - Overlapping cascade */}
            <div className="flex items-center mb-4">
              {stories && stories.length > 0 ? (
                <>
                  {stories.slice(0, 3).map((story: any, idx: number) => {
                    // Get cover illustration (scene_0)
                    const coverIllustration = story.story_illustrations?.find((ill: any) => ill.type === 'scene_0')

                    return (
                      <div
                        key={story.id}
                        className="relative"
                        style={{ marginLeft: idx > 0 ? '-8px' : '0', zIndex: idx }}
                      >
                        {coverIllustration?.url ? (
                          <img
                            src={coverIllustration.url}
                            alt={story.title}
                            className="w-12 h-12 rounded-full object-cover object-top ring-2 ring-white shadow-sm"
                          />
                        ) : (
                          <div className="w-12 h-12 rounded-full bg-gradient-teal flex items-center justify-center ring-2 ring-white shadow-sm">
                            <Library className="w-6 h-6 text-white" />
                          </div>
                        )}
                      </div>
                    )
                  })}
                  {(storyCount || 0) > 3 && (
                    <div
                      className="w-12 h-12 rounded-full bg-primary-100 flex items-center justify-center ring-2 ring-white shadow-sm"
                      style={{ marginLeft: '-8px', zIndex: 3 }}
                    >
                      <span className="text-sm font-semibold text-primary-600">+{(storyCount || 0) - 3}</span>
                    </div>
                  )}
                </>
              ) : (
                <div className="w-12 h-12 rounded-full bg-gray-100 flex items-center justify-center ring-2 ring-white shadow-sm">
                  <Library className="w-6 h-6 text-gray-400" />
                </div>
              )}
            </div>

            <div className="flex-grow">
              <h2 className="text-xl font-bold text-gray-900 mb-1">Story Library</h2>
              <p className="text-sm text-gray-500">
                {storyCount || 0} {(storyCount || 0) === 1 ? 'story' : 'stories'} · {maxStories === null ? 'Unlimited' : `${maxStories}/month`}
              </p>
            </div>

            <button className="w-full py-2 px-4 bg-primary-50 text-primary-600 rounded-lg text-sm font-medium group-hover:bg-primary-100 transition-colors pointer-events-none mt-2">
              View Library
            </button>
          </Link>

        </div>
      </div>

      {/* Footer */}
      <footer className="py-12 bg-white border-t border-gray-200 mt-10 md:mt-12">
        <div className="max-w-7xl mx-auto px-6">
          <div className="flex flex-col items-center gap-6 text-sm">
            <p className="flex flex-wrap items-center justify-center gap-2 text-lg text-gray-700 text-center">
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