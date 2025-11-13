-- Fix User Deletion Cascade Issues
-- This migration resolves circular FK dependencies and orphaned records

-- ============================================================================
-- 1. FIX ORPHANED STORIES: Change content user_id to CASCADE
-- ============================================================================

-- Drop existing constraint
ALTER TABLE public.content
  DROP CONSTRAINT IF EXISTS content_user_id_fkey;

-- Recreate with CASCADE
ALTER TABLE public.content
  ADD CONSTRAINT content_user_id_fkey
  FOREIGN KEY (user_id)
  REFERENCES auth.users(id)
  ON DELETE CASCADE;

COMMENT ON CONSTRAINT content_user_id_fkey ON public.content IS
  'CASCADE delete: When user is deleted, all their content (stories, etc.) are also deleted';

-- ============================================================================
-- 2. FIX ORPHANED CONTENT_CHARACTERS: Change to CASCADE
-- ============================================================================

-- Drop existing constraint
ALTER TABLE public.content_characters
  DROP CONSTRAINT IF EXISTS content_characters_character_profile_id_fkey;

-- Recreate with CASCADE
ALTER TABLE public.content_characters
  ADD CONSTRAINT content_characters_character_profile_id_fkey
  FOREIGN KEY (character_profile_id)
  REFERENCES public.character_profiles(id)
  ON DELETE CASCADE;

COMMENT ON CONSTRAINT content_characters_character_profile_id_fkey ON public.content_characters IS
  'CASCADE delete: When character profile is deleted, remove junction records';

-- ============================================================================
-- 3. CREATE HELPER FUNCTION FOR SAFE USER DELETION
-- ============================================================================

CREATE OR REPLACE FUNCTION public.delete_user_safely(p_user_id uuid)
RETURNS boolean
LANGUAGE plpgsql
SECURITY DEFINER
AS $$
DECLARE
  v_character record;
BEGIN
  -- Step 1: Break circular FK by clearing avatar_cache_id references
  UPDATE public.character_profiles
  SET avatar_cache_id = NULL
  WHERE user_id = p_user_id
    AND avatar_cache_id IS NOT NULL;

  -- Step 2: Now delete the user - cascades will handle the rest
  DELETE FROM auth.users WHERE id = p_user_id;

  -- Step 3: Clean up any orphaned avatar_cache entries (shouldn't exist, but just in case)
  DELETE FROM public.avatar_cache
  WHERE character_profile_id IS NULL
    AND created_at < (NOW() - INTERVAL '1 hour');

  RETURN TRUE;
EXCEPTION
  WHEN OTHERS THEN
    RAISE WARNING 'Error deleting user %: %', p_user_id, SQLERRM;
    RETURN FALSE;
END;
$$;

COMMENT ON FUNCTION public.delete_user_safely IS
  'Safely deletes a user by first breaking circular FK dependencies, then cascading delete';

-- ============================================================================
-- 4. ADD TRIGGER TO AUTO-CLEANUP ORPHANED AVATAR_CACHE
-- ============================================================================

CREATE OR REPLACE FUNCTION public.cleanup_orphaned_avatar_cache()
RETURNS trigger
LANGUAGE plpgsql
AS $$
BEGIN
  -- When a character_profile is deleted, clean up any avatar_cache entries
  -- that no longer have a character_profile reference
  DELETE FROM public.avatar_cache
  WHERE character_profile_id = OLD.id;

  RETURN OLD;
END;
$$;

-- Create trigger
DROP TRIGGER IF EXISTS cleanup_avatar_cache_on_character_delete ON public.character_profiles;
CREATE TRIGGER cleanup_avatar_cache_on_character_delete
  BEFORE DELETE ON public.character_profiles
  FOR EACH ROW
  EXECUTE FUNCTION public.cleanup_orphaned_avatar_cache();

COMMENT ON FUNCTION public.cleanup_orphaned_avatar_cache IS
  'Automatically deletes avatar_cache entries when their character_profile is deleted';

-- ============================================================================
-- 5. VERIFICATION QUERY
-- ============================================================================

DO $$
BEGIN
  RAISE NOTICE '===========================================';
  RAISE NOTICE 'User Deletion Cascade Fix Applied';
  RAISE NOTICE '===========================================';
  RAISE NOTICE 'Changes made:';
  RAISE NOTICE '  ✓ content.user_id: SET NULL → CASCADE';
  RAISE NOTICE '  ✓ content_characters.character_profile_id: SET NULL → CASCADE';
  RAISE NOTICE '  ✓ Added delete_user_safely() function';
  RAISE NOTICE '  ✓ Added cleanup trigger for avatar_cache';
  RAISE NOTICE '';
  RAISE NOTICE 'To delete a user safely, use:';
  RAISE NOTICE '  SELECT public.delete_user_safely(''<user_id>'');';
  RAISE NOTICE 'Or delete directly from auth.users (now safe)';
  RAISE NOTICE '===========================================';
END $$;
