import { redirect } from 'next/navigation';
import { createClient } from '@/lib/supabase/server';
import { createAdminClient } from '@/lib/supabase/admin';
import Link from 'next/link';
import { BookOpen } from 'lucide-react';
import StorySelector from './StorySelector';

export default async function AdminStoriesPage() {
  const supabase = await createClient();

  // Check authentication
  const { data: { user }, error: authError } = await supabase.auth.getUser();
  if (authError || !user) {
    redirect('/auth/login');
  }

  // Check admin privileges
  const { data: userProfile, error: profileError } = await supabase
    .from('user_profiles')
    .select('user_type, full_name')
    .eq('id', user.id)
    .single();

  if (profileError || userProfile?.user_type !== 'admin') {
    redirect('/dashboard');
  }

  // Use admin client to fetch all stories
  const adminSupabase = createAdminClient();
  const { data: stories, error: storiesError } = await adminSupabase
    .from('content')
    .select('id, title, created_at, user_id')
    .eq('content_type', 'story')
    .is('deleted_at', null)
    .order('created_at', { ascending: false })
    .limit(200);

  // Fetch user profiles separately
  let userProfiles: Record<string, any> = {};
  if (stories && stories.length > 0) {
    const userIds = [...new Set(stories.map(s => s.user_id))];
    const { data: profiles } = await adminSupabase
      .from('user_profiles')
      .select('id, full_name, email')
      .in('id', userIds);

    if (profiles) {
      userProfiles = Object.fromEntries(
        profiles.map(p => [p.id, p])
      );
    }
  }

  if (storiesError) {
    console.error('Error fetching stories:', storiesError);
  }

  // Debug logging
  console.log('Stories query result:', {
    count: stories?.length || 0,
    error: storiesError,
    hasData: !!stories
  });

  return (
    <div className="min-h-screen bg-gradient-to-br from-purple-50 to-pink-50 py-8 px-4">
      <div className="max-w-4xl mx-auto">
        {/* Header */}
        <div className="mb-8">
          <Link
            href="/dashboard/admin"
            className="text-purple-600 hover:text-purple-700 mb-4 inline-flex items-center gap-2 text-sm"
          >
            ← Back to Admin Dashboard
          </Link>
          <h1 className="text-4xl font-bold text-gray-900 mb-2">
            Story Inspector
          </h1>
          <p className="text-gray-600">
            Select a story to view its full system prompt, content, and illustrations
          </p>
        </div>

        {/* Story Selector Card */}
        <div className="bg-white rounded-xl shadow-lg p-8">
          {storiesError ? (
            <div className="text-center py-12">
              <BookOpen className="w-16 h-16 text-red-400 mx-auto mb-4" />
              <h2 className="text-xl font-semibold text-red-700 mb-2">
                Error Loading Stories
              </h2>
              <p className="text-red-600 text-sm mb-4">
                {storiesError.message}
              </p>
              <pre className="text-xs text-left bg-red-50 p-4 rounded max-w-2xl mx-auto overflow-auto">
                {JSON.stringify(storiesError, null, 2)}
              </pre>
            </div>
          ) : !stories || stories.length === 0 ? (
            <div className="text-center py-12">
              <BookOpen className="w-16 h-16 text-gray-400 mx-auto mb-4" />
              <h2 className="text-xl font-semibold text-gray-700 mb-2">
                No stories found
              </h2>
              <p className="text-gray-500">
                Stories will appear here once users generate them.
              </p>
            </div>
          ) : (
            <StorySelector stories={stories} userProfiles={userProfiles} />
          )}
        </div>
      </div>
    </div>
  );
}
