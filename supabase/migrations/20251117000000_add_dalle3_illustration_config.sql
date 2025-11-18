-- Add OpenAI DALL-E 3 configuration for story illustrations
-- This will replace Google Gemini as the default illustration provider

-- Insert DALL-E 3 AI config
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
  'DALL-E 3 Story Illustration',
  'story_illustration',
  'openai',
  'dall-e-3',
  'DALL-E 3',
  'image',
  jsonb_build_object(
    'size', '1024x1024',
    'quality', 'standard',
    'style', 'vivid'
  ),
  true,
  true
);

-- Deactivate old Gemini config (keep for reference/rollback)
UPDATE public.ai_configs
SET is_default = false, is_active = false
WHERE purpose = 'story_illustration' AND provider = 'google';

-- Add DALL-E 3 pricing entries
-- Note: unit_type must be 'credit' or 'token' per schema constraint
INSERT INTO public.api_prices (
  provider,
  model_id,
  model_type,
  unit_type,
  cost_per_unit,
  notes
) VALUES (
  'openai',
  'dall-e-3',
  'image',
  'credit',
  1.0,
  'DALL-E 3 - Cost is calculated in client and passed directly as actual_cost. Standard: 1024x1024=$0.04, 1792x=$0.08. HD: 1024x1024=$0.08, 1792x=$0.12'
) ON CONFLICT DO NOTHING;

-- Note: The cost_per_unit is 1.0 because we calculate the actual USD cost
-- in the DALL-E client based on size and quality settings, then pass it
-- as actual_cost to the logging function. This differs from token-based
-- models where we multiply tokens by cost_per_unit.
