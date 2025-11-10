-- ============================================
-- Add 'vignette_story_prompt' content type
-- ============================================

-- Drop existing constraint
ALTER TABLE public.content
DROP CONSTRAINT IF EXISTS content_content_type_check;

-- Add updated constraint with new content type
ALTER TABLE public.content
ADD CONSTRAINT content_content_type_check
CHECK (content_type IN (
  'story',
  'illustration',
  'avatar',
  'vignette_story_prompt'  -- Visual scene descriptions for Leonardo
));

COMMENT ON COLUMN public.content.content_type IS 'Content type: story, illustration, avatar, or vignette_story_prompt';
