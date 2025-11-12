-- ============================================
-- VIGNETTE SPLICER MIGRATIONS
-- ============================================
-- Run this script in Supabase SQL Editor to apply all vignette-related migrations
--
-- This script:
-- 1. Creates the vignette_panels table for storing panel metadata
-- 2. Updates ai_configs constraint to include story_vignette_panorama
-- 3. Inserts the Leonardo Lucid Realism configuration for panoramic vignettes

-- ============================================
-- Migration 1: Create vignette_panels table
-- ============================================

-- Create vignette_panels table for storing individual panels from panoramic story images
CREATE TABLE IF NOT EXISTS vignette_panels (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  story_id uuid NOT NULL REFERENCES content(id) ON DELETE CASCADE,
  panel_number integer NOT NULL CHECK (panel_number >= 1 AND panel_number <= 9),
  image_url text NOT NULL,
  storage_path text NOT NULL,
  created_at timestamptz DEFAULT now(),

  -- Ensure unique panel numbers per story
  UNIQUE(story_id, panel_number)
);

-- Create index for efficient story lookups
CREATE INDEX IF NOT EXISTS idx_vignette_panels_story_id ON vignette_panels(story_id);

-- Create index for ordering panels
CREATE INDEX IF NOT EXISTS idx_vignette_panels_story_panel ON vignette_panels(story_id, panel_number);

-- Add RLS policies
ALTER TABLE vignette_panels ENABLE ROW LEVEL SECURITY;

-- Users can view their own vignette panels
DROP POLICY IF EXISTS "Users can view their own vignette panels" ON vignette_panels;
CREATE POLICY "Users can view their own vignette panels"
  ON vignette_panels
  FOR SELECT
  USING (
    EXISTS (
      SELECT 1 FROM content
      WHERE content.id = vignette_panels.story_id
      AND content.user_id = auth.uid()
    )
  );

-- Users can insert vignette panels for their own stories
DROP POLICY IF EXISTS "Users can insert vignette panels for their own stories" ON vignette_panels;
CREATE POLICY "Users can insert vignette panels for their own stories"
  ON vignette_panels
  FOR INSERT
  WITH CHECK (
    EXISTS (
      SELECT 1 FROM content
      WHERE content.id = vignette_panels.story_id
      AND content.user_id = auth.uid()
    )
  );

-- Users can delete their own vignette panels
DROP POLICY IF EXISTS "Users can delete their own vignette panels" ON vignette_panels;
CREATE POLICY "Users can delete their own vignette panels"
  ON vignette_panels
  FOR DELETE
  USING (
    EXISTS (
      SELECT 1 FROM content
      WHERE content.id = vignette_panels.story_id
      AND content.user_id = auth.uid()
    )
  );

-- ============================================
-- Migration 2: Update ai_configs for vignettes
-- ============================================

-- Update ai_configs purpose constraint to include story_vignette_panorama
ALTER TABLE public.ai_configs
DROP CONSTRAINT IF EXISTS ai_configs_purpose_check;

ALTER TABLE public.ai_configs
ADD CONSTRAINT ai_configs_purpose_check
CHECK (purpose IN ('avatar_generation', 'story_fun', 'story_growth', 'story_illustration', 'story_vignette_panorama'));

-- Insert Lucid Realism config for vignette panoramas
INSERT INTO public.ai_configs (
    name,
    purpose,
    provider,
    model_id,
    model_name,
    model_type,
    settings,
    is_default,
    is_active
)
VALUES (
    'leonardo_lucid_realism_vignette_panorama',
    'story_vignette_panorama',
    'leonardo',
    '05ce0082-2d80-4a2d-8653-4d1c85e2418e', -- Lucid Realism model ID
    'Lucid Realism',
    'image',
    '{
        "width": 3072,
        "height": 3072,
        "num_images": 1,
        "num_inference_steps": 40,
        "guidance_scale": 7,
        "scheduler": "LEONARDO",
        "public": false,
        "tiling": false,
        "negative_prompt": "bad anatomy, blurry, low quality, pixelated, distorted, text, captions, watermark, realistic photo, separate images, borders, frames",
        "sd_version": "SDXL_LIGHTNING"
    }'::jsonb,
    true, -- Set as default for vignette panoramas
    true
)
ON CONFLICT (name) DO UPDATE SET
    model_id = EXCLUDED.model_id,
    model_name = EXCLUDED.model_name,
    model_type = EXCLUDED.model_type,
    settings = EXCLUDED.settings,
    is_default = EXCLUDED.is_default,
    is_active = EXCLUDED.is_active,
    updated_at = now();

-- Add comment for documentation
COMMENT ON COLUMN public.ai_configs.purpose IS 'Operation type: avatar_generation, story_fun, story_growth, story_illustration, or story_vignette_panorama';

-- ============================================
-- Verification
-- ============================================

-- Verify vignette_panels table exists
SELECT 'vignette_panels table created' AS status
WHERE EXISTS (
  SELECT FROM information_schema.tables
  WHERE table_schema = 'public'
  AND table_name = 'vignette_panels'
);

-- Verify AI config was inserted
SELECT
  name,
  purpose,
  model_name,
  (settings->>'width')::int AS width,
  (settings->>'height')::int AS height,
  is_default,
  is_active
FROM public.ai_configs
WHERE purpose = 'story_vignette_panorama';
