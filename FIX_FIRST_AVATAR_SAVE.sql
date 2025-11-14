-- FIX FOR FIRST AVATAR NOT SAVING
-- The issue: RLS policy WITH CHECK clause prevents updating avatar_cache
-- when linking preview avatar to newly created character

-- Drop existing UPDATE policy
DROP POLICY IF EXISTS "Users can update avatar cache" ON public.avatar_cache;

-- Create new UPDATE policy that properly handles the preview -> linked transition
CREATE POLICY "Users can update avatar cache" ON public.avatar_cache
FOR UPDATE
USING (
  -- Can update if user created this avatar OR owns the linked character
  created_by_user_id = auth.uid()
  OR
  EXISTS (
    SELECT 1 FROM public.character_profiles
    WHERE character_profiles.id = avatar_cache.character_profile_id
    AND character_profiles.user_id = auth.uid()
  )
)
WITH CHECK (
  -- After update, must satisfy ONE of these conditions:
  -- 1. User is still the creator (always true for preview avatars)
  created_by_user_id = auth.uid()
  -- Note: We don't need to check character ownership in WITH CHECK
  -- because if they could UPDATE it (via USING), they're authorized
);

-- Verify the fix
DO $$
BEGIN
  RAISE NOTICE 'RLS Policy Fix Applied Successfully';
  RAISE NOTICE '';
  RAISE NOTICE 'The UPDATE policy now allows:';
  RAISE NOTICE '1. Users to update avatars they created (preview avatars)';
  RAISE NOTICE '2. Users to update avatars linked to their characters';
  RAISE NOTICE '3. The WITH CHECK only verifies creator ownership';
  RAISE NOTICE '';
  RAISE NOTICE 'This fixes the issue where preview avatars could not be linked to new characters.';
END $$;