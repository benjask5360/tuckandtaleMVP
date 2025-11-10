-- ============================================
-- Rename vignette content type to cleaner naming
-- Changes: 'vignette_story_prompt' → 'vignette_story'
-- ============================================

-- First, update existing records to use new naming
UPDATE public.content
SET content_type = 'vignette_story'
WHERE content_type = 'vignette_story_prompt';

-- Then drop existing constraint
ALTER TABLE public.content
DROP CONSTRAINT IF EXISTS content_content_type_check;

-- Finally, add updated constraint with cleaner naming
ALTER TABLE public.content
ADD CONSTRAINT content_content_type_check
CHECK (content_type IN (
  'story',
  'illustration',
  'avatar',
  'vignette_story'  -- Cleaner, more semantic naming
));

-- Update column comment
COMMENT ON COLUMN public.content.content_type IS
  'Content type: story, illustration, avatar, or vignette_story';

-- Summary
DO $$
BEGIN
  RAISE NOTICE '============================================';
  RAISE NOTICE 'Renamed vignette content type!';
  RAISE NOTICE '============================================';
  RAISE NOTICE 'Old: vignette_story_prompt';
  RAISE NOTICE 'New: vignette_story';
  RAISE NOTICE '';
  RAISE NOTICE 'More semantic and future-ready for when';
  RAISE NOTICE 'narration layer is added.';
  RAISE NOTICE '============================================';
END $$;
