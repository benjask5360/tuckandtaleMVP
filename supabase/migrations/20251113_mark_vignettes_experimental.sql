-- Mark vignette features as experimental
-- This migration adds [EXPERIMENTAL] tags to all vignette-related schema elements
-- to clearly indicate that these features are under active development
-- Zero code changes required - this only affects database documentation

-- Mark vignette_panels table as experimental
COMMENT ON TABLE public.vignette_panels IS
  '[EXPERIMENTAL] Vignette story panel storage with AI-generated narratives. ' ||
  'Schema may change during development. ' ||
  'Created: 2025-11-10 | Last Updated: 2025-11-13';

-- Mark vignette-related columns in content table
COMMENT ON COLUMN public.content.vignette_helper_prompt IS
  '[EXPERIMENTAL] OpenAI prompt for generating visual scene descriptions ' ||
  '(Call #1 in vignette generation pipeline)';

COMMENT ON COLUMN public.content.vignette_prompt IS
  '[EXPERIMENTAL] Leonardo prompt for generating panoramic storyboard image ' ||
  '(Call #2 in vignette generation pipeline)';

COMMENT ON COLUMN public.content.panel_count IS
  '[EXPERIMENTAL] Number of panels in vignette grid layout ' ||
  '(default: 9 for 3x3, supports 1-16 for future flexibility)';

COMMENT ON COLUMN public.content.source_story_id IS
  '[EXPERIMENTAL] Optional link to source story for text-to-vignette conversions ' ||
  '(soft foreign key with ON DELETE SET NULL)';

-- Mark vignette_panels columns as experimental
COMMENT ON COLUMN public.vignette_panels.panel_number IS
  'Panel position in grid (1-9 for 3x3 layout, left-to-right, top-to-bottom)';

COMMENT ON COLUMN public.vignette_panels.panel_text IS
  '[EXPERIMENTAL] AI-generated narrative text for this panel ' ||
  '(from OpenAI Vision API GPT-4o)';

COMMENT ON COLUMN public.vignette_panels.panel_order IS
  '[EXPERIMENTAL] Reading order position (1-8) for story panels ' ||
  '(excludes cover panel, determined by Vision API)';

COMMENT ON COLUMN public.vignette_panels.is_cover IS
  '[EXPERIMENTAL] Designates this panel as the storybook cover ' ||
  '(no narrative text, displayed first)';

COMMENT ON COLUMN public.vignette_panels.image_url IS
  'Public URL for panel image (512x512 cropped from panoramic)';

COMMENT ON COLUMN public.vignette_panels.storage_path IS
  'Storage path in Supabase Storage illustrations bucket';

COMMENT ON COLUMN public.vignette_panels.story_id IS
  'Foreign key to content table (CASCADE delete when story is deleted)';
