-- Assign free tier to new users automatically
-- This ensures all users have a subscription tier from the start

-- First, update existing users without a subscription tier to the free tier
UPDATE public.user_profiles
SET subscription_tier_id = (
  SELECT id FROM public.subscription_tiers WHERE tier_name = 'free' LIMIT 1
)
WHERE subscription_tier_id IS NULL;

-- Update the handle_new_user function to automatically assign the free tier
CREATE OR REPLACE FUNCTION public.handle_new_user()
RETURNS trigger AS $$
DECLARE
  free_tier_id uuid;
BEGIN
  -- Get the free tier ID
  SELECT id INTO free_tier_id
  FROM public.subscription_tiers
  WHERE tier_name = 'free'
  LIMIT 1;

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
    free_tier_id,  -- Assign free tier by default
    'free',        -- Set status to 'free'
    now(),
    now()
  );

  RETURN new;
END;
$$ LANGUAGE plpgsql SECURITY DEFINER;
