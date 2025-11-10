-- ============================================
-- Add Comprehensive OpenAI Model Pricing
-- Adds model_type column and all OpenAI models
-- ============================================

-- Add model_type column to api_prices
ALTER TABLE public.api_prices
ADD COLUMN IF NOT EXISTS model_type text CHECK (model_type IN ('text', 'audio', 'image'));

COMMENT ON COLUMN public.api_prices.model_type IS 'Model type: text, audio, or image';

-- Delete existing OpenAI entries (we'll re-add them with model_type)
DELETE FROM api_prices WHERE provider = 'openai';

-- Insert OpenAI models from user-provided pricing table
-- Source: User-provided pricing data (2025-01-10)

-- TEXT MODELS
INSERT INTO api_prices (provider, model_id, model_type, unit_type, input_cost_per_unit, output_cost_per_unit, notes) VALUES
  ('openai', 'gpt-5', 'text', 'token', 0.00000125, 0.00001000, 'GPT-5: $1.25/1M input, $10.00/1M output'),
  ('openai', 'gpt-4.1', 'text', 'token', 0.00000200, 0.00000800, 'GPT-4.1: $2.00/1M input, $8.00/1M output');

-- IMAGE MODELS
INSERT INTO api_prices (provider, model_id, model_type, unit_type, input_cost_per_unit, output_cost_per_unit, notes) VALUES
  ('openai', 'gpt-image-1', 'image', 'token', 0.00001000, 0.00004000, 'GPT Image 1: $10.00/1M input, $40.00/1M output'),
  ('openai', 'gpt-image-1-mini', 'image', 'token', 0.00000250, 0.00000800, 'GPT Image 1 Mini: $2.50/1M input, $8.00/1M output');

-- AUDIO MODELS
INSERT INTO api_prices (provider, model_id, model_type, unit_type, input_cost_per_unit, output_cost_per_unit, notes) VALUES
  ('openai', 'gpt-realtime', 'audio', 'token', 0.00003200, 0.00006400, 'GPT Realtime: $32.00/1M input, $64.00/1M output'),
  ('openai', 'gpt-realtime-mini', 'audio', 'token', 0.00001000, 0.00002000, 'GPT Realtime Mini: $10.00/1M input, $20.00/1M output');

-- Create index on model_type for faster lookups
CREATE INDEX IF NOT EXISTS idx_api_prices_model_type
ON public.api_prices(model_type)
WHERE model_type IS NOT NULL;

-- ============================================
-- Summary
-- ============================================

DO $$
DECLARE
  text_count integer;
  audio_count integer;
  image_count integer;
BEGIN
  SELECT COUNT(*) INTO text_count FROM api_prices WHERE provider = 'openai' AND model_type = 'text';
  SELECT COUNT(*) INTO audio_count FROM api_prices WHERE provider = 'openai' AND model_type = 'audio';
  SELECT COUNT(*) INTO image_count FROM api_prices WHERE provider = 'openai' AND model_type = 'image';

  RAISE NOTICE '============================================';
  RAISE NOTICE 'OpenAI Model Pricing Migration Complete!';
  RAISE NOTICE '============================================';
  RAISE NOTICE 'Added model_type column to api_prices';
  RAISE NOTICE '';
  RAISE NOTICE 'Inserted % text models', text_count;
  RAISE NOTICE 'Inserted % audio models', audio_count;
  RAISE NOTICE 'Inserted % image models', image_count;
  RAISE NOTICE 'Total: % OpenAI models', text_count + audio_count + image_count;
  RAISE NOTICE '';
  RAISE NOTICE 'Models added:';
  RAISE NOTICE '  Text: gpt-5, gpt-4.1';
  RAISE NOTICE '  Image: gpt-image-1, gpt-image-1-mini';
  RAISE NOTICE '  Audio: gpt-realtime, gpt-realtime-mini';
  RAISE NOTICE '============================================';
END $$;
