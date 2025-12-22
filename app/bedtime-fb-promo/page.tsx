import type { Metadata } from 'next'
import { unstable_noStore as noStore } from 'next/cache'
import { Check, ArrowRight, Heart } from 'lucide-react'
import Image from 'next/image'
import AuthAwareCTA from '@/components/AuthAwareCTA'
import { createAdminClient } from '@/lib/supabase/admin'
import StoryCarousel from './StoryCarousel'

export const metadata: Metadata = {
  title: 'End the Bedtime Battle | Tuck and Tale',
  description: 'Personalized stories that help your child stay in bed — without the fight. Your child as the hero. Ready in minutes. 7-day free trial available.',
}

// V3 Illustration Status format
interface V3IllustrationStatus {
  overall: 'pending' | 'generating' | 'complete' | 'partial' | 'failed';
  cover: {
    status: string;
    prompt?: string;
    tempUrl?: string;
    imageUrl?: string;
    error?: string;
  };
  scenes: Array<{
    paragraphIndex: number;
    status: string;
    prompt?: string;
    tempUrl?: string;
    imageUrl?: string;
    error?: string;
  }>;
}

export default async function BedtimePage() {
  // Opt out of caching to ensure fresh data on every request
  noStore();

  // Fetch featured stories for carousel (using admin client for public access)
  const supabase = createAdminClient();

  const { data: featuredStories } = await supabase
    .from('content')
    .select('id, title, v3_illustration_status, generation_metadata')
    .eq('content_type', 'story')
    .eq('featured_on_fb_promo', true)
    .is('deleted_at', null)
    .order('fb_promo_display_order', { ascending: true })
    .order('created_at', { ascending: false })
    .limit(10);

  // Transform stories for carousel
  const carouselStories = (featuredStories || [])
    .map((story) => {
      const v3Status = story.v3_illustration_status as V3IllustrationStatus | null;
      const coverImageUrl = v3Status?.cover?.imageUrl || v3Status?.cover?.tempUrl;

      if (!coverImageUrl) return null;

      // Get character avatar URL
      const metadata = story.generation_metadata as any;
      const characters = metadata?.characters;
      let characterAvatarUrl: string | undefined;

      if (characters && characters.length > 0) {
        const firstChar = characters[0];
        // Note: We would need to fetch from avatar_cache, but for now we'll skip it
        // to avoid additional queries in the landing page
      }

      return {
        id: story.id,
        title: story.title || 'Untitled Story',
        coverImageUrl,
        characterAvatarUrl,
      };
    })
    .filter((story): story is NonNullable<typeof story> => story !== null);
  return (
    <>
      {/* Hero Section - Mobile-optimized */}
      <section className="relative overflow-hidden bg-white py-12 md:py-16 lg:py-20 pt-8 md:pt-16">
        <div className="container-narrow section-padding relative z-10">
          <div className="grid lg:grid-cols-2 gap-12 md:gap-16 items-center">
            <div className="animate-fade-in-up text-center lg:text-left">
              <h1 className="text-4xl sm:text-5xl md:text-6xl lg:text-7xl font-display font-bold mb-6 leading-tight tracking-tight text-gray-900">
                <span className="gradient-text">
                  End the Bedtime Battle
                </span>
              </h1>

              <p className="text-base sm:text-lg md:text-xl text-gray-600 mb-8 max-w-lg mx-auto lg:mx-0 leading-relaxed">
                Personalized stories that help your child stay in bed — without the fight.
              </p>

              <div className="flex flex-col gap-4 mb-6">
                <AuthAwareCTA>
                  <>
                    Start Your Free Trial
                    <ArrowRight className="w-5 h-5 ml-2 group-hover:translate-x-1 transition-transform" />
                  </>
                </AuthAwareCTA>
              </div>

              <p className="text-sm md:text-base text-gray-500 mb-8 flex items-center justify-center lg:justify-start gap-2">
                <Check className="w-5 h-5 text-primary-500 flex-shrink-0" />
                <span>7-day free trial</span>
              </p>

              {/* Mobile Hero Image */}
              <div className="relative lg:hidden w-full h-[400px] sm:h-[500px]">
                <Image
                  src="/images/hero.png"
                  alt="Family reading bedtime stories together"
                  fill
                  sizes="(max-width: 768px) 90vw, (max-width: 1024px) 85vw, 50vw"
                  className="object-contain"
                  priority
                />
              </div>
            </div>

            {/* Desktop Hero Image */}
            <div className="relative lg:block hidden">
              <div className="relative w-full h-[600px]">
                <Image
                  src="/images/hero.png"
                  alt="Family reading bedtime stories together"
                  fill
                  sizes="50vw"
                  className="object-contain"
                  priority
                />
              </div>
            </div>
          </div>
        </div>
      </section>

      {/* Stories Families are Reading Tonight Section */}
      {carouselStories.length > 0 && (
        <section className="py-12 md:py-16 bg-gray-50">
          <div className="container-narrow section-padding">
            <div className="text-center mb-12 animate-fade-in">
              <h2 className="text-4xl md:text-5xl font-display font-bold mb-4 text-gray-900">
                Stories Families are Reading Tonight
              </h2>
              <p className="text-lg md:text-xl text-gray-600 max-w-3xl mx-auto leading-relaxed">
                Each one personalized with a child's name, look, and interests.
              </p>
            </div>
            <StoryCarousel stories={carouselStories} />
          </div>
        </section>
      )}

      {/* How It Helps With Bedtime Section */}
      <section className="py-12 md:py-16 bg-white">
        <div className="container-narrow section-padding">
          <div className="text-center mb-12 animate-fade-in">
            <h2 className="text-4xl md:text-5xl font-display font-bold mb-4 text-gray-900">
              How It Helps With Bedtime
            </h2>
            <p className="text-lg md:text-xl text-gray-600 max-w-3xl mx-auto leading-relaxed">
              From battle to peaceful in three simple steps.
            </p>
          </div>

          <div className="grid md:grid-cols-3 gap-8 mb-12">
            {/* Step 1 - Tell Us About Your Little One */}
            <div className="card p-6 text-center group">
              <div className="relative w-full h-64 mb-5 rounded-2xl overflow-hidden bg-white">
                <Image
                  src="/images/Characters/children.jpg"
                  alt="Create a character profile for your child"
                  fill
                  sizes="(max-width: 768px) 100vw, 33vw"
                  className="object-contain group-hover:scale-105 transition-transform duration-300"
                />
              </div>
              <div className="text-4xl font-bold text-primary-500 mb-3">1</div>
              <h3 className="text-2xl font-bold mb-3 text-gray-900">Tell Us About Your Little One</h3>
              <p className="text-gray-600 leading-relaxed">
                Share their name, age, and interests so we can shape a story that feels just like them.
              </p>
            </div>

            {/* Step 2 - Pick a Growth Story */}
            <div className="card p-6 text-center group">
              <div className="relative w-full h-64 mb-5 rounded-2xl overflow-hidden bg-white">
                <Image
                  src="/images/How it works/genres.png"
                  alt="Choose growth stories that teach emotional regulation"
                  fill
                  sizes="(max-width: 768px) 100vw, 33vw"
                  className="object-contain group-hover:scale-105 transition-transform duration-300"
                />
              </div>
              <div className="text-4xl font-bold text-primary-500 mb-3">2</div>
              <h3 className="text-2xl font-bold mb-3 text-gray-900">Choose Your Adventure</h3>
              <p className="text-gray-600 leading-relaxed">
                Bedtime, fantasy, space, animals — pick what they'll love.
              </p>
            </div>

            {/* Step 3 - Watch Their Story Come to Life */}
            <div className="card p-6 text-center group">
              <div className="relative w-full h-64 mb-5 rounded-2xl overflow-hidden bg-white">
                <Image
                  src="/images/How it works/read.jpg"
                  alt="Read personalized illustrated stories"
                  fill
                  sizes="(max-width: 768px) 100vw, 33vw"
                  className="object-contain group-hover:scale-105 transition-transform duration-300"
                />
              </div>
              <div className="text-4xl font-bold text-primary-500 mb-3">3</div>
              <h3 className="text-2xl font-bold mb-3 text-gray-900">Watch Their Story Come to Life</h3>
              <p className="text-gray-600 leading-relaxed">
                In seconds, a beautifully illustrated tale appears — with your child learning to manage tough moments.
              </p>
            </div>
          </div>

          <div className="text-center animate-fade-in">
            <p className="text-xl md:text-2xl font-semibold text-gray-800 mb-2">
              Every bedtime becomes a chance to teach calm.
            </p>
            <p className="text-lg md:text-xl text-gray-600">
              Personalized, magical, and made for the way your child sees the world.
            </p>
          </div>
        </div>
      </section>

      {/* What Parents Are Saying Section */}
      <section className="py-12 md:py-16 bg-gray-50">
        <div className="container-narrow section-padding">
          <div className="text-center mb-12 animate-fade-in">
            <h2 className="text-4xl md:text-5xl font-display font-bold mb-4 text-gray-900">
              What Parents Are Saying
            </h2>
          </div>

          <div className="max-w-4xl mx-auto space-y-6">
            <div className="flex items-start gap-4 p-6 rounded-2xl bg-gray-50">
              <div className="flex-shrink-0 w-8 h-8 rounded-full bg-primary-500 flex items-center justify-center">
                <Heart className="w-5 h-5 text-white fill-white" />
              </div>
              <p className="text-lg md:text-xl text-gray-700 leading-relaxed">
                "She finally stays in bed. No more getting up 10 times a night."
              </p>
            </div>

            <div className="flex items-start gap-4 p-6 rounded-2xl bg-gray-50">
              <div className="flex-shrink-0 w-8 h-8 rounded-full bg-primary-500 flex items-center justify-center">
                <Heart className="w-5 h-5 text-white fill-white" />
              </div>
              <p className="text-lg md:text-xl text-gray-700 leading-relaxed">
                "He asks for 'his story' now. Bedtime went from 45 minutes to 10."
              </p>
            </div>

            <div className="flex items-start gap-4 p-6 rounded-2xl bg-gray-50">
              <div className="flex-shrink-0 w-8 h-8 rounded-full bg-primary-500 flex items-center justify-center">
                <Heart className="w-5 h-5 text-white fill-white" />
              </div>
              <p className="text-lg md:text-xl text-gray-700 leading-relaxed">
                "I used to dread 8pm. Now it's actually... nice?"
              </p>
            </div>
          </div>
        </div>
      </section>

      {/* CTA Section */}
      <section className="py-24 bg-white relative overflow-hidden">
        <div className="absolute inset-0 gradient-mesh-primary opacity-30"></div>
        <div className="container-narrow section-padding text-center relative z-10">
          <h2 className="text-4xl md:text-5xl lg:text-6xl font-display font-bold mb-6 text-gray-900">
            Turn Bedtime Battles Into Bonding Time
          </h2>
          <p className="text-xl text-gray-600 mb-10 max-w-2xl mx-auto">
            Create calming personalized stories in minutes — start your 7-day free trial.
          </p>
          <AuthAwareCTA>
            <>
              Start Your Free Trial
              <ArrowRight className="w-5 h-5 ml-2 group-hover:translate-x-1 transition-transform" />
            </>
          </AuthAwareCTA>
        </div>
      </section>

      {/* Footer */}
      <footer className="py-12 bg-white border-t border-gray-200 mt-20">
        <div className="max-w-7xl mx-auto px-6">
          <div className="flex flex-col items-center gap-6 text-sm">
            <p className="flex flex-wrap items-center justify-center gap-2 text-lg text-gray-700 text-center">
              Made with <Heart className="w-5 h-5 fill-red-500 text-red-500 animate-pulse-soft" /> in the USA for little dreamers everywhere
            </p>
            <div className="flex flex-col md:flex-row justify-between items-center w-full gap-6">
              <p className="text-center md:text-left text-gray-500">© 2025 Tuck and Tale™. All rights reserved.</p>
              <nav className="grid grid-cols-2 sm:grid-cols-3 md:flex md:flex-row gap-x-8 gap-y-4 text-center md:text-left text-gray-600">
                <a href="/about" className="hover:text-primary-600 transition-colors">About</a>
                <a href="/pricing" className="hover:text-primary-600 transition-colors">Pricing</a>
                <a href="/contact" className="hover:text-primary-600 transition-colors">Contact Us</a>
                <a href="/faq" className="hover:text-primary-600 transition-colors">FAQ</a>
                <a href="/founder-parents" className="hover:text-primary-600 transition-colors">Founder Parents</a>
                <a href="/privacy" className="hover:text-primary-600 transition-colors">Privacy Policy</a>
                <a href="/terms" className="hover:text-primary-600 transition-colors">Terms of Service</a>
              </nav>
            </div>
          </div>
        </div>
      </footer>
    </>
  )
}
