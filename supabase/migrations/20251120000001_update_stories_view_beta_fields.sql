-- Migration: Update stories view to include Beta engine fields
-- Created: 2025-11-20
-- Purpose: Add engine_version, story_scenes, cover_illustration_url, cover_illustration_prompt to stories view

-- Drop the existing view
DROP VIEW IF EXISTS public.stories;

-- Recreate the view with Beta engine fields
CREATE OR REPLACE VIEW public.stories AS
SELECT
  id,
  user_id,
  content_type,
  title,
  body,
  theme,
  age_appropriate_for,
  duration_minutes,
  parent_content_id,
  generation_prompt,
  generation_metadata,
  is_favorite,
  read_count,
  last_accessed_at,
  created_at,
  updated_at,
  deleted_at,
  vignette_helper_prompt,
  vignette_prompt,
  source_story_id,
  panel_count,
  panoramic_image_url,
  vignette_story_prompt,
  story_illustration_prompt,
  include_illustrations,
  story_illustrations,
  -- Beta Engine fields
  engine_version,
  story_scenes,
  cover_illustration_url,
  cover_illustration_prompt
FROM content c
WHERE content_type = 'story' AND deleted_at IS NULL;

-- Add comment
COMMENT ON VIEW public.stories IS 'View of active stories (not deleted) with Beta engine support';
