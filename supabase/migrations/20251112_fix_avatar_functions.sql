-- Fix Avatar Generation Functions
-- Corrects column reference from st.name to st.tier_name

-- Drop and recreate get_remaining_regenerations function
DROP FUNCTION IF EXISTS public.get_remaining_regenerations(UUID, UUID);

CREATE OR REPLACE FUNCTION public.get_remaining_regenerations(
    p_user_id UUID,
    p_character_profile_id UUID
) RETURNS TABLE (
    used INTEGER,
    limit_count INTEGER,
    remaining INTEGER,
    resets_in_days INTEGER
) AS $$
DECLARE
    v_month_year TEXT;
    v_used INTEGER;
    v_tier TEXT;
    v_limit INTEGER;
    v_days_until_reset INTEGER;
BEGIN
    -- Get current month
    v_month_year := TO_CHAR(CURRENT_DATE, 'YYYY-MM');

    -- Get user's current tier - FIXED: use tier_name instead of name
    SELECT st.tier_name INTO v_tier
    FROM public.user_profiles up
    JOIN public.subscription_tiers st ON up.subscription_tier_id = st.id
    WHERE up.id = p_user_id;

    -- Get tier's limit - FIXED: use tier_name instead of name
    SELECT avatar_regenerations_per_month INTO v_limit
    FROM public.subscription_tiers
    WHERE tier_name = v_tier;

    -- Get usage for current month
    SELECT COALESCE(generation_count, 0) INTO v_used
    FROM public.avatar_generation_usage
    WHERE user_id = p_user_id
    AND character_profile_id = p_character_profile_id
    AND month_year = v_month_year;

    -- Calculate days until month reset - FIXED: use EXTRACT instead of DATE_PART
    v_days_until_reset := EXTRACT(DAY FROM (
        DATE_TRUNC('month', CURRENT_DATE) + INTERVAL '1 month' - CURRENT_DATE
    ))::INTEGER;

    RETURN QUERY
    SELECT
        COALESCE(v_used, 0),
        COALESCE(v_limit, 1),
        GREATEST(0, COALESCE(v_limit, 1) - COALESCE(v_used, 0)),
        v_days_until_reset;
END;
$$ LANGUAGE plpgsql STABLE SECURITY DEFINER;

-- Drop and recreate increment_avatar_generation function
DROP FUNCTION IF EXISTS public.increment_avatar_generation(UUID, UUID, TEXT);

CREATE OR REPLACE FUNCTION public.increment_avatar_generation(
    p_user_id UUID,
    p_character_profile_id UUID,
    p_ai_config_name TEXT
) RETURNS BOOLEAN AS $$
DECLARE
    v_month_year TEXT;
    v_tier TEXT;
    v_current_count INTEGER;
    v_limit INTEGER;
BEGIN
    -- Get current month
    v_month_year := TO_CHAR(CURRENT_DATE, 'YYYY-MM');

    -- Get user's current tier - FIXED: use tier_name instead of name
    SELECT st.tier_name INTO v_tier
    FROM public.user_profiles up
    JOIN public.subscription_tiers st ON up.subscription_tier_id = st.id
    WHERE up.id = p_user_id;

    -- Get tier's limit - FIXED: use tier_name instead of name
    SELECT avatar_regenerations_per_month INTO v_limit
    FROM public.subscription_tiers
    WHERE tier_name = v_tier;

    -- Insert or update usage
    INSERT INTO public.avatar_generation_usage (
        user_id,
        character_profile_id,
        month_year,
        generation_count,
        subscription_tier,
        ai_config_name,
        last_generated_at
    ) VALUES (
        p_user_id,
        p_character_profile_id,
        v_month_year,
        1,
        v_tier,
        p_ai_config_name,
        NOW()
    )
    ON CONFLICT (user_id, character_profile_id, month_year)
    DO UPDATE SET
        generation_count = avatar_generation_usage.generation_count + 1,
        last_generated_at = NOW(),
        ai_config_name = p_ai_config_name,
        updated_at = NOW()
    RETURNING generation_count INTO v_current_count;

    -- Return true if within limits
    RETURN v_current_count <= v_limit;
END;
$$ LANGUAGE plpgsql SECURITY DEFINER;

-- Grant execute permissions
GRANT EXECUTE ON FUNCTION public.get_remaining_regenerations(UUID, UUID) TO authenticated;
GRANT EXECUTE ON FUNCTION public.increment_avatar_generation(UUID, UUID, TEXT) TO authenticated;

SELECT 'Avatar functions fixed successfully!' as status;
