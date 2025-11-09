-- ============================================
-- Token Tracking Migrations
-- Run this in Supabase SQL Editor
-- ============================================

-- MIGRATION 1: Add token breakdown columns to api_cost_logs
-- ============================================

ALTER TABLE public.api_cost_logs
ADD COLUMN IF NOT EXISTS prompt_tokens integer,
ADD COLUMN IF NOT EXISTS completion_tokens integer;

COMMENT ON COLUMN public.api_cost_logs.prompt_tokens IS 'Input tokens used (OpenAI) - priced at $2.50/1M';
COMMENT ON COLUMN public.api_cost_logs.completion_tokens IS 'Output tokens used (OpenAI) - priced at $10.00/1M';
COMMENT ON COLUMN public.api_cost_logs.total_tokens IS 'Total tokens/credits used (sum or provider-specific)';

CREATE INDEX IF NOT EXISTS idx_api_cost_logs_tokens
ON public.api_cost_logs(prompt_tokens, completion_tokens)
WHERE prompt_tokens IS NOT NULL;

-- MIGRATION 2: Add model column and separate input/output pricing
-- ============================================

-- Drop unique constraint on provider to allow multiple models per provider
ALTER TABLE public.api_prices DROP CONSTRAINT IF EXISTS api_prices_provider_key;

-- Add model column and new pricing columns
ALTER TABLE public.api_prices
ADD COLUMN IF NOT EXISTS model_id text,
ADD COLUMN IF NOT EXISTS input_cost_per_unit decimal(10, 10),
ADD COLUMN IF NOT EXISTS output_cost_per_unit decimal(10, 10);

COMMENT ON COLUMN public.api_prices.model_id IS 'Model identifier (e.g., gpt-4o, gpt-4o-mini). NULL for provider-level pricing (Leonardo)';
COMMENT ON COLUMN public.api_prices.cost_per_unit IS 'Single cost per unit (for Leonardo credits)';
COMMENT ON COLUMN public.api_prices.input_cost_per_unit IS 'Cost per input token (for OpenAI/Anthropic models)';
COMMENT ON COLUMN public.api_prices.output_cost_per_unit IS 'Cost per output token (for OpenAI/Anthropic models)';

-- Delete old OpenAI row (we'll add model-specific rows)
DELETE FROM api_prices WHERE provider = 'openai';

-- Insert OpenAI model-specific pricing
-- Pricing source: https://openai.com/api/pricing/
INSERT INTO api_prices (provider, model_id, unit_type, input_cost_per_unit, output_cost_per_unit, notes) VALUES
  ('openai', 'gpt-4o', 'token', 0.0000025, 0.0000100, 'GPT-4o: $2.50/1M input, $10.00/1M output'),
  ('openai', 'gpt-4o-mini', 'token', 0.00000015, 0.00000060, 'GPT-4o-mini: $0.150/1M input, $0.600/1M output'),
  ('openai', 'gpt-4-turbo', 'token', 0.0000100, 0.0000300, 'GPT-4 Turbo: $10.00/1M input, $30.00/1M output');

-- Create unique constraint on provider + model_id (after inserts to avoid conflicts)
CREATE UNIQUE INDEX IF NOT EXISTS api_prices_provider_model_key
ON public.api_prices(provider, COALESCE(model_id, ''));

-- ============================================
-- Summary
-- ============================================

DO $$
BEGIN
  RAISE NOTICE '============================================';
  RAISE NOTICE 'Token Tracking Migrations Complete!';
  RAISE NOTICE '============================================';
  RAISE NOTICE 'Added to api_cost_logs:';
  RAISE NOTICE '  ✓ prompt_tokens (input tokens)';
  RAISE NOTICE '  ✓ completion_tokens (output tokens)';
  RAISE NOTICE '';
  RAISE NOTICE 'Updated api_prices for OpenAI:';
  RAISE NOTICE '  ✓ input_cost_per_unit: $0.0000025';
  RAISE NOTICE '  ✓ output_cost_per_unit: $0.0000100';
  RAISE NOTICE '';
  RAISE NOTICE 'Next story generation will log accurate costs!';
  RAISE NOTICE '============================================';
END $$;
