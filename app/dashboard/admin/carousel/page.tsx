import { redirect } from 'next/navigation';
import { createClient } from '@/lib/supabase/server';
import { createAdminClient } from '@/lib/supabase/admin';
import Link from 'next/link';
import { ArrowLeft, GripVertical } from 'lucide-react';
import CarouselManager from './CarouselManager';
import AvailableStories from './AvailableStories';

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

export default async function CarouselPage() {
  const supabase = await createClient();

  // Check authentication
  const { data: { user }, error: authError } = await supabase.auth.getUser();
  if (authError || !user) {
    redirect('/auth/login');
  }

  // Check admin privileges
  const { data: userProfile, error: profileError } = await supabase
    .from('user_profiles')
    .select('user_type')
    .eq('id', user.id)
    .single();

  if (profileError || userProfile?.user_type !== 'admin') {
    redirect('/dashboard');
  }

  // Use admin client to fetch stories
  const adminSupabase = createAdminClient();

  // Fetch featured stories
  const { data: featuredStories } = await adminSupabase
    .from('content')
    .select('id, title, v3_illustration_status, fb_promo_display_order, created_at, user_id')
    .eq('content_type', 'story')
    .eq('featured_on_fb_promo', true)
    .is('deleted_at', null)
    .order('fb_promo_display_order', { ascending: true })
    .order('created_at', { ascending: false });

  // Fetch available stories (admin or current user's stories, not currently featured)
  const { data: availableStories } = await adminSupabase
    .from('content')
    .select('id, title, v3_illustration_status, created_at, user_id')
    .eq('content_type', 'story')
    .eq('featured_on_fb_promo', false)
    .is('deleted_at', null)
    .order('created_at', { ascending: false })
    .limit(20);

  // Transform featured stories for display
  const stories = (featuredStories || []).map((story) => {
    const v3Status = story.v3_illustration_status as V3IllustrationStatus | null;
    const coverImageUrl = v3Status?.cover?.imageUrl || v3Status?.cover?.tempUrl;

    return {
      id: story.id,
      title: story.title || 'Untitled Story',
      coverImageUrl,
      displayOrder: story.fb_promo_display_order || 0,
    };
  });

  // Transform available stories for display
  const available = (availableStories || [])
    .filter(story => {
      // Only show stories from admin or current user
      return story.user_id === user.id || userProfile?.user_type === 'admin';
    })
    .map((story) => {
      const v3Status = story.v3_illustration_status as V3IllustrationStatus | null;
      const coverImageUrl = v3Status?.cover?.imageUrl || v3Status?.cover?.tempUrl;

      return {
        id: story.id,
        title: story.title || 'Untitled Story',
        coverImageUrl,
        createdAt: story.created_at,
      };
    })
    .filter(story => story.coverImageUrl); // Only show stories with cover images

  return (
    <div className="min-h-screen bg-gray-50 py-8 px-4">
      <div className="max-w-4xl mx-auto">
        {/* Header */}
        <div className="mb-8">
          <Link
            href="/dashboard/admin"
            className="text-purple-600 hover:text-purple-700 inline-flex items-center gap-2 text-sm mb-4"
          >
            <ArrowLeft className="w-4 h-4" />
            Back to Admin Dashboard
          </Link>
          <h1 className="text-4xl font-bold text-gray-900 mb-2">
            Carousel Manager
          </h1>
          <p className="text-gray-600">
            Manage the order of stories displayed on the /bedtime-fb-promo page
          </p>
        </div>

        {/* Instructions */}
        <div className="bg-blue-50 border border-blue-200 rounded-xl p-6 mb-8">
          <h2 className="font-semibold text-blue-900 mb-2">How to Use</h2>
          <ul className="text-sm text-blue-800 space-y-1">
            <li>• Drag and drop stories to reorder them in the carousel</li>
            <li>• The first story appears first in the carousel</li>
            <li>• Changes are saved automatically when you drop a story</li>
            <li>• To feature a new story, go to Story Export page and check "Feature on FB Promo Page"</li>
          </ul>
        </div>

        {/* Featured Stories Section */}
        <div className="mb-12">
          <h2 className="text-2xl font-bold text-gray-900 mb-4">Featured Stories</h2>
          {stories.length === 0 ? (
            <div className="bg-white rounded-xl border border-gray-200 p-12 text-center">
              <GripVertical className="w-12 h-12 text-gray-400 mx-auto mb-4" />
              <h3 className="text-lg font-semibold text-gray-900 mb-2">
                No Featured Stories
              </h3>
              <p className="text-gray-600 mb-4">
                Add stories from the "Available Stories" section below.
              </p>
            </div>
          ) : (
            <CarouselManager stories={stories} />
          )}
        </div>

        {/* Available Stories Section */}
        <div>
          <h2 className="text-2xl font-bold text-gray-900 mb-4">Available Stories</h2>
          <p className="text-gray-600 mb-4">
            Stories you can add to the carousel
          </p>
          <AvailableStories stories={available} />
        </div>
      </div>
    </div>
  );
}
