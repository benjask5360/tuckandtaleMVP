-- Fix RLS policy for avatar_cache to allow first-time avatar saves
-- The issue: When a new user creates their VERY FIRST child, the avatar doesn't save
-- due to the RLS policy blocking the UPDATE operation when linking preview to character

-- First, drop the existing "FOR ALL" policy
DROP POLICY IF EXISTS "Users can manage avatar cache" ON public.avatar_cache;

-- Create separate policies for better control

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

-- Add helpful comment to the table
COMMENT ON TABLE public.avatar_cache IS 'Stores generated avatars for character profiles. Preview avatars have NULL character_profile_id until linked.';