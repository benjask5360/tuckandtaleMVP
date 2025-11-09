-- Add actual_cost_usd column to api_cost_logs
-- This stores the calculated USD cost based on actual_cost * api_prices.cost_per_unit

ALTER TABLE public.api_cost_logs
ADD COLUMN IF NOT EXISTS actual_cost_usd decimal(10, 6);

COMMENT ON COLUMN public.api_cost_logs.actual_cost_usd IS 'Actual cost in USD calculated from actual_cost * api_prices.cost_per_unit';

-- Add index for cost queries
CREATE INDEX IF NOT EXISTS idx_api_cost_logs_actual_cost_usd
ON public.api_cost_logs(actual_cost_usd)
WHERE actual_cost_usd IS NOT NULL;

-- Log completion
DO $$
BEGIN
  RAISE NOTICE '============================================';
  RAISE NOTICE 'Added actual_cost_usd column to api_cost_logs!';
  RAISE NOTICE '============================================';
  RAISE NOTICE 'New column:';
  RAISE NOTICE '  ✓ actual_cost_usd (decimal) - Real USD cost';
  RAISE NOTICE '';
  RAISE NOTICE 'Existing columns for comparison:';
  RAISE NOTICE '  ✓ actual_cost (decimal) - Cost from API (credits/tokens)';
  RAISE NOTICE '  ✓ estimated_cost (decimal) - Fallback from ai_configs';
  RAISE NOTICE '============================================';
END $$;
