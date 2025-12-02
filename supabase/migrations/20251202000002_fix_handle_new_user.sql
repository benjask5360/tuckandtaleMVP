-- Fix handle_new_user to include new pricing model columns
-- Ensures new users get proper defaults for story tracking

CREATE OR REPLACE FUNCTION public.handle_new_user()
RETURNS trigger
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
BEGIN
  INSERT INTO public.user_profiles (
    id,
    email,
    full_name,
    subscription_tier_id,
    subscription_status,
    terms_accepted_at,
    privacy_accepted_at,
    -- New pricing model columns with defaults
    total_stories_generated,
    free_trial_used,
    generation_credits,
    created_at,
    updated_at
  ) VALUES (
    new.id,
    new.email,
    COALESCE(new.raw_user_meta_data->>'full_name', ''),
    'tier_free',
    'free',  -- Changed from 'active' to 'free' for non-subscribers
    CASE
      WHEN new.raw_user_meta_data->>'terms_accepted_at' IS NOT NULL
      THEN (new.raw_user_meta_data->>'terms_accepted_at')::timestamp with time zone
      ELSE NULL
    END,
    CASE
      WHEN new.raw_user_meta_data->>'privacy_accepted_at' IS NOT NULL
      THEN (new.raw_user_meta_data->>'privacy_accepted_at')::timestamp with time zone
      ELSE NULL
    END,
    -- Set explicit defaults for new pricing columns
    0,      -- total_stories_generated
    false,  -- free_trial_used
    0,      -- generation_credits
    NOW(),
    NOW()
  );
  RETURN new;
END;
$$;

COMMENT ON FUNCTION public.handle_new_user IS
'Trigger function to create user profile with proper defaults for new pricing model';
