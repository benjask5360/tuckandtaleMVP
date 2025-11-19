-- Fix search_path security warnings for all functions
-- This prevents search_path injection attacks by explicitly setting the schema

-- 1. get_remaining_regenerations
CREATE OR REPLACE FUNCTION public.get_remaining_regenerations(
  p_user_id UUID,
  p_character_profile_id UUID
)
RETURNS TABLE (
  used INTEGER,
  limit_count INTEGER,
  remaining INTEGER,
  resets_in_days INTEGER
)
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
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
$$;

-- 2. increment_avatar_generation
CREATE OR REPLACE FUNCTION public.increment_avatar_generation(
  p_user_id UUID,
  p_character_profile_id UUID,
  p_ai_config_name TEXT
)
RETURNS BOOLEAN
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
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
$$;

-- 3. increment_generation_usage
CREATE OR REPLACE FUNCTION public.increment_generation_usage(
  p_user_id UUID,
  p_generation_type TEXT,
  p_month_year TEXT,
  p_subscription_tier TEXT DEFAULT 'free'
)
RETURNS VOID
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
DECLARE
  v_today date := CURRENT_DATE;
  v_existing_record record;
BEGIN
  -- Validate generation_type
  IF p_generation_type NOT IN ('story', 'avatar', 'worksheet', 'activity', 'coloring_page') THEN
    RAISE EXCEPTION 'Invalid generation_type: %', p_generation_type;
  END IF;

  -- Try to get existing record
  SELECT * INTO v_existing_record
  FROM public.generation_usage
  WHERE user_id = p_user_id
    AND month_year = p_month_year
    AND generation_type = p_generation_type
  FOR UPDATE; -- Lock for update

  IF FOUND THEN
    -- Check if we need to reset daily count
    IF v_existing_record.last_daily_reset_at < v_today THEN
      -- New day - reset daily count
      UPDATE public.generation_usage
      SET
        daily_count = 1,
        monthly_count = monthly_count + 1,
        last_daily_reset_at = v_today,
        last_generated_at = now(),
        updated_at = now()
      WHERE user_id = p_user_id
        AND month_year = p_month_year
        AND generation_type = p_generation_type;
    ELSE
      -- Same day - increment both
      UPDATE public.generation_usage
      SET
        daily_count = daily_count + 1,
        monthly_count = monthly_count + 1,
        last_generated_at = now(),
        updated_at = now()
      WHERE user_id = p_user_id
        AND month_year = p_month_year
        AND generation_type = p_generation_type;
    END IF;
  ELSE
    -- Create new record
    INSERT INTO public.generation_usage (
      user_id,
      generation_type,
      month_year,
      daily_count,
      monthly_count,
      last_daily_reset_at,
      subscription_tier
    ) VALUES (
      p_user_id,
      p_generation_type,
      p_month_year,
      1,
      1,
      v_today,
      p_subscription_tier
    );
  END IF;
END;
$$;

-- 4. handle_new_user
CREATE OR REPLACE FUNCTION public.handle_new_user()
RETURNS TRIGGER
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
BEGIN
  -- Create user profile with free tier assigned
  INSERT INTO public.user_profiles (
    id,
    email,
    full_name,
    subscription_tier_id,
    subscription_status,
    created_at,
    updated_at
  ) VALUES (
    new.id,
    new.email,
    COALESCE(new.raw_user_meta_data->>'full_name', ''),
    'tier_free',
    'active',
    NOW(),
    NOW()
  );

  RETURN new;
END;
$$;

-- 5. delete_user_safely
CREATE OR REPLACE FUNCTION public.delete_user_safely(p_user_id UUID)
RETURNS BOOLEAN
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
DECLARE
  v_character record;
