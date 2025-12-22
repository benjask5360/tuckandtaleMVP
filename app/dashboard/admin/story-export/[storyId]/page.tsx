import { redirect } from 'next/navigation';
import { createClient } from '@/lib/supabase/server';
import { createAdminClient } from '@/lib/supabase/admin';
import Link from 'next/link';
import { Download, ArrowLeft, Image as ImageIcon, ChevronLeft, ChevronRight } from 'lucide-react';
import ExportFrameWrapper from './ExportFrameWrapper';

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

export default async function StoryExportPage({
  params,
}: {
  params: { storyId: string };
}) {
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

  // Use admin client to fetch story (bypasses RLS)
  const adminSupabase = createAdminClient();
  const { data: story, error: storyError } = await adminSupabase
    .from('content')
    .select('*')
    .eq('id', params.storyId)
    .eq('content_type', 'story')
    .single();

  if (storyError || !story) {
    return (
      <div className="min-h-screen bg-white py-8 px-4">
        <div className="max-w-6xl mx-auto">
          <div className="bg-white rounded-xl border border-gray-200 p-8 text-center">
            <h1 className="text-2xl font-bold text-gray-900 mb-4">Story Not Found</h1>
            <Link
              href="/dashboard/admin"
              className="text-purple-600 hover:text-purple-700"
            >
              ← Back to Admin Dashboard
            </Link>
          </div>
        </div>
      </div>
    );
  }

  // Fetch user profile for story creator
  const { data: storyCreator } = await adminSupabase
    .from('user_profiles')
    .select('id, email, full_name')
    .eq('id', story.user_id)
    .single();

  // Fetch all stories for navigation
  const { data: allStories } = await adminSupabase
    .from('content')
    .select('id, title, created_at')
    .eq('content_type', 'story')
    .is('deleted_at', null)
    .order('created_at', { ascending: false });

  // Find current story index and get prev/next
  const currentIndex = allStories?.findIndex(s => s.id === params.storyId) ?? -1;
  const prevStory = currentIndex > 0 ? allStories?.[currentIndex - 1] : null;
  const nextStory = currentIndex < (allStories?.length ?? 0) - 1 ? allStories?.[currentIndex + 1] : null;

  const metadata = story.generation_metadata as any;
  const isV3 = story.engine_version === 'v3';
  const v3Status = story.v3_illustration_status as V3IllustrationStatus | null;

  // Get paragraphs for V3 stories
  let v3Paragraphs: string[] | undefined;
  if (metadata?.paragraphs && Array.isArray(metadata.paragraphs)) {
    v3Paragraphs = metadata.paragraphs;
  } else if (metadata?.v3_story?.paragraphs && Array.isArray(metadata.v3_story.paragraphs)) {
    v3Paragraphs = metadata.v3_story.paragraphs.map((p: { text: string }) => p.text);
  }

  // Build frames array
  interface Frame {
    type: 'cover' | 'scene';
    index?: number;
    imageUrl?: string;
    text?: string;
    title?: string;
  }

  const frames: Frame[] = [];

  // Check if current user owns this story
  const canEdit = story.user_id === user.id;

  if (isV3 && v3Status) {
    // Add cover frame
    frames.push({
      type: 'cover',
      imageUrl: v3Status.cover.imageUrl || v3Status.cover.tempUrl,
      title: story.title,
    });

    // Add scene frames
    if (v3Status.scenes && v3Paragraphs) {
      v3Status.scenes.forEach((scene) => {
        frames.push({
          type: 'scene',
          index: scene.paragraphIndex,
          imageUrl: scene.imageUrl || scene.tempUrl,
          text: v3Paragraphs[scene.paragraphIndex],
        });
      });
    }
  }

  return (
    <div className="min-h-screen bg-white py-8 px-4">
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
          <div className="flex items-center justify-between mb-2">
            <h1 className="text-4xl font-bold text-gray-900">
              Story Export
            </h1>
            {/* Story Navigation */}
            <div className="flex items-center gap-2">
              {prevStory ? (
                <Link
                  href={`/dashboard/admin/story-export/${prevStory.id}`}
                  className="inline-flex items-center gap-1 px-3 py-2 bg-gray-100 text-gray-700 rounded-lg hover:bg-gray-200 transition-colors text-sm"
                >
                  <ChevronLeft className="w-4 h-4" />
                  Previous
                </Link>
              ) : (
                <div className="inline-flex items-center gap-1 px-3 py-2 bg-gray-50 text-gray-400 rounded-lg text-sm cursor-not-allowed">
                  <ChevronLeft className="w-4 h-4" />
                  Previous
                </div>
              )}
              {nextStory ? (
                <Link
                  href={`/dashboard/admin/story-export/${nextStory.id}`}
                  className="inline-flex items-center gap-1 px-3 py-2 bg-gray-100 text-gray-700 rounded-lg hover:bg-gray-200 transition-colors text-sm"
                >
                  Next
                  <ChevronRight className="w-4 h-4" />
                </Link>
              ) : (
                <div className="inline-flex items-center gap-1 px-3 py-2 bg-gray-50 text-gray-400 rounded-lg text-sm cursor-not-allowed">
                  Next
                  <ChevronRight className="w-4 h-4" />
                </div>
              )}
            </div>
          </div>
          <p className="text-gray-600">
            {story.title}
          </p>
          <div className="flex items-center gap-4 text-sm text-gray-500 mt-2">
            <span>
              Created by: <span className="font-medium text-gray-700">{storyCreator?.full_name || storyCreator?.email || 'Unknown'}</span>
            </span>
            <span>•</span>
            <span>
              {new Date(story.created_at).toLocaleDateString('en-US', {
                year: 'numeric',
                month: 'long',
                day: 'numeric',
                hour: '2-digit',
                minute: '2-digit'
              })}
            </span>
            <span>•</span>
            <span>
              {frames.length} frame{frames.length !== 1 ? 's' : ''} available
            </span>
          </div>
        </div>

        {/* Instructions */}
        <div className="bg-blue-50 border border-blue-200 rounded-xl p-6 mb-8">
          <h2 className="font-semibold text-blue-900 mb-2">Export Instructions</h2>
          <ul className="text-sm text-blue-800 space-y-1">
            <li>• All frames are displayed in 4:5 aspect ratio (optimized for ads and social media)</li>
            <li>• Click the download button on each frame to save as PNG</li>
            <li>• Use the text toggle to show/hide text overlays</li>
            <li>• The cover frame includes the story title overlay</li>
            <li>• Scene frames include paragraph text overlay</li>
          </ul>
        </div>

        {/* Check if story has illustrations */}
        {frames.length === 0 ? (
          <div className="bg-gray-50 border border-gray-200 rounded-xl p-8 text-center">
            <ImageIcon className="w-12 h-12 text-gray-400 mx-auto mb-4" />
            <h3 className="text-lg font-semibold text-gray-900 mb-2">
              No illustrations available
            </h3>
            <p className="text-gray-600">
              This story doesn't have any illustrations to export yet.
            </p>
          </div>
        ) : (
          /* Frames Grid */
          <div className="space-y-12">
            {frames.map((frame, index) => (
              <ExportFrameWrapper
                key={index}
                frame={frame}
                frameNumber={index + 1}
                canEdit={canEdit}
                storyId={params.storyId}
              />
            ))}
          </div>
        )}
      </div>
    </div>
  );
}
