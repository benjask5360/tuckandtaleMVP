-- Add Google as a provider option to ai_configs table
-- This enables integration with Google Gemini 2.5 Flash Image (Nano Banana)

-- Update ai_configs provider constraint to include 'google'
ALTER TABLE public.ai_configs
DROP CONSTRAINT IF EXISTS ai_configs_provider_check;

ALTER TABLE public.ai_configs
ADD CONSTRAINT ai_configs_provider_check
CHECK (provider IN ('leonardo', 'openai', 'stability', 'midjourney', 'google'));

-- Update api_prices provider constraint to include 'google'
ALTER TABLE public.api_prices
DROP CONSTRAINT IF EXISTS api_prices_provider_check;

ALTER TABLE public.api_prices
ADD CONSTRAINT api_prices_provider_check
CHECK (provider IN ('leonardo', 'openai', 'anthropic', 'google'));

-- Add Google Gemini pricing to api_prices table
-- $30 per 1 million tokens, 1290 tokens per image = $0.0387 per image
-- First check if it exists, if not insert it
DO $$
BEGIN
  IF NOT EXISTS (SELECT 1 FROM public.api_prices WHERE provider = 'google') THEN
    INSERT INTO public.api_prices (provider, cost_per_unit, unit_type, notes)
    VALUES ('google', 0.00003, 'token', 'Google Gemini 2.5 Flash Image - $30/1M tokens, 1290 tokens/image = ~$0.0387/image');
  ELSE
    UPDATE public.api_prices
    SET cost_per_unit = 0.00003,
        unit_type = 'token',
        notes = 'Google Gemini 2.5 Flash Image - $30/1M tokens, 1290 tokens/image = ~$0.0387/image'
    WHERE provider = 'google';
  END IF;
END $$;

-- Add Gemini 2.5 Flash Image configuration for vignette panorama generation
-- Note: Initially set as non-default for testing. Set is_default=true to make it the primary model
INSERT INTO public.ai_configs (
  name,
  purpose,
  provider,
  model_id,
  model_name,
  model_type,
  settings,
  is_default,
  is_active
) VALUES (
  'google_gemini_flash_image_vignette_panorama',
  'story_vignette_panorama',
  'google',
  'gemini-2.5-flash-image',
  'Gemini 2.5 Flash Image (Nano Banana)',
  'image',
  jsonb_build_object(
    'aspectRatio', '1:1',
    'width', 1024,
    'height', 1024,
    'responseModalities', jsonb_build_array('Image')
  ),
  true,  -- Set as default for vignette panorama
  true   -- Active
)
ON CONFLICT (name) DO UPDATE SET
  is_default = EXCLUDED.is_default,
  is_active = EXCLUDED.is_active,
  settings = EXCLUDED.settings;

-- Update Phoenix 1.0 to be non-default (but keep it active as fallback)
UPDATE public.ai_configs
SET is_default = false
WHERE purpose = 'story_vignette_panorama'
  AND provider = 'leonardo'
  AND name = 'leonardo_phoenix_vignette_panorama';

-- Display the updated configurations
SELECT
  name,
  provider,
  model_name,
  is_default,
  is_active,
  settings->>'width' as width,
  settings->>'height' as height
FROM public.ai_configs
WHERE purpose = 'story_vignette_panorama'
ORDER BY is_default DESC, provider;