BEGIN
  -- Step 1: Break circular FK by clearing avatar_cache_id references
  UPDATE public.character_profiles
  SET avatar_cache_id = NULL
  WHERE user_id = p_user_id
    AND avatar_cache_id IS NOT NULL;

  -- Step 2: Now delete the user - cascades will handle the rest
  DELETE FROM auth.users WHERE id = p_user_id;

  -- Step 3: Clean up any orphaned avatar_cache entries
  DELETE FROM public.avatar_cache
  WHERE character_profile_id IS NULL
    AND created_at < (NOW() - INTERVAL '1 hour');

  RETURN TRUE;
EXCEPTION
  WHEN OTHERS THEN
    RAISE WARNING 'Error deleting user %: %', p_user_id, SQLERRM;
    RETURN FALSE;
END;
$$;

-- 6. delete_user_completely
CREATE OR REPLACE FUNCTION public.delete_user_completely(user_id UUID)
RETURNS VOID
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
BEGIN
  -- Delete in correct order to avoid trigger conflicts
  DELETE FROM content_characters WHERE character_profile_id IN (SELECT id FROM character_profiles WHERE user_id = $1);
  DELETE FROM avatar_cache WHERE created_by_user_id = $1;
  DELETE FROM character_profiles WHERE user_id = $1;
  DELETE FROM content WHERE user_id = $1;
  DELETE FROM generation_usage WHERE user_id = $1;
  DELETE FROM api_cost_logs WHERE user_id = $1;
  DELETE FROM user_profiles WHERE id = $1;
  DELETE FROM auth.users WHERE id = $1;
END;
$$;

-- 7. handle_updated_at (trigger function)
CREATE OR REPLACE FUNCTION public.handle_updated_at()
RETURNS TRIGGER
LANGUAGE plpgsql
SET search_path = public
AS $$
BEGIN
  NEW.updated_at = now();
  RETURN NEW;
END;
$$;

-- 8. update_updated_at_column (trigger function)
CREATE OR REPLACE FUNCTION public.update_updated_at_column()
RETURNS TRIGGER
LANGUAGE plpgsql
SET search_path = public
AS $$
BEGIN
  NEW.updated_at = now();
  RETURN NEW;
END;
$$;

-- 9. get_gender_descriptor_for_age
CREATE OR REPLACE FUNCTION public.get_gender_descriptor_for_age(
  p_gender TEXT,
  p_age INTEGER
)
RETURNS TEXT
LANGUAGE plpgsql
STABLE
SET search_path = public
AS $$
DECLARE
  v_rich_description TEXT;
BEGIN
  SELECT rich_description INTO v_rich_description
  FROM public.descriptors_gender
  WHERE simple_term = p_gender
    AND p_age >= min_age
    AND p_age <= max_age
    AND is_active = true
  LIMIT 1;

  RETURN COALESCE(v_rich_description, p_gender);
END;
$$;

-- 10. update_api_prices_updated_at (trigger function)
CREATE OR REPLACE FUNCTION public.update_api_prices_updated_at()
RETURNS TRIGGER
LANGUAGE plpgsql
SET search_path = public
AS $$
BEGIN
  NEW.updated_at = now();
  RETURN NEW;
END;
$$;

-- Add comment explaining the security fix
COMMENT ON FUNCTION public.get_remaining_regenerations IS
  'Returns avatar regeneration limits for a user. Uses SET search_path = public to prevent search_path injection attacks.';

COMMENT ON FUNCTION public.increment_avatar_generation IS
  'Increments avatar generation counter. Uses SET search_path = public to prevent search_path injection attacks.';

COMMENT ON FUNCTION public.increment_generation_usage IS
  'Increments generation usage tracking. Uses SET search_path = public to prevent search_path injection attacks.';

COMMENT ON FUNCTION public.handle_new_user IS
  'Trigger to create user profile on signup. Uses SET search_path = public to prevent search_path injection attacks.';

COMMENT ON FUNCTION public.delete_user_safely IS
  'Safely deletes a user and their data. Uses SET search_path = public to prevent search_path injection attacks.';

COMMENT ON FUNCTION public.delete_user_completely IS
  'Completely removes all user data. Uses SET search_path = public to prevent search_path injection attacks.';
