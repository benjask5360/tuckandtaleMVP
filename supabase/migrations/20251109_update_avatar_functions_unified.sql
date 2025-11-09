-- Update Avatar Generation Functions to Use Unified generation_usage Table
-- Replaces per-character tracking with per-user monthly tracking

-- ============================================================================
-- 1. UPDATE increment_avatar_generation FUNCTION
-- ============================================================================
-- Use unified increment_generation_usage function instead

CREATE OR REPLACE FUNCTION public.increment_avatar_generation(
  p_user_id uuid,
  p_character_profile_id uuid,
  p_ai_config_name text
)
RETURNS boolean
LANGUAGE plpgsql
SECURITY DEFINER
AS $$
DECLARE
  v_month_year text;
  v_subscription_tier text;
BEGIN
  -- Get current month-year
  v_month_year := TO_CHAR(CURRENT_DATE, 'YYYY-MM');

  -- Get user's subscription tier
  SELECT st.tier_name INTO v_subscription_tier
  FROM public.user_profiles up
  JOIN public.subscription_tiers st ON up.subscription_tier_id = st.id
  WHERE up.id = p_user_id;

  IF v_subscription_tier IS NULL THEN
    v_subscription_tier := 'free';
  END IF;

  -- Call unified increment function
  PERFORM public.increment_generation_usage(
    p_user_id,
    'avatar',
    v_month_year,
    v_subscription_tier
  );

  RETURN true;
EXCEPTION
  WHEN OTHERS THEN
    RAISE WARNING 'Error incrementing avatar usage: %', SQLERRM;
    RETURN false;
END;
$$;

COMMENT ON FUNCTION public.increment_avatar_generation IS 'Increments avatar generation count using unified generation_usage table';

-- ============================================================================
-- 2. UPDATE get_remaining_regenerations FUNCTION
-- ============================================================================
-- Calculate remaining based on unified generation_usage table

CREATE OR REPLACE FUNCTION public.get_remaining_regenerations(
  p_user_id uuid,
  p_character_profile_id uuid
)
RETURNS TABLE (
  used integer,
  limit_count integer,
  remaining integer,
  resets_in_days integer
)
LANGUAGE plpgsql
SECURITY DEFINER
AS $$
DECLARE
  v_month_year text;
  v_monthly_limit integer;
  v_used integer;
  v_days_until_reset integer;
BEGIN
  -- Get current month-year
  v_month_year := TO_CHAR(CURRENT_DATE, 'YYYY-MM');

  -- Get user's monthly limit from subscription tier
  SELECT st.avatars_per_month INTO v_monthly_limit
  FROM public.user_profiles up
  JOIN public.subscription_tiers st ON up.subscription_tier_id = st.id
  WHERE up.id = p_user_id;

  -- Default to 1 if not found or NULL (unlimited becomes NULL)
  IF v_monthly_limit IS NULL THEN
    -- Check if this is truly unlimited or just missing data
    IF EXISTS (
      SELECT 1 FROM public.user_profiles up
      JOIN public.subscription_tiers st ON up.subscription_tier_id = st.id
      WHERE up.id = p_user_id AND st.tier_name = 'supernova'
    ) THEN
      v_monthly_limit := 999; -- Effectively unlimited
    ELSE
      v_monthly_limit := 1; -- Default free tier
    END IF;
  END IF;

  -- Get current usage from unified table
  SELECT COALESCE(monthly_count, 0) INTO v_used
  FROM public.generation_usage
  WHERE user_id = p_user_id
    AND generation_type = 'avatar'
    AND month_year = v_month_year;

  IF v_used IS NULL THEN
    v_used := 0;
  END IF;

  -- Calculate days until next month
  v_days_until_reset := DATE_PART('day',
    DATE_TRUNC('month', CURRENT_DATE) + INTERVAL '1 month' - CURRENT_DATE
  )::integer;

  -- Return results
  RETURN QUERY SELECT
    v_used,
    v_monthly_limit,
    GREATEST(0, v_monthly_limit - v_used) as remaining,
    v_days_until_reset;
END;
$$;

COMMENT ON FUNCTION public.get_remaining_regenerations IS 'Gets remaining avatar regenerations from unified generation_usage table';

-- ============================================================================
-- MIGRATION COMPLETE
-- ============================================================================

DO $$
BEGIN
  RAISE NOTICE '===========================================';
  RAISE NOTICE 'Avatar functions updated successfully!';
  RAISE NOTICE '===========================================';
  RAISE NOTICE 'Updated functions:';
  RAISE NOTICE '  ✓ increment_avatar_generation (now uses unified table)';
  RAISE NOTICE '  ✓ get_remaining_regenerations (now uses unified table)';
  RAISE NOTICE '';
  RAISE NOTICE 'Avatar tracking now uses:';
  RAISE NOTICE '  - generation_usage table (unified tracking)';
  RAISE NOTICE '  - api_cost_logs (cost tracking)';
  RAISE NOTICE '===========================================';
END $$;
