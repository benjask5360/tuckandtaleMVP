-- Migration: Add Beta Story Engine columns to content table
-- Created: 2025-11-20
-- Purpose: Support new Beta Story Engine with individual scene illustrations

-- Add new columns to content table for Beta story engine
ALTER TABLE public.content
  ADD COLUMN IF NOT EXISTS engine_version text,
  ADD COLUMN IF NOT EXISTS story_scenes jsonb[],
  ADD COLUMN IF NOT EXISTS cover_illustration_prompt text,
  ADD COLUMN IF NOT EXISTS cover_illustration_url text;

-- Add comment explaining the columns
COMMENT ON COLUMN public.content.engine_version IS 'Story generation engine version: "legacy" or "beta"';
COMMENT ON COLUMN public.content.story_scenes IS 'Array of scene objects for Beta engine stories. Each scene has: paragraph, charactersInScene[], illustrationPrompt, illustrationUrl';
COMMENT ON COLUMN public.content.cover_illustration_prompt IS 'Illustration prompt for Beta engine story cover image';
COMMENT ON COLUMN public.content.cover_illustration_url IS 'URL of generated cover illustration for Beta engine stories';

-- Create index on engine_version for faster filtering
CREATE INDEX IF NOT EXISTS idx_content_engine_version ON public.content(engine_version);

-- Update ai_configs purpose check to include new Beta illustration purpose
ALTER TABLE public.ai_configs
  DROP CONSTRAINT IF EXISTS ai_configs_purpose_check;

ALTER TABLE public.ai_configs
  ADD CONSTRAINT ai_configs_purpose_check
  CHECK (purpose = ANY (ARRAY[
    'avatar_generation'::text,
    'story_fun'::text,
    'story_growth'::text,
    'story_illustration'::text,
    'story_illustration_beta'::text,
    'enhanced_story_illustration'::text,
    'story_vignette_panorama'::text,
    'story_vignette_narratives'::text,
    'story_vignette_scenes'::text
  ]));

COMMENT ON COLUMN public.ai_configs.purpose IS 'Operation type: avatar_generation, story_fun, story_growth, story_illustration, story_illustration_beta, enhanced_story_illustration, story_vignette_panorama, story_vignette_narratives, or story_vignette_scenes';
