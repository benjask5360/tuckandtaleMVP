import { createAdminClient } from '@/lib/supabase/admin';
import StoryCarousel from './StoryCarousel';

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

export default async function FeaturedStoriesCarousel() {
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

  // Don't render if no stories
  if (carouselStories.length === 0) {
    return null;
  }

  return (
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
  );
}
