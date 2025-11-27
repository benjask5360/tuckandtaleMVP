-- Migration: Add GPT-4o-mini as default for Fun stories (faster generation)
-- Growth stories keep existing GPT-4o model for quality

-- 1. Unset default on existing story_fun config only
UPDATE ai_configs
SET is_default = false
WHERE purpose = 'story_fun' AND is_default = true;

-- 2. Add GPT-4o-mini for story_fun as the new default
INSERT INTO ai_configs (name, purpose, provider, model_id, model_name, model_type, settings, is_active, is_default)
VALUES (
  'GPT-4o-mini Story Fun',
  'story_fun',
  'openai',
  'gpt-4o-mini',
  'GPT-4o Mini',
  'text',
  '{"max_tokens": 2500, "temperature": 0.8, "top_p": 1.0, "frequency_penalty": 0.3, "presence_penalty": 0.3}'::jsonb,
  true,
  true
);

-- 3. Add pricing for GPT-4o-mini (if not exists)
INSERT INTO api_prices (provider, model_id, input_cost_per_unit, output_cost_per_unit, unit_type)
SELECT 'openai', 'gpt-4o-mini', 0.00000015, 0.0000006, 'token'
WHERE NOT EXISTS (
  SELECT 1 FROM api_prices WHERE provider = 'openai' AND model_id = 'gpt-4o-mini'
);
