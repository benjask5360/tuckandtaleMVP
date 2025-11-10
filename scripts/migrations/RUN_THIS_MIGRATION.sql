-- ============================================
-- Vignette V2 Migration - CORRECT ORDER
-- ============================================
-- IMPORTANT: This runs operations in the correct order to avoid constraint violations
-- Copy and paste this entire file into Supabase SQL Editor and run it

-- Step 1: Drop the old constraint FIRST (so we can modify the data)
ALTER TABLE public.content
DROP CONSTRAINT IF EXISTS content_content_type_check;

-- Step 2: NOW we can safely update the records
UPDATE public.content
SET content_type = 'vignette_story'
WHERE content_type = 'vignette_story_prompt';

-- Step 3: Add the new constraint with the updated allowed values
ALTER TABLE public.content
ADD CONSTRAINT content_content_type_check
CHECK (content_type IN (
  'story',
  'illustration',
  'avatar',
  'vignette_story'
));

-- Step 4: Update column comment
COMMENT ON COLUMN public.content.content_type IS
  'Content type: story, illustration, avatar, or vignette_story';

-- Step 5: Add source_story_id column
ALTER TABLE public.content
ADD COLUMN IF NOT EXISTS source_story_id uuid REFERENCES public.content(id) ON DELETE SET NULL;

COMMENT ON COLUMN public.content.source_story_id IS
  'Optional: Links to original story if this was converted (text→vignette or vignette→text)';

CREATE INDEX IF NOT EXISTS idx_content_source_story_id
  ON public.content(source_story_id)
  WHERE source_story_id IS NOT NULL;

-- Step 6: Add panel_count column
ALTER TABLE public.content
ADD COLUMN IF NOT EXISTS panel_count integer DEFAULT 9;

COMMENT ON COLUMN public.content.panel_count IS
  'Number of panels in vignette story. Currently 9 (3×3 grid), flexible for future layouts';

ALTER TABLE public.content
DROP CONSTRAINT IF EXISTS content_panel_count_check;

ALTER TABLE public.content
ADD CONSTRAINT content_panel_count_check
CHECK (panel_count IS NULL OR (panel_count >= 1 AND panel_count <= 16));

-- Step 7: Update existing vignette stories to have panel_count = 9
UPDATE public.content
SET panel_count = 9
WHERE content_type = 'vignette_story' AND panel_count IS NULL;

-- Step 8: Show results
DO $$
DECLARE
  vignette_count integer;
  story_count integer;
BEGIN
  SELECT COUNT(*) INTO vignette_count FROM public.content WHERE content_type = 'vignette_story';
  SELECT COUNT(*) INTO story_count FROM public.content WHERE content_type = 'story';

  RAISE NOTICE '';
  RAISE NOTICE '============================================';
  RAISE NOTICE '✅ Vignette V2 Migrations Complete!';
  RAISE NOTICE '============================================';
  RAISE NOTICE 'Results:';
  RAISE NOTICE '  - Vignette stories: %', vignette_count;
  RAISE NOTICE '  - Text stories: %', story_count;
  RAISE NOTICE '';
  RAISE NOTICE 'Database changes:';
  RAISE NOTICE '  ✓ content_type renamed: vignette_story_prompt → vignette_story';
  RAISE NOTICE '  ✓ source_story_id column added';
  RAISE NOTICE '  ✓ panel_count column added (default: 9)';
  RAISE NOTICE '';
  RAISE NOTICE 'Ready to test in frontend!';
  RAISE NOTICE '============================================';
END $$;
