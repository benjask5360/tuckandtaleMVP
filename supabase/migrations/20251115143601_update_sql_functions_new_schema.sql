-- Update SQL functions to use new subscription_tiers schema

-- 1. Update get_remaining_regenerations function
DROP FUNCTION IF EXISTS public.get_remaining_regenerations(uuid, uuid);

CREATE OR REPLACE FUNCTION public.get_remaining_regenerations(
  p_user_id UUID,
  p_character_profile_id UUID
)
RETURNS TABLE (
  used INTEGER,
  limit_count INTEGER,
  remaining INTEGER,
  resets_in_days INTEGER
) AS $$
DECLARE
  v_month_year TEXT;
  v_monthly_limit INTEGER;
  v_current_usage INTEGER;
  v_subscription_tier TEXT;
BEGIN
  -- Get current month-year
  v_month_year := TO_CHAR(CURRENT_DATE, 'YYYY-MM');

  -- Get user's subscription tier limit from new schema
  SELECT st.avatar_regenerations_month, st.id INTO v_monthly_limit, v_subscription_tier
  FROM public.user_profiles up
  JOIN public.subscription_tiers st ON up.subscription_tier_id = st.id
  WHERE up.id = p_user_id;

  -- If no tier found, throw error (no defaults)
  IF v_monthly_limit IS NULL THEN
    RAISE EXCEPTION 'User subscription tier not found';
  END IF;

  -- Count current month's regenerations for this character from api_cost_logs
  SELECT COUNT(*) INTO v_current_usage
  FROM public.api_cost_logs
  WHERE user_id = p_user_id
    AND character_profile_id = p_character_profile_id
    AND operation = 'avatar_generation'
    AND DATE_TRUNC('month', created_at) = DATE_TRUNC('month', CURRENT_DATE);

  -- Check for unlimited (tier_plus gets high limit)
  IF v_subscription_tier = 'tier_plus' AND v_monthly_limit > 99 THEN
    v_monthly_limit := 999; -- Effectively unlimited
  END IF;

  -- Calculate days until reset (first day of next month)
  RETURN QUERY
  SELECT
    v_current_usage AS used,
    v_monthly_limit AS limit_count,
    GREATEST(0, v_monthly_limit - v_current_usage) AS remaining,
    EXTRACT(DAY FROM (DATE_TRUNC('month', CURRENT_DATE) + INTERVAL '1 month' - CURRENT_DATE))::INTEGER AS resets_in_days;
END;
$$ LANGUAGE plpgsql SECURITY DEFINER;

-- 2. Update increment_avatar_generation function
DROP FUNCTION IF EXISTS public.increment_avatar_generation(uuid, uuid, text);

CREATE OR REPLACE FUNCTION public.increment_avatar_generation(
  p_user_id UUID,
  p_character_profile_id UUID,
  p_ai_config_name TEXT
)
RETURNS BOOLEAN AS $$
DECLARE
  v_month_year TEXT;
  v_subscription_tier TEXT;
BEGIN
  -- Get current month-year
  v_month_year := TO_CHAR(CURRENT_DATE, 'YYYY-MM');

  -- Get user's subscription tier ID from new schema
  SELECT st.id INTO v_subscription_tier
  FROM public.user_profiles up
  JOIN public.subscription_tiers st ON up.subscription_tier_id = st.id
  WHERE up.id = p_user_id;

  IF v_subscription_tier IS NULL THEN
    RAISE EXCEPTION 'User subscription tier not found';
  END IF;

  -- Log the generation in api_cost_logs
  INSERT INTO public.api_cost_logs (
    user_id,
    character_profile_id,
    operation,
    ai_config_name,
    created_at
  ) VALUES (
    p_user_id,
    p_character_profile_id,
    'avatar_generation',
    p_ai_config_name,
    NOW()
  );

  -- Also update generation_usage for tracking
  INSERT INTO public.generation_usage (
    user_id,
    generation_type,
    month_year,
    daily_count,
    monthly_count,
    subscription_tier,
    last_generated_at,
    last_daily_reset_at
  ) VALUES (
    p_user_id,
    'avatar',
    v_month_year,
    1,
    1,
    v_subscription_tier,
    NOW(),
    CURRENT_DATE
  )
  ON CONFLICT (user_id, month_year, generation_type)
  DO UPDATE SET
    daily_count = CASE
      WHEN generation_usage.last_daily_reset_at = CURRENT_DATE THEN generation_usage.daily_count + 1
      ELSE 1
    END,
    monthly_count = generation_usage.monthly_count + 1,
    last_generated_at = NOW(),
    last_daily_reset_at = CURRENT_DATE;

  RETURN TRUE;
END;
$$ LANGUAGE plpgsql SECURITY DEFINER;

-- Grant necessary permissions
GRANT EXECUTE ON FUNCTION public.get_remaining_regenerations(uuid, uuid) TO authenticated;
GRANT EXECUTE ON FUNCTION public.increment_avatar_generation(uuid, uuid, text) TO authenticated;