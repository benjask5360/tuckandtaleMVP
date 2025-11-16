'use client';

import { useState, useEffect } from 'react';
import { createClient } from '@/lib/supabase/client';
import { useRouter } from 'next/navigation';
import Link from 'next/link';
import Image from 'next/image';
import { ArrowLeft, Heart, Sparkles, Loader2, Trash2, Target, Film, RefreshCw } from 'lucide-react';

interface VignettePanel {
  panel_number: number;
  image_url: string;
  storage_path: string;
  panel_text?: string | null;
  panel_order?: number | null;
  is_cover?: boolean;
}

interface Vignette {
  id: string;
  title: string;
  summary: string;
  scenes: string[];
  panels: VignettePanel[];
  characters: Array<{
    id: string;
    name: string;
    avatar_url?: string;
  }>;
  metadata: {
    mode: 'fun' | 'growth';
    genre: string;
    tone: string;
    hero_age?: number;
    vision_system_prompt?: string;
    vision_user_prompt?: string;
    vision_raw_response?: string;
  };
  panel_count: number;
  source_story_id?: string;
  is_favorite: boolean;
  created_at: string;
  panoramic_image_url?: string;
  prompts?: {
    helper: string;
    leonardo: string;
  };
}

export default function VignetteViewerPage({ params }: { params: { id: string } }) {
  const router = useRouter();
  const supabase = createClient();
  const [vignette, setVignette] = useState<Vignette | null>(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [selectedPanel, setSelectedPanel] = useState<number | null>(null);
  const [regenerating, setRegenerating] = useState(false);

  useEffect(() => {
    loadVignette();
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [params.id]);

  const loadVignette = async () => {
    try {
      const {
        data: { user },
      } = await supabase.auth.getUser();
      if (!user) {
        router.push('/auth/login');
        return;
      }

      const response = await fetch(`/api/vignettes/${params.id}`);
      const data = await response.json();

      if (!response.ok) {
        throw new Error(data.error || 'Failed to load vignette');
      }

      setVignette(data.vignette);
    } catch (err: any) {
      console.error('Error loading vignette:', err);
      setError(err.message);
    } finally {
      setLoading(false);
    }
  };

  const handleFavorite = async () => {
    if (!vignette) return;

    try {
      const newFavoriteStatus = !vignette.is_favorite;

      // Note: This endpoint doesn't exist yet - will need to create it
      const response = await fetch(`/api/vignettes/${params.id}/favorite`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ is_favorite: newFavoriteStatus }),
      });

      if (!response.ok) {
        throw new Error('Failed to update favorite status');
      }

      setVignette({ ...vignette, is_favorite: newFavoriteStatus });
    } catch (err: any) {
      console.error('Error updating favorite:', err);
      alert(err.message);
    }
  };

  const handleDelete = async () => {
    if (!vignette) return;

    const confirm = window.confirm(
      'Are you sure you want to delete this vignette story? This cannot be undone.'
    );
    if (!confirm) return;

    try {
      const response = await fetch(`/api/vignettes/${params.id}`, {
        method: 'DELETE',
      });

      if (!response.ok) {
        throw new Error('Failed to delete vignette');
      }

      router.push('/dashboard/story-library');
    } catch (err: any) {
      console.error('Error deleting vignette:', err);
      alert(err.message);
    }
  };

  const handleRegenerate = async () => {
    if (!vignette || regenerating) return;

    const confirm = window.confirm(
      'Regenerate this vignette story? This will create new panels with the same settings.'
    );
    if (!confirm) return;

    setRegenerating(true);

    try {
      // Fetch story parameters to get the IDs needed for regeneration
      const paramsResponse = await fetch('/api/stories/parameters');
      const paramsData = await paramsResponse.json();

      if (!paramsResponse.ok) {
        throw new Error('Failed to fetch story parameters');
      }

      // Extract parameters from the grouped structure
      const genres = paramsData.parameters?.genre || [];
      const tones = paramsData.parameters?.tone || [];
      const lengths = paramsData.parameters?.length || [];

      console.log('Vignette metadata:', vignette.metadata);
      console.log('Looking for genre:', vignette.metadata?.genre);
      console.log('Looking for tone:', vignette.metadata?.tone);
      console.log('Available genres:', genres.map((g: any) => g.value));
      console.log('Available tones:', tones.map((t: any) => t.value));

      // Find the matching parameter IDs (handle undefined metadata and values)
      const genreParam = vignette.metadata?.genre
        ? genres.find((g: any) => g?.value?.toLowerCase() === vignette.metadata.genre.toLowerCase())
        : null;
      const toneParam = vignette.metadata?.tone
        ? tones.find((t: any) => t?.value?.toLowerCase() === vignette.metadata.tone.toLowerCase())
        : null;
      const lengthParam = lengths?.[0]; // Use first length as default

      // If exact match not found, use fallback
      const finalGenreParam = genreParam || genres[0];
      const finalToneParam = toneParam || tones[0];
      const finalLengthParam = lengthParam || lengths[0];

      console.log('Matched parameters:', { finalGenreParam, finalToneParam, finalLengthParam });

      if (!finalGenreParam || !finalToneParam || !finalLengthParam) {
        console.error('Missing parameters after matching');
        throw new Error('Could not load story parameters from API');
      }

      // Get hero character (first character)
      const heroId = vignette.characters[0]?.id;
      if (!heroId) {
        throw new Error('No hero character found');
      }

      console.log('Using parameters:', {
        genre: finalGenreParam.value,
        tone: finalToneParam.value,
        heroId,
      });

      // Call the vignette generation API with proper parameters
      const response = await fetch('/api/vignette-stories/generate', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          heroId,
          characterIds: vignette.characters.slice(1).map((c) => c.id), // Supporting characters
          mode: vignette.metadata.mode,
          genreId: finalGenreParam.id,
          toneId: finalToneParam.id,
          lengthId: finalLengthParam.id,
        }),
      });

      const data = await response.json();

      if (!response.ok) {
        throw new Error(data.error || 'Failed to regenerate vignette');
      }

      // Navigate to the new vignette
      router.push(`/dashboard/vignettes/${data.data.storyId}`);
    } catch (err: any) {
      console.error('Full error object:', err);
      console.error('Error message:', err.message);
      console.error('Error stack:', err.stack);
      alert(`Error: ${err.message || 'Unknown error occurred'}`);
    } finally {
      setRegenerating(false);
    }
  };

  if (loading) {
    return (
      <div className="min-h-screen bg-gray-50 flex items-center justify-center p-4">
        <div className="text-center">
          <Loader2 className="w-8 h-8 animate-spin text-primary-600 mx-auto mb-4" />
          <p className="text-gray-600">Loading vignette story...</p>
        </div>
      </div>
    );
  }

  if (error || !vignette) {
    return (
      <div className="min-h-screen bg-gray-50 flex items-center justify-center p-4">
        <div className="card p-6 md:p-8 max-w-md text-center">
          <p className="text-red-600 font-medium mb-4">{error || 'Vignette not found'}</p>
          <Link href="/dashboard/story-library" className="btn-primary">
            Back to Library
          </Link>
        </div>
      </div>
    );
  }

  return (
    <div className="min-h-screen bg-gray-50">
      <div className="max-w-6xl mx-auto px-4 sm:px-6 py-4 md:py-6">
        {/* Header */}
        <div className="mb-4 md:mb-6">
          <Link
            href="/dashboard/story-library"
            className="inline-flex items-center gap-2 text-primary-600 active:text-primary-700 md:hover:text-primary-700 font-semibold mb-4 md:mb-6 min-h-[44px] transition-colors"
          >
            <ArrowLeft className="w-4 h-4 md:w-5 md:h-5" />
            Back to Story Library
          </Link>

          {/* Vignette Metadata */}
          <div className="card p-6 md:p-8 mb-4">
            <div className="flex items-start justify-between gap-4 mb-4">
              <div className="flex-1">
                <div className="flex items-center gap-2 mb-2">
                  <Film className="w-5 h-5 text-blue-600" />
                  {vignette.metadata?.mode === 'growth' ? (
                    <Target className="w-5 h-5 text-green-600" />
                  ) : (
                    <Sparkles className="w-5 h-5 text-primary-600" />
                  )}
                  <span
                    className={`text-sm font-semibold px-3 py-1 rounded-full ${
                      vignette.metadata?.mode === 'growth'
                        ? 'bg-green-100 text-green-800'
                        : 'bg-primary-100 text-primary-800'
                    }`}
                  >
                    {vignette.metadata?.mode === 'growth'
                      ? 'Growth Story'
                      : 'Fun Story'}
                  </span>
                  <span className="text-sm font-semibold px-3 py-1 rounded-full bg-blue-100 text-blue-800">
                    Visual Storybook
                  </span>
                  {vignette.metadata?.genre && (
                    <span className="text-sm text-gray-600">{vignette.metadata.genre}</span>
                  )}
                </div>
                <h1 className="text-2xl sm:text-3xl md:text-4xl font-display font-bold text-gray-900">
                  {vignette.title}
                </h1>
                <p className="text-gray-600 mt-2">{vignette.summary}</p>
              </div>

              <button
                onClick={handleFavorite}
                className="p-2 rounded-lg hover:bg-gray-100 transition-colors flex-shrink-0"
                title={vignette.is_favorite ? 'Remove from favorites' : 'Add to favorites'}
              >
                <Heart
                  className={`w-6 h-6 ${
                    vignette.is_favorite ? 'fill-red-500 text-red-500' : 'text-gray-400'
                  }`}
                />
              </button>
            </div>

            {/* Characters */}
            {vignette.characters && vignette.characters.length > 0 && (
              <div className="flex items-center gap-2 flex-wrap">
                <span className="text-sm text-gray-600">Starring:</span>
                {vignette.characters.map((char) => (
                  <div key={char.id} className="flex items-center gap-2">
                    {char.avatar_url && (
                      <img
                        src={char.avatar_url}
                        alt={char.name}
                        className="w-8 h-8 rounded-full object-cover"
                      />
                    )}
                    <span className="text-sm font-medium text-gray-900">{char.name}</span>
                  </div>
                ))}
              </div>
            )}
          </div>

          {/* Action Buttons */}
          <div className="flex flex-wrap gap-3 mb-6">
            <button
              onClick={handleRegenerate}
              disabled={regenerating}
              className="btn-primary flex items-center gap-2 disabled:opacity-50 disabled:cursor-not-allowed"
            >
              {regenerating ? (
                <>
                  <Loader2 className="w-4 h-4 animate-spin" />
                  Regenerating...
                </>
              ) : (
                <>
                  <RefreshCw className="w-4 h-4" />
                  Regenerate
                </>
              )}
            </button>
            <button
              onClick={handleDelete}
              className="btn-secondary text-red-600 hover:bg-red-50 flex items-center gap-2"
            >
              <Trash2 className="w-4 h-4" />
              Delete
            </button>
          </div>
        </div>

        {/* Full Panoramic Image */}
        {vignette.panoramic_image_url && (
          <div className="card p-6 md:p-8 mb-6">
            <h2 className="text-xl font-bold mb-4">Original Panoramic Image</h2>
            <p className="text-sm text-gray-600 mb-4">
              This is the full 3×3 grid image from Leonardo.ai before slicing into individual panels.
            </p>
            <div className="relative w-full aspect-square rounded-lg overflow-hidden bg-gray-100">
              <Image
                src={vignette.panoramic_image_url}
                alt="Full panoramic image"
                fill
                className="object-contain"
                sizes="100vw"
              />
            </div>
          </div>
        )}

        {/* Story Reading Order (Panels with Text) */}
        {vignette.panels.some((p) => p.panel_text || p.is_cover) && (
          <div className="card p-6 md:p-8 mb-6">
            <h2 className="text-xl font-bold mb-4">Story in Reading Order</h2>
            <p className="text-sm text-gray-600 mb-6">
              Panels arranged in the logical reading order determined by OpenAI Vision API, with narrative text for each scene.
            </p>
            <div className="space-y-6">
              {/* Cover Panel First */}
              {vignette.panels
                .filter((p) => p.is_cover)
                .map((panel) => (
                  <div key={panel.panel_number} className="border-2 border-blue-500 rounded-lg overflow-hidden bg-blue-50">
                    <div className="bg-blue-500 text-white px-4 py-2 font-semibold flex items-center justify-between">
                      <span>Cover Image (Panel {panel.panel_number})</span>
                      <span className="text-xs bg-blue-600 px-2 py-1 rounded">No Text</span>
                    </div>
                    <div className="p-4">
                      <div className="relative aspect-square rounded-lg overflow-hidden">
                        <Image
                          src={panel.image_url}
                          alt={`Cover - Panel ${panel.panel_number}`}
                          fill
                          className="object-cover"
                          sizes="(max-width: 768px) 100vw, 600px"
                        />
                      </div>
                    </div>
                  </div>
                ))}

              {/* Story Panels in Reading Order */}
              {vignette.panels
                .filter((p) => !p.is_cover && p.panel_order != null)
                .sort((a, b) => (a.panel_order || 0) - (b.panel_order || 0))
                .map((panel) => (
                  <div key={panel.panel_number} className="border rounded-lg overflow-hidden bg-white shadow-sm">
                    <div className="bg-gray-100 px-4 py-2 font-semibold flex items-center justify-between">
                      <span>Scene {panel.panel_order} (Panel {panel.panel_number})</span>
                      <span className="text-xs text-gray-600">{panel.panel_text?.length || 0} characters</span>
                    </div>
                    <div className="grid md:grid-cols-2 gap-4 p-4">
                      <div className="relative aspect-square rounded-lg overflow-hidden">
                        <Image
                          src={panel.image_url}
                          alt={`Scene ${panel.panel_order} - Panel ${panel.panel_number}`}
                          fill
                          className="object-cover"
                          sizes="(max-width: 768px) 100vw, 400px"
                        />
                      </div>
                      <div className="flex items-center">
                        <p className="text-gray-700 leading-relaxed">{panel.panel_text}</p>
                      </div>
                    </div>
                  </div>
                ))}
            </div>
          </div>
        )}

        {/* 3x3 Panel Grid */}
        <div className="card p-6 md:p-8 mb-6">
          <h2 className="text-xl font-bold mb-4">Story Panels</h2>
          <p className="text-sm text-gray-600 mb-4">
            Individual panels sliced from the panoramic image above (cropped and resized to 512×512).
          </p>
          <div className="grid grid-cols-1 sm:grid-cols-2 md:grid-cols-3 gap-4">
            {vignette.panels.map((panel) => (
              <div
                key={panel.panel_number}
                className="relative aspect-square group cursor-pointer"
                onClick={() => setSelectedPanel(panel.panel_number)}
              >
                <span className="absolute top-2 left-2 bg-black/70 text-white px-3 py-1 rounded-full text-sm font-semibold z-10">
                  {panel.panel_number}
                </span>
                <Image
                  src={panel.image_url}
                  alt={`Panel ${panel.panel_number}`}
                  fill
                  className="object-cover rounded-lg group-hover:opacity-90 transition-opacity"
                  sizes="(max-width: 640px) 100vw, (max-width: 768px) 50vw, 33vw"
                />
              </div>
            ))}
          </div>
        </div>

        {/* Scene Descriptions */}
        {vignette.scenes && vignette.scenes.length > 0 && (
          <div className="card p-6 md:p-8 mb-6">
            <h2 className="text-xl font-bold mb-4">Scene Descriptions</h2>
            <div className="space-y-3">
              {vignette.scenes.map((scene, idx) => (
                <div key={idx} className="flex gap-3">
                  <span className="flex-shrink-0 w-8 h-8 bg-primary-100 text-primary-700 rounded-full flex items-center justify-center text-sm font-semibold">
                    {idx + 1}
                  </span>
                  <p className="text-gray-700 flex-1 pt-1">{scene}</p>
                </div>
              ))}
            </div>
          </div>
        )}

        {/* Story Details */}
        <div className="card p-6 md:p-8 mb-6">
          <h3 className="text-sm font-semibold text-gray-500 uppercase tracking-wide mb-3">
            Story Details
          </h3>
          <div className="grid grid-cols-2 md:grid-cols-4 gap-4 text-sm">
            <div>
              <span className="text-gray-500">Created</span>
              <p className="font-medium text-gray-900">
                {new Date(vignette.created_at).toLocaleDateString()}
              </p>
            </div>
            <div>
              <span className="text-gray-500">Panels</span>
              <p className="font-medium text-gray-900">{vignette.panel_count}</p>
            </div>
            {vignette.metadata?.tone && (
              <div>
                <span className="text-gray-500">Tone</span>
                <p className="font-medium text-gray-900">{vignette.metadata.tone}</p>
              </div>
            )}
            {vignette.metadata?.hero_age && (
              <div>
                <span className="text-gray-500">Age</span>
                <p className="font-medium text-gray-900">{vignette.metadata.hero_age} years</p>
              </div>
            )}
          </div>
        </div>

        {/* Debug: Prompts Section */}
        {vignette.prompts && (
          <div className="card p-6 md:p-8 bg-gray-50 border-2 border-gray-300">
            <h3 className="text-sm font-semibold text-gray-700 uppercase tracking-wide mb-4 flex items-center gap-2">
              <span className="bg-yellow-100 text-yellow-800 px-2 py-1 rounded text-xs">DEBUG</span>
              Generation Prompts
            </h3>

            {/* OpenAI Helper Prompt */}
            <div className="mb-6">
              <h4 className="text-sm font-semibold text-gray-700 mb-2 flex items-center gap-2">
                <span className="bg-green-100 text-green-800 px-2 py-1 rounded text-xs">INPUT</span>
                OpenAI Helper Prompt
              </h4>
              <div className="bg-white rounded-lg p-4 border border-gray-200">
                <pre className="text-xs text-gray-700 whitespace-pre-wrap font-mono overflow-x-auto">
                  {vignette.prompts.helper}
                </pre>
              </div>
              <p className="text-xs text-gray-500 mt-2">
                Character count: {vignette.prompts.helper.length}
              </p>
            </div>

            {/* OpenAI Output / Leonardo Input */}
            <div>
              <h4 className="text-sm font-semibold text-gray-700 mb-2 flex items-center gap-2">
                <span className="bg-blue-100 text-blue-800 px-2 py-1 rounded text-xs">OUTPUT</span>
                Leonardo.ai Prompt
                <span className="text-xs text-gray-500 font-normal">(Generated by OpenAI)</span>
              </h4>
              <div className="bg-white rounded-lg p-4 border border-gray-200">
                <pre className="text-xs text-gray-700 whitespace-pre-wrap font-mono overflow-x-auto">
                  {vignette.prompts.leonardo}
                </pre>
              </div>
              <p className="text-xs text-gray-500 mt-2">
                Character count: {vignette.prompts.leonardo.length}
              </p>
            </div>
          </div>
        )}

        {/* Debug: Vision API Prompts Section */}
        {vignette.metadata?.vision_system_prompt && (
          <div className="card p-6 md:p-8 bg-sky-50 border-2 border-primary-300 mb-6">
            <h3 className="text-sm font-semibold text-gray-700 uppercase tracking-wide mb-4 flex items-center gap-2">
              <span className="bg-primary-100 text-primary-800 px-2 py-1 rounded text-xs">DEBUG</span>
              OpenAI Vision API (Narrative Generation)
            </h3>

            {/* Vision System Prompt */}
            <div className="mb-6">
              <h4 className="text-sm font-semibold text-gray-700 mb-2 flex items-center gap-2">
                <span className="bg-green-100 text-green-800 px-2 py-1 rounded text-xs">INPUT</span>
                System Prompt
                <span className="text-xs text-gray-500 font-normal">(Instructions to GPT-4o)</span>
              </h4>
              <div className="bg-white rounded-lg p-4 border border-gray-200">
                <pre className="text-xs text-gray-700 whitespace-pre-wrap font-mono overflow-x-auto">
                  {vignette.metadata.vision_system_prompt}
                </pre>
              </div>
              <p className="text-xs text-gray-500 mt-2">
                Character count: {vignette.metadata.vision_system_prompt.length}
              </p>
            </div>

            {/* Vision User Prompt */}
            {vignette.metadata?.vision_user_prompt && (
              <div className="mb-6">
                <h4 className="text-sm font-semibold text-gray-700 mb-2 flex items-center gap-2">
                  <span className="bg-green-100 text-green-800 px-2 py-1 rounded text-xs">INPUT</span>
                  User Prompt
                  <span className="text-xs text-gray-500 font-normal">(Story context + panoramic image)</span>
                </h4>
                <div className="bg-white rounded-lg p-4 border border-gray-200">
                  <pre className="text-xs text-gray-700 whitespace-pre-wrap font-mono overflow-x-auto">
                    {vignette.metadata.vision_user_prompt}
                  </pre>
                </div>
                <p className="text-xs text-gray-500 mt-2">
                  Character count: {vignette.metadata.vision_user_prompt.length}
                </p>
              </div>
            )}

            {/* Vision Raw Response */}
            {vignette.metadata?.vision_raw_response && (
              <div>
                <h4 className="text-sm font-semibold text-gray-700 mb-2 flex items-center gap-2">
                  <span className="bg-blue-100 text-blue-800 px-2 py-1 rounded text-xs">OUTPUT</span>
                  Raw JSON Response
                  <span className="text-xs text-gray-500 font-normal">(From GPT-4o Vision API)</span>
                </h4>
                <div className="bg-white rounded-lg p-4 border border-gray-200">
                  <pre className="text-xs text-gray-700 whitespace-pre-wrap font-mono overflow-x-auto">
                    {JSON.stringify(JSON.parse(vignette.metadata.vision_raw_response), null, 2)}
                  </pre>
                </div>
                <p className="text-xs text-gray-500 mt-2">
                  Character count: {vignette.metadata.vision_raw_response.length}
                </p>
              </div>
            )}
          </div>
        )}
      </div>

      {/* Full Screen Panel Modal */}
      {selectedPanel !== null && (
        <div
          className="fixed inset-0 bg-black/90 z-50 flex items-center justify-center p-4"
          onClick={() => setSelectedPanel(null)}
        >
          <div className="relative max-w-4xl w-full aspect-square">
            <button
              onClick={() => setSelectedPanel(null)}
              className="absolute top-4 right-4 text-white bg-black/50 hover:bg-black/70 rounded-full p-2 z-10"
            >
              ✕
            </button>
            <Image
              src={vignette.panels.find((p) => p.panel_number === selectedPanel)?.image_url || ''}
              alt={`Panel ${selectedPanel}`}
              fill
              className="object-contain"
            />
          </div>
        </div>
      )}
    </div>
  );
}
