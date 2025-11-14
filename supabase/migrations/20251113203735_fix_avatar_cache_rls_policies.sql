-- Fix RLS policies for avatar_cache to allow first-time avatar saves
-- This properly drops ALL existing policies before creating new ones

-- Step 1: Drop ALL existing RLS policies on avatar_cache
DO $$
DECLARE
    policy_rec record;
BEGIN
    -- Find and drop all existing policies
    FOR policy_rec IN
        SELECT policyname
        FROM pg_policies
        WHERE tablename = 'avatar_cache'
        AND schemaname = 'public'
    LOOP
        EXECUTE format('DROP POLICY IF EXISTS %I ON public.avatar_cache', policy_rec.policyname);
        RAISE NOTICE 'Dropped policy: %', policy_rec.policyname;
    END LOOP;
END $$;

-- Step 2: Create new separate policies with proper permissions

-- 1. INSERT: Users can create preview avatars (no character_profile_id yet)
CREATE POLICY "Users can insert avatar cache" ON public.avatar_cache
  FOR INSERT
  WITH CHECK (
    created_by_user_id = auth.uid()
  );

-- 2. SELECT: Users can view avatars they own or that belong to their characters
CREATE POLICY "Users can view avatar cache" ON public.avatar_cache
  FOR SELECT
  USING (
    -- Can view if it belongs to their character
    EXISTS (
      SELECT 1 FROM public.character_profiles
      WHERE character_profiles.id = avatar_cache.character_profile_id
      AND character_profiles.user_id = auth.uid()
    )
    -- OR if they created it (preview avatars)
    OR created_by_user_id = auth.uid()
  );

-- 3. UPDATE: Users can update avatars they own (crucial for linking preview to character)
CREATE POLICY "Users can update avatar cache" ON public.avatar_cache
  FOR UPDATE
  USING (
    -- Can update if it belongs to their character
    EXISTS (
      SELECT 1 FROM public.character_profiles
      WHERE character_profiles.id = avatar_cache.character_profile_id
      AND character_profiles.user_id = auth.uid()
    )
    -- OR if they created it (preview avatars)
    OR created_by_user_id = auth.uid()
  )
  WITH CHECK (
    -- After update, must either:
    -- 1. Still be owned by the user (allows preview->linked transition)
    created_by_user_id = auth.uid()
    -- OR 2. Be linked to a character they own
    OR EXISTS (
      SELECT 1 FROM public.character_profiles
      WHERE character_profiles.id = avatar_cache.character_profile_id
      AND character_profiles.user_id = auth.uid()
    )
  );

-- 4. DELETE: Users can delete avatars they own
CREATE POLICY "Users can delete avatar cache" ON public.avatar_cache
  FOR DELETE
  USING (
    -- Can delete if it belongs to their character
    EXISTS (
      SELECT 1 FROM public.character_profiles
      WHERE character_profiles.id = avatar_cache.character_profile_id
      AND character_profiles.user_id = auth.uid()
    )
    -- OR if they created it (preview avatars)
    OR created_by_user_id = auth.uid()
  );

-- Step 3: Verify the new policies
DO $$
DECLARE
    policy_count integer;
BEGIN
    SELECT COUNT(*) INTO policy_count
    FROM pg_policies
    WHERE tablename = 'avatar_cache'
    AND schemaname = 'public';

    RAISE NOTICE 'Created % RLS policies for avatar_cache', policy_count;

    IF policy_count = 4 THEN
        RAISE NOTICE '✅ All 4 policies created successfully (INSERT, SELECT, UPDATE, DELETE)';
    ELSE
        RAISE WARNING '⚠️ Expected 4 policies but found %', policy_count;
    END IF;
END $$;

-- Add helpful comment
COMMENT ON TABLE public.avatar_cache IS 'Stores generated avatars. Preview avatars have NULL character_profile_id until linked. RLS policies allow first-time avatar saves.';