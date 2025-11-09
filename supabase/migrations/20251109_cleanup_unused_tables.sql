-- Cleanup Unused Tables
-- Removes any orphaned tables that are no longer used

-- Drop generation_costs if it exists (replaced by api_cost_logs)
DROP TABLE IF EXISTS public.generation_costs CASCADE;

-- Log completion
DO $$
BEGIN
  RAISE NOTICE '===========================================';
  RAISE NOTICE 'Cleanup complete!';
  RAISE NOTICE '===========================================';
  RAISE NOTICE 'Removed unused tables:';
  RAISE NOTICE '  ✓ generation_costs (if existed)';
  RAISE NOTICE '';
  RAISE NOTICE 'Current tracking tables:';
  RAISE NOTICE '  - api_cost_logs (all API costs)';
  RAISE NOTICE '  - generation_usage (rate limiting)';
  RAISE NOTICE '===========================================';
END $$;
