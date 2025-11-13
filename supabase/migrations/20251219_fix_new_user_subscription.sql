-- Add created_by_user_id column to avatar_cache
ALTER TABLE public.avatar_cache
ADD COLUMN IF NOT EXISTS created_by_user_id uuid REFERENCES auth.users(id);

-- Create index
CREATE INDEX IF NOT EXISTS idx_avatar_cache_created_by_user
ON public.avatar_cache(created_by_user_id)
WHERE character_profile_id IS NULL;

-- Drop existing RLS policies
DROP POLICY IF EXISTS "Users can view avatar cache" ON public.avatar_cache;
DROP POLICY IF EXISTS "Users can manage avatar cache" ON public.avatar_cache;

-- Create new RLS policy for viewing
CREATE POLICY "Users can view avatar cache" ON public.avatar_cache
  FOR SELECT USING (
    EXISTS (
      SELECT 1 FROM public.character_profiles
      WHERE character_profiles.id = avatar_cache.character_profile_id
      AND character_profiles.user_id = auth.uid()
    )
    OR (character_profile_id IS NULL AND created_by_user_id = auth.uid())
  );

-- Create new RLS policy for managing
CREATE POLICY "Users can manage avatar cache" ON public.avatar_cache
  FOR ALL USING (
    EXISTS (
      SELECT 1 FROM public.character_profiles
      WHERE character_profiles.id = avatar_cache.character_profile_id
      AND character_profiles.user_id = auth.uid()
    )
    OR (character_profile_id IS NULL AND created_by_user_id = auth.uid())
  );

-- Update handle_new_user function to assign free tier
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
    free_tier_id,
    'free',
    now(),
    now()
  );

  RETURN new;
END;
$$ LANGUAGE plpgsql SECURITY DEFINER;