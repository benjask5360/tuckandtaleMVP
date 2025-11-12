-- ============================================
-- Add panel_count for flexible vignette panel numbers
-- Currently 9 panels (3×3), but future-ready for other layouts
-- ============================================

-- Add panel_count column with default of 9
ALTER TABLE public.content
ADD COLUMN IF NOT EXISTS panel_count integer DEFAULT 9;

-- Add column comment explaining purpose
COMMENT ON COLUMN public.content.panel_count IS
  'Number of panels in vignette story. Currently 9 (3×3 grid), but flexible for future layouts (e.g., 4=2×2, 6=2×3, 12=3×4).';

-- Add check constraint to ensure valid panel counts
ALTER TABLE public.content
ADD CONSTRAINT content_panel_count_check
CHECK (panel_count IS NULL OR (panel_count >= 1 AND panel_count <= 16));

-- Update existing vignette stories to have panel_count = 9
UPDATE public.content
SET panel_count = 9
WHERE content_type = 'vignette_story' AND panel_count IS NULL;

-- Summary
DO $$
DECLARE
  updated_count integer;
BEGIN
  SELECT COUNT(*) INTO updated_count
  FROM public.content
  WHERE content_type = 'vignette_story';

  RAISE NOTICE '============================================';
  RAISE NOTICE 'Added panel_count field!';
  RAISE NOTICE '============================================';
  RAISE NOTICE 'Default: 9 panels (3×3 grid)';
  RAISE NOTICE 'Range: 1-16 panels allowed';
  RAISE NOTICE '';
  RAISE NOTICE 'Updated % existing vignette stories', updated_count;
  RAISE NOTICE '';
  RAISE NOTICE 'Future panel layouts:';
  RAISE NOTICE '  4 panels  = 2×2 grid';
  RAISE NOTICE '  6 panels  = 2×3 grid';
  RAISE NOTICE '  9 panels  = 3×3 grid (current)';
  RAISE NOTICE '  12 panels = 3×4 grid';
  RAISE NOTICE '============================================';
END $$;
