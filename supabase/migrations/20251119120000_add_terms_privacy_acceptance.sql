-- Add terms and privacy acceptance timestamps to user_profiles
ALTER TABLE public.user_profiles
ADD COLUMN IF NOT EXISTS terms_accepted_at timestamp with time zone,
ADD COLUMN IF NOT EXISTS privacy_accepted_at timestamp with time zone;

-- Update the handle_new_user function to capture terms/privacy acceptance from user metadata
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
    created_at,
    updated_at
  ) VALUES (
    new.id,
    new.email,
    COALESCE(new.raw_user_meta_data->>'full_name', ''),
    'tier_free',
    'active',
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
    NOW(),
    NOW()
  );
  RETURN new;
END;
$$;

-- Add comment for documentation
COMMENT ON COLUMN public.user_profiles.terms_accepted_at IS 'Timestamp when user accepted Terms of Service';
COMMENT ON COLUMN public.user_profiles.privacy_accepted_at IS 'Timestamp when user accepted Privacy Policy';
