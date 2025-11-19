-- Fix stories view to use SECURITY INVOKER instead of SECURITY DEFINER
-- This ensures the view uses the caller's permissions (RLS policies)
-- rather than the creator's permissions

-- Recreate the view with security_invoker option
CREATE OR REPLACE VIEW public.stories
WITH (security_invoker = true)
AS
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
  story_illustrations
FROM public.content c
WHERE content_type = 'story'
  AND deleted_at IS NULL;

-- Update comment to reflect security model
COMMENT ON VIEW public.stories IS
  'View of content table filtered to active stories only. Uses SECURITY INVOKER to enforce RLS policies from the underlying content table.';
