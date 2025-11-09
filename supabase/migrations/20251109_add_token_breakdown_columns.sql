-- Add separate token tracking columns for OpenAI
-- This allows accurate cost calculation with different input/output pricing

ALTER TABLE public.api_cost_logs
ADD COLUMN IF NOT EXISTS prompt_tokens integer,
ADD COLUMN IF NOT EXISTS completion_tokens integer;

COMMENT ON COLUMN public.api_cost_logs.prompt_tokens IS 'Input tokens used (OpenAI) - priced at $2.50/1M';
COMMENT ON COLUMN public.api_cost_logs.completion_tokens IS 'Output tokens used (OpenAI) - priced at $10.00/1M';
COMMENT ON COLUMN public.api_cost_logs.total_tokens IS 'Total tokens/credits used (sum or provider-specific)';

-- Create indexes for analytics queries
CREATE INDEX IF NOT EXISTS idx_api_cost_logs_tokens
ON public.api_cost_logs(prompt_tokens, completion_tokens)
WHERE prompt_tokens IS NOT NULL;

-- Log completion
DO $$
BEGIN
  RAISE NOTICE '============================================';
  RAISE NOTICE 'Added token breakdown columns to api_cost_logs';
  RAISE NOTICE '============================================';
  RAISE NOTICE '  ✓ prompt_tokens (input tokens)';
  RAISE NOTICE '  ✓ completion_tokens (output tokens)';
  RAISE NOTICE 'These enable accurate OpenAI cost tracking';
  RAISE NOTICE '============================================';
END $$;
