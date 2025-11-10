-- ============================================
-- Add 'story_vignette_scenes' purpose
-- For generating visual scene descriptions with OpenAI
-- ============================================

-- Drop existing constraint
ALTER TABLE public.ai_configs
DROP CONSTRAINT IF EXISTS ai_configs_purpose_check;

-- Add updated constraint with new purpose
ALTER TABLE public.ai_configs
ADD CONSTRAINT ai_configs_purpose_check
CHECK (purpose IN (
  'avatar_generation',
  'story_fun',
  'story_growth',
  'story_illustration',
  'story_vignette_panorama',  -- Leonardo panoramic image generation
  'story_vignette_scenes'      -- OpenAI visual scene descriptions
));

COMMENT ON COLUMN public.ai_configs.purpose IS 'Operation type: avatar_generation, story_fun, story_growth, story_illustration, story_vignette_panorama, or story_vignette_scenes';

-- Insert config for vignette scene generation
INSERT INTO public.ai_configs (
  name,
  purpose,
  provider,
  model_id,
  model_name,
  model_type,
  settings,
  is_active,
  is_default
) VALUES (
  'gpt4.1_vignette_scenes',
  'story_vignette_scenes',
  'openai',
  'gpt-4.1',
  'GPT-4.1 (Vignette Scene Descriptions)',
  'text',
  jsonb_build_object(
    'temperature', 0.8,
    'max_tokens', 2000,
    'top_p', 0.95,
    'presence_penalty', 0.3,
    'frequency_penalty', 0.3
  ),
  true,
  true
)
ON CONFLICT (name) DO UPDATE SET
  settings = EXCLUDED.settings,
  is_active = EXCLUDED.is_active,
  updated_at = now();

-- Summary
DO $$
BEGIN
  RAISE NOTICE '============================================';
  RAISE NOTICE 'Added story_vignette_scenes purpose!';
  RAISE NOTICE '============================================';
  RAISE NOTICE 'This purpose is for generating visual scene';
  RAISE NOTICE 'descriptions with OpenAI that will feed into';
  RAISE NOTICE 'Leonardo for panoramic image generation.';
  RAISE NOTICE '';
  RAISE NOTICE 'Config: gpt4.1_vignette_scenes';
  RAISE NOTICE 'Model: gpt-4.1';
  RAISE NOTICE '============================================';
END $$;
