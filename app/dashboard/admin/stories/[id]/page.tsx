import { redirect } from 'next/navigation';
import { createClient } from '@/lib/supabase/server';
import { createAdminClient } from '@/lib/supabase/admin';
import Link from 'next/link';
import { BookOpen, User, Calendar, Code, Image as ImageIcon, FileText } from 'lucide-react';
import Image from 'next/image';
import CopyButton from './CopyButton';
import StoryNavDropdown from './StoryNavDropdown';

// V2 Scene format (from story_scenes column)
interface Scene {
  paragraph: string;
  charactersInScene: string[];
  illustrationPrompt: string;
  illustrationUrl?: string;
}

// V3 Illustration Status format (from v3_illustration_status column)
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

export default async function AdminStoryInspectionPage({
  params,
}: {
  params: { id: string };
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
    .eq('id', params.id)
    .eq('content_type', 'story')
    .single();

  if (storyError || !story) {
    return (
      <div className="min-h-screen bg-gradient-to-br from-purple-50 to-pink-50 py-8 px-4">
        <div className="max-w-6xl mx-auto">
          <div className="bg-white rounded-xl shadow-lg p-8 text-center">
            <h1 className="text-2xl font-bold text-gray-900 mb-4">Story Not Found</h1>
            <Link
              href="/dashboard/admin/stories"
              className="text-purple-600 hover:text-purple-700"
            >
              ← Back to Story Inspector
            </Link>
          </div>
        </div>
      </div>
    );
  }

  // Fetch user profile separately
  const { data: user_profile } = await adminSupabase
    .from('user_profiles')
    .select('id, email, full_name')
    .eq('id', story.user_id)
    .single();

  // Fetch all stories for dropdown navigation
  const { data: allStories } = await adminSupabase
    .from('content')
    .select('id, title, created_at, user_id')
    .eq('content_type', 'story')
    .is('deleted_at', null)
    .order('created_at', { ascending: false })
    .limit(200);

  // Fetch user profiles for dropdown display
  let storyUserProfiles: Record<string, { full_name: string | null; email: string }> = {};
  if (allStories && allStories.length > 0) {
    const userIds = [...new Set(allStories.map(s => s.user_id))];
    const { data: profiles } = await adminSupabase
      .from('user_profiles')
      .select('id, full_name, email')
      .in('id', userIds);
    if (profiles) {
      storyUserProfiles = Object.fromEntries(profiles.map(p => [p.id, p]));
    }
  }

  const metadata = story.generation_metadata as any;
  const scenes = story.story_scenes as Scene[] | null;

  // V3 support: check engine version and extract v3_illustration_status
  const isV3 = story.engine_version === 'v3';
  const v3Status = story.v3_illustration_status as V3IllustrationStatus | null;

  // For V3 stories, get paragraphs - try metadata.paragraphs first (string array),
  // then fall back to metadata.v3_story.paragraphs (object array with .text)
  let v3Paragraphs: string[] | undefined;
  if (metadata?.paragraphs && Array.isArray(metadata.paragraphs)) {
    v3Paragraphs = metadata.paragraphs;
  } else if (metadata?.v3_story?.paragraphs && Array.isArray(metadata.v3_story.paragraphs)) {
    v3Paragraphs = metadata.v3_story.paragraphs.map((p: { text: string }) => p.text);
  }

  return (
    <div className="min-h-screen bg-gradient-to-br from-purple-50 to-pink-50 py-8 px-4">
      <div className="max-w-6xl mx-auto space-y-6">
        {/* Header */}
        <div>
          <div className="flex items-center justify-between mb-4">
            <Link
              href="/dashboard/admin/stories"
              className="text-purple-600 hover:text-purple-700 inline-flex items-center gap-2 text-sm"
            >
              ← Back to Story Inspector
            </Link>
            {allStories && allStories.length > 0 && (
              <div className="flex items-center gap-2">
                <span className="text-sm text-gray-600">Jump to:</span>
                <StoryNavDropdown
                  stories={allStories}
                  currentStoryId={params.id}
                  userProfiles={storyUserProfiles}
                />
              </div>
            )}
          </div>
          <h1 className="text-4xl font-bold text-gray-900 mb-2">
            {story.title || 'Untitled Story'}
          </h1>
        </div>

        {/* Story Metadata */}
        <div className="bg-white rounded-xl shadow-lg p-6">
          <h2 className="text-xl font-bold text-gray-900 mb-4 flex items-center gap-2">
            <BookOpen className="w-5 h-5 text-purple-600" />
            Story Metadata
          </h2>
          <div className="grid grid-cols-1 md:grid-cols-2 gap-4 text-sm">
            <div>
              <span className="font-semibold text-gray-700">Story ID:</span>
              <span className="ml-2 text-gray-600 font-mono text-xs">{story.id}</span>
            </div>
            <div>
              <span className="font-semibold text-gray-700">Engine Version:</span>
              <span className="ml-2 text-gray-600">{story.engine_version || 'legacy'}</span>
            </div>
            <div className="flex items-center gap-2">
              <User className="w-4 h-4 text-gray-400" />
              <span className="font-semibold text-gray-700">User:</span>
              <span className="ml-2 text-gray-600">
                {user_profile?.full_name || user_profile?.email || 'Unknown'}
              </span>
            </div>
            <div className="flex items-center gap-2">
              <Calendar className="w-4 h-4 text-gray-400" />
              <span className="font-semibold text-gray-700">Created:</span>
              <span className="ml-2 text-gray-600">
                {new Date(story.created_at).toLocaleString('en-US', {
                  year: 'numeric',
                  month: 'long',
                  day: 'numeric',
                  hour: '2-digit',
                  minute: '2-digit'
                })}
              </span>
            </div>
            {metadata?.mode && (
              <div>
                <span className="font-semibold text-gray-700">Mode:</span>
                <span className={`ml-2 px-2 py-1 rounded-full text-xs font-medium ${
                  metadata.mode === 'fun'
                    ? 'bg-blue-100 text-blue-800'
                    : 'bg-green-100 text-green-800'
                }`}>
                  {metadata.mode}
                </span>
              </div>
            )}
            {metadata?.genre && (
              <div>
                <span className="font-semibold text-gray-700">Genre:</span>
                <span className="ml-2 text-gray-600">{metadata.genre}</span>
              </div>
            )}
            {metadata?.tone && (
              <div>
                <span className="font-semibold text-gray-700">Tone:</span>
                <span className="ml-2 text-gray-600">{metadata.tone}</span>
              </div>
            )}
            {metadata?.growth_topic && (
              <div>
                <span className="font-semibold text-gray-700">Growth Topic:</span>
                <span className="ml-2 text-gray-600">{metadata.growth_topic}</span>
              </div>
            )}
          </div>
        </div>

        {/* Full Story System Prompt */}
        <div className="bg-white rounded-xl shadow-lg p-6">
          <div className="flex items-center justify-between mb-4">
            <h2 className="text-xl font-bold text-gray-900 flex items-center gap-2">
              <Code className="w-5 h-5 text-purple-600" />
              Story Generation System Prompt
            </h2>
            <CopyButton text={story.generation_prompt || 'No prompt available'} />
          </div>
          <div className="bg-gray-50 rounded-lg p-4 max-h-96 overflow-y-auto">
            <pre className="text-xs text-gray-800 whitespace-pre-wrap font-mono">
              {story.generation_prompt || 'No generation prompt saved for this story.'}
            </pre>
          </div>
        </div>

        {/* Illustration System Prompt (V3 only) */}
        {isV3 && story.v3_illustration_system_prompt && (
          <div className="bg-white rounded-xl shadow-lg p-6">
            <div className="flex items-center justify-between mb-4">
              <h2 className="text-xl font-bold text-gray-900 flex items-center gap-2">
                <ImageIcon className="w-5 h-5 text-purple-600" />
                Illustration Generation System Prompt
              </h2>
              <CopyButton text={story.v3_illustration_system_prompt || 'No prompt available'} />
            </div>
            <div className="bg-gray-50 rounded-lg p-4 max-h-96 overflow-y-auto">
              <pre className="text-xs text-gray-800 whitespace-pre-wrap font-mono">
                {story.v3_illustration_system_prompt}
              </pre>
            </div>
          </div>
        )}

        {/* Story Content & Illustrations */}
        <div className="bg-white rounded-xl shadow-lg p-6">
          <h2 className="text-xl font-bold text-gray-900 mb-6 flex items-center gap-2">
            <ImageIcon className="w-5 h-5 text-purple-600" />
            All Illustrations {isV3 && v3Status ? `(${1 + (v3Status.scenes?.length || 0)} Total: 1 Cover + ${v3Status.scenes?.length || 0} Scenes)` : '(9 Total: 1 Cover + 8 Scenes)'}
            {isV3 && v3Status && (
              <span className={`ml-2 px-2 py-1 rounded-full text-xs font-medium ${
                v3Status.overall === 'complete' ? 'bg-green-100 text-green-800' :
                v3Status.overall === 'partial' ? 'bg-yellow-100 text-yellow-800' :
                v3Status.overall === 'failed' ? 'bg-red-100 text-red-800' :
                v3Status.overall === 'generating' ? 'bg-blue-100 text-blue-800' :
                'bg-gray-100 text-gray-800'
              }`}>
                {v3Status.overall}
              </span>
            )}
          </h2>

          {/* V3 Cover Illustration */}
          {isV3 && v3Status ? (
            <>
              <div className="mb-8 pb-8 border-b border-gray-200">
                <h3 className="text-lg font-semibold text-purple-700 mb-4">
                  Cover Illustration
                  <span className={`ml-2 px-2 py-1 rounded-full text-xs font-medium ${
                    v3Status.cover.status === 'success' ? 'bg-green-100 text-green-800' :
                    v3Status.cover.status === 'failed' ? 'bg-red-100 text-red-800' :
                    v3Status.cover.status === 'generating' ? 'bg-blue-100 text-blue-800' :
                    'bg-gray-100 text-gray-800'
                  }`}>
                    {v3Status.cover.status}
                  </span>
                </h3>
                <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
                  <div className="relative aspect-square rounded-lg overflow-hidden bg-gray-100">
                    {(v3Status.cover.imageUrl || v3Status.cover.tempUrl) ? (
                      <Image
                        src={v3Status.cover.imageUrl || v3Status.cover.tempUrl || ''}
                        alt="Cover illustration"
                        fill
                        className="object-cover"
                      />
                    ) : (
                      <div className="absolute inset-0 flex items-center justify-center text-gray-400">
                        <div className="text-center">
                          <ImageIcon className="w-12 h-12 mx-auto mb-2" />
                          <p className="text-sm">{v3Status.cover.error || 'No illustration available'}</p>
                        </div>
                      </div>
                    )}
                  </div>
                  <div>
                    <div className="flex items-center justify-between mb-2">
                      <h4 className="font-semibold text-gray-900">Cover Illustration Prompt</h4>
                      <CopyButton text={v3Status.cover.prompt || ''} />
                    </div>
                    <div className="bg-gray-50 rounded-lg p-4">
                      <pre className="text-sm text-gray-800 whitespace-pre-wrap font-mono">
                        {v3Status.cover.prompt || 'No prompt available'}
                      </pre>
                    </div>
                    {v3Status.cover.error && (
                      <div className="mt-2 bg-red-50 rounded-lg p-4">
                        <p className="text-sm text-red-800">Error: {v3Status.cover.error}</p>
                      </div>
                    )}
                  </div>
                </div>
              </div>

              {/* V3 Scene Illustrations with Paragraphs */}
              <div className="space-y-8">
                <h3 className="text-lg font-semibold text-purple-700">Paragraphs & Illustrations ({v3Status.scenes?.length || 0})</h3>
                {v3Status.scenes && v3Status.scenes.length > 0 ? (
                  v3Status.scenes.map((scene, index) => {
                    const paragraphText = v3Paragraphs?.[scene.paragraphIndex] || null;
                    return (
                      <div key={index} className="pb-8 border-b border-gray-200 last:border-b-0">
                        <h4 className="font-semibold text-gray-900 mb-4">
                          Paragraph {scene.paragraphIndex + 1}
                          <span className={`ml-2 px-2 py-1 rounded-full text-xs font-medium ${
                            scene.status === 'success' ? 'bg-green-100 text-green-800' :
                            scene.status === 'failed' ? 'bg-red-100 text-red-800' :
                            scene.status === 'generating' ? 'bg-blue-100 text-blue-800' :
                            'bg-gray-100 text-gray-800'
                          }`}>
                            {scene.status}
                          </span>
                        </h4>

                        {/* Paragraph Text */}
                        {paragraphText && (
                          <div className="mb-4 border-l-4 border-purple-300 pl-4 bg-purple-50 rounded-r-lg py-3 pr-4">
                            <p className="text-gray-800 leading-relaxed">{paragraphText}</p>
                          </div>
                        )}

                        <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
                          <div className="relative aspect-square rounded-lg overflow-hidden bg-gray-100">
                            {(scene.imageUrl || scene.tempUrl) ? (
                              <Image
                                src={scene.imageUrl || scene.tempUrl || ''}
                                alt={`Scene ${scene.paragraphIndex + 1} illustration`}
                                fill
                                className="object-cover"
                              />
                            ) : (
                              <div className="absolute inset-0 flex items-center justify-center text-gray-400">
                                <div className="text-center">
                                  <ImageIcon className="w-12 h-12 mx-auto mb-2" />
                                  <p className="text-sm">{scene.error || 'No illustration available'}</p>
                                </div>
                              </div>
                            )}
                          </div>
                          <div>
                            <div className="flex items-center justify-between mb-2">
                              <h5 className="font-semibold text-gray-900">Illustration Prompt</h5>
                              <CopyButton text={scene.prompt || ''} />
                            </div>
                            <div className="bg-gray-50 rounded-lg p-4">
                              <pre className="text-sm text-gray-800 whitespace-pre-wrap font-mono">
                                {scene.prompt || 'No prompt available'}
                              </pre>
                            </div>
                            {scene.error && (
                              <div className="mt-2 bg-red-50 rounded-lg p-4">
                                <p className="text-sm text-red-800">Error: {scene.error}</p>
                              </div>
                            )}
                          </div>
                        </div>
                      </div>
                    );
                  })
                ) : (
                  <p className="text-gray-500 italic">No scene illustrations available.</p>
                )}
              </div>
            </>
          ) : (
            /* V2 Cover Illustration */
            <>
              {story.cover_illustration_url && (
                <div className="mb-8 pb-8 border-b border-gray-200">
                  <h3 className="text-lg font-semibold text-purple-700 mb-4">Cover Illustration</h3>
                  <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
                    <div className="relative aspect-square rounded-lg overflow-hidden bg-gray-100">
                      <Image
                        src={story.cover_illustration_url}
                        alt="Cover illustration"
                        fill
                        className="object-cover"
                      />
                    </div>
                    <div>
                      <div className="flex items-center justify-between mb-2">
                        <h4 className="font-semibold text-gray-900">Cover Illustration Prompt</h4>
                        <CopyButton text={story.cover_illustration_prompt || ''} />
                      </div>
                      <div className="bg-gray-50 rounded-lg p-4">
                        <pre className="text-sm text-gray-800 whitespace-pre-wrap font-mono">
                          {story.cover_illustration_prompt || 'No prompt available'}
                        </pre>
                      </div>
                    </div>
                  </div>
                </div>
              )}

              {/* V2 Scene Illustrations */}
              {scenes && scenes.length > 0 ? (
                <div className="space-y-8">
                  <h3 className="text-lg font-semibold text-purple-700">Scene Illustrations ({scenes.length})</h3>
                  {scenes.map((scene, index) => (
                    <div key={index} className="pb-8 border-b border-gray-200 last:border-b-0">
                      <h4 className="font-semibold text-gray-900 mb-4">Scene {index + 1}</h4>
                      <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
                        <div className="relative aspect-square rounded-lg overflow-hidden bg-gray-100">
                          {scene.illustrationUrl ? (
                            <Image
                              src={scene.illustrationUrl}
                              alt={`Scene ${index + 1} illustration`}
                              fill
                              className="object-cover"
                            />
                          ) : (
                            <div className="absolute inset-0 flex items-center justify-center text-gray-400">
                              <div className="text-center">
                                <ImageIcon className="w-12 h-12 mx-auto mb-2" />
                                <p className="text-sm">No illustration available</p>
                              </div>
                            </div>
                          )}
                        </div>
                        <div>
                          <div className="flex items-center justify-between mb-2">
                            <h5 className="font-semibold text-gray-900">Illustration Prompt</h5>
                            <CopyButton text={scene.illustrationPrompt || ''} />
                          </div>
                          <div className="bg-gray-50 rounded-lg p-4">
                            <pre className="text-sm text-gray-800 whitespace-pre-wrap font-mono">
                              {scene.illustrationPrompt || 'No prompt available'}
                            </pre>
                          </div>
                        </div>
                      </div>
                    </div>
                  ))}
                </div>
              ) : (
                <p className="text-gray-500 italic">No scene illustrations available.</p>
              )}
            </>
          )}
        </div>
      </div>
    </div>
  );
}
