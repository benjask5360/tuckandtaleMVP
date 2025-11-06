import { createClient } from '@/lib/supabase/server'
import { redirect } from 'next/navigation'
import { BookOpen, ArrowRight, Sparkles } from 'lucide-react'
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

  // Fetch user's characters
  const { data: characters } = await supabase
    .from('character_profiles')
    .select('*')
    .eq('user_id', user.id)
    .is('deleted_at', null)
    .order('created_at', { ascending: false })

  const primaryCharacter = characters?.find((c) => c.is_primary) || characters?.[0]

  return (
    <section className="min-h-screen bg-white py-24">
      <div className="absolute inset-0 gradient-mesh opacity-20"></div>

      <div className="container-narrow section-padding relative z-10">
        {/* Welcome Header */}
        <div className="text-center mb-12 animate-slide-up">
          <h1 className="font-display text-4xl md:text-5xl font-bold text-neutral-900 mb-4">
            Welcome to {primaryCharacter?.name}'s Story World!
          </h1>
          <p className="text-xl text-neutral-500">
            {primaryCharacter?.name} is ready for magical adventures
          </p>
        </div>

        {/* Character Card */}
        {primaryCharacter && (
          <div className="max-w-2xl mx-auto mb-12">
            <div className="bg-white rounded-xl shadow-card border border-neutral-100 p-8">
              <div className="flex items-start gap-6">
                {/* Avatar Placeholder */}
                <div className="w-24 h-24 rounded-full bg-gradient-to-br from-primary-400 to-primary-600 flex items-center justify-center text-white text-3xl font-bold flex-shrink-0">
                  {primaryCharacter.name[0]}
                </div>

                {/* Character Info */}
                <div className="flex-1">
                  <h2 className="text-2xl font-bold text-neutral-900 mb-2">
                    {primaryCharacter.name}
                  </h2>
                  <p className="text-neutral-600 mb-4">
                    {primaryCharacter.attributes.age} years old
                  </p>

                  <div className="flex flex-wrap gap-2 text-sm">
                    <span className="px-3 py-1 bg-blue-50 text-blue-700 rounded-full">
                      Loves {primaryCharacter.attributes.favoriteAnimal}s
                    </span>
                    <span className="px-3 py-1 bg-purple-50 text-purple-700 rounded-full">
                      Favorite color: {primaryCharacter.attributes.favoriteColor}
                    </span>
                    <span className="px-3 py-1 bg-green-50 text-green-700 rounded-full">
                      {primaryCharacter.attributes.favoriteHobby}
                    </span>
                  </div>
                </div>
              </div>
            </div>
          </div>
        )}

        {/* Create Story CTA */}
        <div className="max-w-2xl mx-auto">
          <div className="bg-gradient-to-br from-blue-50 to-purple-50 rounded-xl p-8 text-center border border-blue-100">
            <Sparkles className="w-16 h-16 mx-auto mb-4 text-primary-500" />

            <h2 className="font-display text-3xl font-bold text-neutral-900 mb-4">
              Ready to Create Your First Story?
            </h2>

            <p className="text-lg text-neutral-600 mb-6">
              Let's create a magical adventure featuring {primaryCharacter?.name}!
            </p>

            <div className="flex flex-col sm:flex-row gap-4 justify-center">
              <button className="btn-primary btn-lg group inline-flex items-center justify-center">
                <BookOpen className="w-5 h-5 mr-2" />
                Create Your First Story
                <ArrowRight className="w-5 h-5 ml-2 group-hover:translate-x-1 transition-transform" />
              </button>
            </div>

            <p className="text-sm text-neutral-500 mt-4">
              Coming soon: Story generation powered by AI
            </p>
          </div>
        </div>

        {/* Quick Stats */}
        <div className="max-w-2xl mx-auto mt-8 grid grid-cols-3 gap-4">
          <div className="text-center p-4 bg-white rounded-lg border border-neutral-100">
            <div className="text-2xl font-bold text-primary-500">0</div>
            <div className="text-sm text-neutral-600">Stories Created</div>
          </div>
          <div className="text-center p-4 bg-white rounded-lg border border-neutral-100">
            <div className="text-2xl font-bold text-primary-500">3</div>
            <div className="text-sm text-neutral-600">Stories Remaining</div>
          </div>
          <div className="text-center p-4 bg-white rounded-lg border border-neutral-100">
            <div className="text-2xl font-bold text-primary-500">Free</div>
            <div className="text-sm text-neutral-600">Current Plan</div>
          </div>
        </div>

        {/* Sign Out Link */}
        <div className="text-center mt-8">
          <form action="/auth/signout" method="post">
            <button
              type="submit"
              className="text-neutral-500 hover:text-neutral-700 text-sm"
            >
              Sign Out
            </button>
          </form>
        </div>
      </div>
    </section>
  )
}
