-- Migration: Fix stories view to include generation_status field
-- Created: 2025-11-21
-- Purpose: Add missing generation_status field to stories view so viewer can properly poll for updates

-- Drop the existing view
DROP VIEW IF EXISTS public.stories;

-- Recreate the view with generation_status field included
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
  generation_status,        -- ADD THIS FIELD (was missing!)
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
COMMENT ON VIEW public.stories IS 'View of active stories with Beta engine support and generation status';