-- ============================================
-- Add source_story_id for future story conversions
-- Enables linking vignettes to original text stories (and vice versa)
-- ============================================

-- Add source_story_id column (nullable, foreign key to content table)
ALTER TABLE public.content
ADD COLUMN IF NOT EXISTS source_story_id uuid REFERENCES public.content(id) ON DELETE SET NULL;

-- Add column comment explaining purpose
COMMENT ON COLUMN public.content.source_story_id IS
  'Optional: Links to original story if this was converted (text→vignette or vignette→text). Enables future "convert story type" feature.';

-- Create index for faster lookups of converted stories
CREATE INDEX IF NOT EXISTS idx_content_source_story_id
  ON public.content(source_story_id)
  WHERE source_story_id IS NOT NULL;

-- Summary
DO $$
BEGIN
  RAISE NOTICE '============================================';
  RAISE NOTICE 'Added source_story_id field!';
  RAISE NOTICE '============================================';
  RAISE NOTICE 'Purpose: Link vignettes to original text stories';
  RAISE NOTICE '';
  RAISE NOTICE 'Future use cases:';
  RAISE NOTICE '  - Convert text story → vignette';
  RAISE NOTICE '  - Convert vignette → text story';
  RAISE NOTICE '  - Track story relationships';
  RAISE NOTICE '============================================';
END $$;
