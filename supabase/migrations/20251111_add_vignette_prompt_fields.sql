-- ============================================
-- Add Dedicated Vignette Prompt Fields
-- ============================================

-- Add two new prompt fields for vignette generation
ALTER TABLE public.content
ADD COLUMN IF NOT EXISTS vignette_helper_prompt text,
ADD COLUMN IF NOT EXISTS vignette_prompt text;

-- Add comments explaining each field
COMMENT ON COLUMN public.content.vignette_helper_prompt IS 'OpenAI prompt for generating visual scene descriptions (Call #1)';
COMMENT ON COLUMN public.content.vignette_prompt IS 'Leonardo prompt for generating panoramic storyboard image (Call #2)';
COMMENT ON COLUMN public.content.generation_prompt IS 'Future: OpenAI prompt for generating final narrative story from sliced images (Call #3)';

-- Summary
DO $$
BEGIN
  RAISE NOTICE '============================================';
  RAISE NOTICE 'Added Vignette Prompt Fields to Content Table';
  RAISE NOTICE '============================================';
  RAISE NOTICE 'New fields:';
  RAISE NOTICE '  - vignette_helper_prompt: OpenAI scene descriptions';
  RAISE NOTICE '  - vignette_prompt: Leonardo panoramic image';
  RAISE NOTICE '  - generation_prompt: (existing) Future story from images';
  RAISE NOTICE '============================================';
END $$;
