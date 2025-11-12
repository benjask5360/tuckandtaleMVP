-- Add AI configuration for OpenAI Vision API (vignette narrative generation)
-- GPT-4o with vision capabilities for analyzing panoramic images and generating story text

-- Update ai_configs purpose constraint to include story_vignette_narratives
-- First, check what existing purposes are in the table
DO $$
DECLARE
  existing_purposes text[];
BEGIN
  -- Get all unique purpose values currently in the table
  SELECT array_agg(DISTINCT purpose) INTO existing_purposes
  FROM public.ai_configs;

  RAISE NOTICE 'Existing purposes in ai_configs: %', existing_purposes;
END $$;

-- Drop the existing constraint
ALTER TABLE public.ai_configs
DROP CONSTRAINT IF EXISTS ai_configs_purpose_check;

-- Add the new constraint with all possible values
-- Include both documented purposes and any that might exist in the table
ALTER TABLE public.ai_configs
ADD CONSTRAINT ai_configs_purpose_check
CHECK (purpose IN (
  'avatar_generation',
  'story_fun',
  'story_growth',
  'story_illustration',
  'story_vignette_panorama',
  'story_vignette_narratives',
  'story_vignette_scenes'  -- Add this in case it exists
));

-- Add OpenAI Vision API pricing (gpt-4o vision)
-- Input: $2.50 per 1M tokens, Output: $10.00 per 1M tokens
-- Images: ~1290 tokens per high-detail image
DO $$
BEGIN
  IF NOT EXISTS (
    SELECT 1 FROM public.api_prices
    WHERE provider = 'openai' AND model_id = 'gpt-4o'
  ) THEN
    INSERT INTO public.api_prices (
      provider,
      model_id,
      input_cost_per_unit,
      output_cost_per_unit,
      unit_type,
      notes
    ) VALUES (
      'openai',
      'gpt-4o',
      0.0000025,  -- $2.50 per 1M input tokens
      0.00001,    -- $10.00 per 1M output tokens
      'token',
      'GPT-4o with vision - $2.50/1M input tokens, $10/1M output tokens. Images: ~1290 tokens (high detail)'
    );
  ELSE
    UPDATE public.api_prices
    SET input_cost_per_unit = 0.0000025,
        output_cost_per_unit = 0.00001,
        unit_type = 'token',
        notes = 'GPT-4o with vision - $2.50/1M input tokens, $10/1M output tokens. Images: ~1290 tokens (high detail)'
    WHERE provider = 'openai' AND model_id = 'gpt-4o';
  END IF;
END $$;

-- Add GPT-4o Vision configuration for vignette narrative generation
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
  'openai_gpt4o_vision_vignette_narratives',
  'story_vignette_narratives',
  'openai',
  'gpt-4o',
  'GPT-4o with Vision',
  'text',
  jsonb_build_object(
    'temperature', 0.8,
    'max_tokens', 4000,
    'response_format', jsonb_build_object('type', 'json_object')
  ),
  true,  -- Set as default for vignette narratives
  true   -- Active
)
ON CONFLICT (name) DO UPDATE SET
  is_default = EXCLUDED.is_default,
  is_active = EXCLUDED.is_active,
  settings = EXCLUDED.settings;

-- Display the updated configuration
SELECT
  name,
  provider,
  model_name,
  purpose,
  is_default,
  is_active,
  settings->>'temperature' as temperature,
  settings->>'max_tokens' as max_tokens
FROM public.ai_configs
WHERE purpose = 'story_vignette_narratives'
ORDER BY is_default DESC, provider;
