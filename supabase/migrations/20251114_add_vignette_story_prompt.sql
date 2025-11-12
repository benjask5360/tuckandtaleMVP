-- ============================================
-- Add Vignette Story Prompt Field
-- ============================================
-- This migration adds the vignette_story_prompt column to store
-- the complete OpenAI Vision API prompt (system + user prompts)
-- that generates panel narratives from the panoramic image

-- Add the new column for Vision API prompt
ALTER TABLE public.content
ADD COLUMN IF NOT EXISTS vignette_story_prompt text;

-- Update column comment to explain its purpose
COMMENT ON COLUMN public.content.vignette_story_prompt IS 'Complete OpenAI Vision API prompt (system + user) for generating panel narratives from panoramic image (Call #3)';

-- Update the existing comments for clarity
COMMENT ON COLUMN public.content.vignette_helper_prompt IS 'OpenAI prompt for generating visual scene descriptions for Leonardo (Call #1)';
COMMENT ON COLUMN public.content.vignette_prompt IS 'Leonardo.ai prompt for generating panoramic storyboard image (Call #2)';

-- Summary
DO $$
BEGIN
  RAISE NOTICE '============================================';
  RAISE NOTICE 'Added Vignette Story Prompt Field';
  RAISE NOTICE '============================================';
  RAISE NOTICE 'New field:';
  RAISE NOTICE '  - vignette_story_prompt: Complete Vision API prompt for panel narratives';
  RAISE NOTICE '';
  RAISE NOTICE 'Complete prompt sequence:';
  RAISE NOTICE '  1. vignette_helper_prompt: OpenAI generates Leonardo prompt';
  RAISE NOTICE '  2. vignette_prompt: Leonardo generates panoramic image';
  RAISE NOTICE '  3. vignette_story_prompt: OpenAI Vision analyzes image + generates narratives';
  RAISE NOTICE '============================================';
END $$;
