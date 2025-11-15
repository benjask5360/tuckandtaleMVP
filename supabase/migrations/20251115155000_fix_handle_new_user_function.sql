-- Fix handle_new_user function to use new tier structure
-- This function is called when a new user signs up

CREATE OR REPLACE FUNCTION public.handle_new_user()
RETURNS TRIGGER
LANGUAGE plpgsql
SECURITY DEFINER
AS $$
BEGIN
  -- Create user profile with free tier assigned
  -- Using the new TEXT-based tier ID directly
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
    'tier_free', -- Use the new TEXT-based free tier ID
    'active',
    NOW(),
    NOW()
  );

  RETURN new;
END;
$$;

-- Ensure the trigger exists (it should already exist, but this is safe to run)
DROP TRIGGER IF EXISTS on_auth_user_created ON auth.users;
CREATE TRIGGER on_auth_user_created
  AFTER INSERT ON auth.users
  FOR EACH ROW EXECUTE FUNCTION public.handle_new_user();

-- Grant necessary permissions
GRANT EXECUTE ON FUNCTION public.handle_new_user() TO service_role;