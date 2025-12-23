import { redirect } from 'next/navigation';
import { createClient } from '@/lib/supabase/server';
import { createAdminClient } from '@/lib/supabase/admin';
import Link from 'next/link';
import { ArrowLeft, Image as ImageIcon } from 'lucide-react';
import AvatarManager from './AvatarManager';

interface AvatarCacheRow {
  id: string;
  character_profile_id: string | null;
  created_by_user_id: string;
  prompt_used: string;
  image_url: string;
  style: string;
  processing_status: string;
  is_current: boolean;
  created_at: string;
}

const PAGE_SIZE = 50;

export default async function AvatarsPage({ searchParams }: { searchParams: Promise<{ page?: string }> }) {
  const params = await searchParams;
  const currentPage = Math.max(1, parseInt(params.page || '1', 10));
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

  // Use admin client to fetch avatars
  const adminSupabase = createAdminClient();

  // Get total count
  const { count: totalCount } = await adminSupabase
    .from('avatar_cache')
    .select('*', { count: 'exact', head: true })
    .not('image_url', 'is', null);

  const totalPages = Math.ceil((totalCount || 0) / PAGE_SIZE);
  const offset = (currentPage - 1) * PAGE_SIZE;

  // Fetch paginated avatars
  const { data: avatars, error: avatarsError } = await adminSupabase
    .from('avatar_cache')
    .select('id, character_profile_id, created_by_user_id, prompt_used, image_url, style, processing_status, is_current, created_at')
    .not('image_url', 'is', null)
    .order('created_at', { ascending: false })
    .range(offset, offset + PAGE_SIZE - 1);

  if (avatarsError) {
    console.error('Error fetching avatars:', avatarsError);
  }

  // Fetch character profiles separately
  const characterIds = [...new Set((avatars || []).map(a => a.character_profile_id).filter(Boolean))];
  const { data: characterProfiles } = characterIds.length > 0
    ? await adminSupabase
        .from('character_profiles')
        .select('id, name, character_type')
        .in('id', characterIds)
    : { data: [] };

  const characterMap = new Map((characterProfiles || []).map(c => [c.id, c]));

  // Fetch user profiles separately
  const userIds = [...new Set((avatars || []).map(a => a.created_by_user_id).filter(Boolean))];
  const { data: userProfiles } = userIds.length > 0
    ? await adminSupabase
        .from('user_profiles')
        .select('id, full_name, email')
        .in('id', userIds)
    : { data: [] };

  const userMap = new Map((userProfiles || []).map(u => [u.id, u]));

  // Transform avatars for display
  const transformedAvatars = (avatars as AvatarCacheRow[] || [])
    .map((avatar) => {
      const characterProfile = avatar.character_profile_id ? characterMap.get(avatar.character_profile_id) : null;
      const userProfile = userMap.get(avatar.created_by_user_id);
      return {
        id: avatar.id,
        imageUrl: avatar.image_url,
        prompt: avatar.prompt_used,
        style: avatar.style,
        isCurrent: avatar.is_current,
        createdAt: avatar.created_at,
        characterName: characterProfile?.name || 'Preview',
        characterType: characterProfile?.character_type || 'unknown',
        userName: userProfile?.full_name || userProfile?.email || 'Unknown User',
      };
    });

  return (
    <div className="min-h-screen bg-gray-50 py-8 px-4">
      <div className="max-w-7xl mx-auto">
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
            Avatar Manager
          </h1>
          <p className="text-gray-600">
            View all generated avatars and their prompts
          </p>
        </div>

        {/* Stats */}
        <div className="bg-white border border-gray-200 rounded-xl p-6 mb-8">
          <div className="flex items-center gap-8">
            <div>
              <p className="text-3xl font-bold text-purple-600">{totalCount || 0}</p>
              <p className="text-sm text-gray-600">Total Avatars</p>
            </div>
            <div>
              <p className="text-3xl font-bold text-gray-600">
                Page {currentPage} of {totalPages || 1}
              </p>
              <p className="text-sm text-gray-600">Showing {transformedAvatars.length} avatars</p>
            </div>
          </div>
        </div>

        {/* Error Display */}
        {avatarsError && (
          <div className="bg-red-50 border border-red-200 rounded-xl p-6 mb-8">
            <h3 className="font-semibold text-red-900 mb-2">Error Loading Avatars</h3>
            <p className="text-sm text-red-700">{avatarsError.message}</p>
          </div>
        )}

        {/* Avatars Grid */}
        {transformedAvatars.length === 0 ? (
          <div className="bg-white rounded-xl border border-gray-200 p-12 text-center">
            <ImageIcon className="w-12 h-12 text-gray-400 mx-auto mb-4" />
            <h3 className="text-lg font-semibold text-gray-900 mb-2">
              No Avatars Found
            </h3>
            <p className="text-gray-600">
              Avatars will appear here once users generate them.
            </p>
          </div>
        ) : (
          <AvatarManager avatars={transformedAvatars} />
        )}

        {/* Pagination */}
        {totalPages > 1 && (
          <div className="flex justify-center gap-2 mt-8">
            {currentPage > 1 && (
              <Link
                href={`/dashboard/admin/avatars?page=${currentPage - 1}`}
                className="px-4 py-2 bg-white border border-gray-200 rounded-lg text-gray-700 hover:bg-gray-50"
              >
                Previous
              </Link>
            )}
            <span className="px-4 py-2 text-gray-600">
              Page {currentPage} of {totalPages}
            </span>
            {currentPage < totalPages && (
              <Link
                href={`/dashboard/admin/avatars?page=${currentPage + 1}`}
                className="px-4 py-2 bg-white border border-gray-200 rounded-lg text-gray-700 hover:bg-gray-50"
              >
                Next
              </Link>
            )}
          </div>
        )}
      </div>
    </div>
  );
}
