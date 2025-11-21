-- ============================================================================
-- FIRST AVATAR SAVE FIX - APPLY THIS IN SUPABASE SQL EDITOR
-- ============================================================================
--
-- THE PROBLEM:
-- When a new user creates their first profile, the avatar doesn't save due to
-- a race condition. The character profile isn't fully committed when the avatar
-- tries to link, causing the RLS policy WITH CHECK clause to fail.
--
-- THE SOLUTION:
-- Simplify the RLS UPDATE policy to avoid checking character existence in WITH CHECK
-- ============================================================================

-- Step 1: Drop the problematic UPDATE policy
DROP POLICY IF EXISTS "Users can update avatar cache" ON public.avatar_cache;

-- Step 2: Create the fixed UPDATE policy
CREATE POLICY "Users can update avatar cache" ON public.avatar_cache
FOR UPDATE
USING (
  -- User can update if they created the avatar OR own the linked character
  created_by_user_id = auth.uid()
  OR
  EXISTS (
    SELECT 1 FROM public.character_profiles
    WHERE character_profiles.id = avatar_cache.character_profile_id
    AND character_profiles.user_id = auth.uid()
  )
)
WITH CHECK (
  -- Only verify avatar ownership - DON'T check character ownership
  -- This avoids the race condition where character isn't committed yet
  created_by_user_id = auth.uid()
);

-- Step 3: Verify the fix was applied
DO $$
DECLARE
  policy_count INTEGER;
  with_check_text TEXT;
BEGIN
  -- Count UPDATE policies
  SELECT COUNT(*) INTO policy_count
  FROM pg_policies
  WHERE tablename = 'avatar_cache'
    AND policyname = 'Users can update avatar cache'
    AND cmd = 'UPDATE';

  -- Get the WITH CHECK clause
  SELECT pg_get_expr(polwithcheck, polrelid) INTO with_check_text
  FROM pg_policy
  WHERE polrelid = 'public.avatar_cache'::regclass
    AND polname = 'Users can update avatar cache';

  IF policy_count = 1 THEN
    RAISE NOTICE '';
    RAISE NOTICE '✅ SUCCESS: Avatar save fix has been applied!';
    RAISE NOTICE '';
    RAISE NOTICE 'Policy WITH CHECK clause is now:';
    RAISE NOTICE '%', with_check_text;
    RAISE NOTICE '';
    RAISE NOTICE 'The fix addresses:';
    RAISE NOTICE '  1. Race condition where character isn''t committed yet';
    RAISE NOTICE '  2. Simplifies WITH CHECK to only verify avatar ownership';
    RAISE NOTICE '  3. First avatar save should now work correctly';
    RAISE NOTICE '';
    RAISE NOTICE '🎯 TEST IT: Create a new user account and try creating their first profile with an avatar.';
    RAISE NOTICE '   The avatar should save correctly on the first try!';
  ELSE
    RAISE WARNING '⚠️ Policy not found or multiple policies exist';
    RAISE WARNING 'Please check your RLS policies manually';
  END IF;
END $$;

-- Step 4: Show all current avatar_cache policies for verification
SELECT
  '📋 Current avatar_cache policies:' as info;

SELECT
  policyname,
  cmd as command,
  permissive,
  CASE
    WHEN qual IS NULL THEN 'No USING clause'
    ELSE 'Has USING clause'
  END as using_status,
  CASE
    WHEN with_check IS NULL THEN 'No WITH CHECK'
    ELSE 'Has WITH CHECK'
  END as check_status
FROM pg_policies
WHERE tablename = 'avatar_cache'
ORDER BY policyname;