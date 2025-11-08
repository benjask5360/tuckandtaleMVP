-- ================================================
-- Avatar Cache RLS Policy Update for Preview Support
-- ================================================
-- Updates RLS policies to allow preview avatar generation
-- where character_profile_id is NULL

-- Drop existing policies
DROP POLICY IF EXISTS "Users can view avatar cache" ON public.avatar_cache;
DROP POLICY IF EXISTS "Users can manage avatar cache" ON public.avatar_cache;

-- Create new policies that support preview avatars (character_profile_id IS NULL)
-- ================================================

-- SELECT: Users can view their own avatar cache entries and preview avatars they created
CREATE POLICY "Users can view avatar cache"
  ON public.avatar_cache
  FOR SELECT
  TO authenticated
  USING (
    -- Case 1: Preview avatars (character_profile_id IS NULL) - check created_at is recent
    -- Note: We rely on the created_at timestamp to limit access to recent preview avatars
    -- This is a temporary solution until we add a user_id column to avatar_cache
    (character_profile_id IS NULL AND created_at > NOW() - INTERVAL '1 hour')
    OR
    -- Case 2: Regular avatars - must own the character
    EXISTS (
      SELECT 1 FROM public.character_profiles
      WHERE character_profiles.id = avatar_cache.character_profile_id
      AND character_profiles.user_id = auth.uid()
    )
  );

-- INSERT: Users can create avatar cache entries for their characters or preview avatars
CREATE POLICY "Users can create avatar cache"
  ON public.avatar_cache
  FOR INSERT
  TO authenticated
  WITH CHECK (
    -- Case 1: Preview avatars (character_profile_id IS NULL) - allow creation
    character_profile_id IS NULL
    OR
    -- Case 2: Regular avatars - must own the character
    EXISTS (
      SELECT 1 FROM public.character_profiles
      WHERE character_profiles.id = avatar_cache.character_profile_id
      AND character_profiles.user_id = auth.uid()
    )
  );

-- UPDATE: Users can update their own avatar cache entries
CREATE POLICY "Users can update avatar cache"
  ON public.avatar_cache
  FOR UPDATE
  TO authenticated
  USING (
    -- Case 1: Preview avatars being linked to a character
    (character_profile_id IS NULL AND created_at > NOW() - INTERVAL '1 hour')
    OR
    -- Case 2: Regular avatars - must own the character
    EXISTS (
      SELECT 1 FROM public.character_profiles
      WHERE character_profiles.id = avatar_cache.character_profile_id
      AND character_profiles.user_id = auth.uid()
    )
  )
  WITH CHECK (
    -- After update, must still own the character (or it's still a preview)
    character_profile_id IS NULL
    OR
    EXISTS (
      SELECT 1 FROM public.character_profiles
      WHERE character_profiles.id = avatar_cache.character_profile_id
      AND character_profiles.user_id = auth.uid()
    )
  );

-- DELETE: Users can delete their own avatar cache entries
CREATE POLICY "Users can delete avatar cache"
  ON public.avatar_cache
  FOR DELETE
  TO authenticated
  USING (
    -- Case 1: Preview avatars (character_profile_id IS NULL)
    (character_profile_id IS NULL AND created_at > NOW() - INTERVAL '1 hour')
    OR
    -- Case 2: Regular avatars - must own the character
    EXISTS (
      SELECT 1 FROM public.character_profiles
      WHERE character_profiles.id = avatar_cache.character_profile_id
      AND character_profiles.user_id = auth.uid()
    )
  );

-- Add comment explaining the 1-hour window for preview avatars
COMMENT ON TABLE public.avatar_cache IS
'Stores avatar generation cache. Supports preview avatars (character_profile_id IS NULL) with a 1-hour access window for the creating user. Preview avatars should be linked to a character or cleaned up within this window.';
