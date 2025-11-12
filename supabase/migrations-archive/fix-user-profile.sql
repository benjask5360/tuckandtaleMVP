-- Fix: Add user profile with subscription tier
-- Run this in Supabase SQL Editor

-- First, get the tier ID for the 999 stories tier
DO $$
DECLARE
  tier_id uuid;
  user_id_val uuid := '4832a3ae-0e20-425a-b411-b4c8711b70ec'; -- Your user ID from logs
BEGIN
  -- Get tier with 999 stories
  SELECT id INTO tier_id
  FROM subscription_tiers
  WHERE stories_per_day = 999
  LIMIT 1;

  -- Insert or update user profile
  INSERT INTO user_profiles (id, email, full_name, subscription_tier_id)
  VALUES (
    user_id_val,
    'dev@example.com', -- Replace with your email if needed
    'Dev User',
    tier_id
  )
  ON CONFLICT (id)
  DO UPDATE SET
    subscription_tier_id = tier_id;

  RAISE NOTICE 'User profile updated with tier: %', tier_id;
END $$;

-- Verify it worked
SELECT
  up.id,
  up.email,
  up.full_name,
  st.tier_name,
  st.stories_per_day,
  st.stories_per_month
FROM user_profiles up
LEFT JOIN subscription_tiers st ON up.subscription_tier_id = st.id
WHERE up.id = '4832a3ae-0e20-425a-b411-b4c8711b70ec';
