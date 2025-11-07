-- Hotfix for Avatar Generation Functions
-- Run this in Supabase SQL Editor if you see errors about "cannot cast type interval to integer"

-- Drop and recreate the get_remaining_regenerations function with proper casting
DROP FUNCTION IF EXISTS public.get_remaining_regenerations(UUID, UUID);

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
    v_current_month TEXT;
    v_tier_limit INTEGER;
    v_used_count INTEGER;
    v_days_until_reset INTEGER;
BEGIN
    -- Get current month in YYYY-MM format
    v_current_month := TO_CHAR(CURRENT_DATE, 'YYYY-MM');

    -- Get user's tier limit
    SELECT st.avatar_regenerations_per_month
    INTO v_tier_limit
    FROM public.user_profiles up
    JOIN public.subscription_tiers st ON up.subscription_tier_id = st.id
    WHERE up.id = p_user_id;

    -- Default to free tier if not found
    IF v_tier_limit IS NULL THEN
        v_tier_limit := 1;
    END IF;

    -- Get usage for current month
    SELECT COALESCE(generation_count, 0)
    INTO v_used_count
    FROM public.avatar_generation_usage
    WHERE user_id = p_user_id
      AND character_profile_id = p_character_profile_id
      AND month_year = v_current_month;

    -- Default to 0 if no usage found
    v_used_count := COALESCE(v_used_count, 0);

    -- Calculate days until reset (first day of next month)
    -- Use EXTRACT instead of DATE_PART and explicitly cast to INTEGER
    v_days_until_reset := EXTRACT(DAY FROM (DATE_TRUNC('month', CURRENT_DATE) + INTERVAL '1 month' - CURRENT_DATE))::INTEGER;

    RETURN QUERY SELECT
        v_used_count::INTEGER as used,
        v_tier_limit::INTEGER as limit_count,
        GREATEST(0, v_tier_limit - v_used_count)::INTEGER as remaining,
        v_days_until_reset::INTEGER as resets_in_days;
END;
$$ LANGUAGE plpgsql SECURITY DEFINER;

-- Grant execute permissions
GRANT EXECUTE ON FUNCTION public.get_remaining_regenerations(UUID, UUID) TO authenticated;

SELECT 'Avatar functions hotfix applied successfully!' as status;
