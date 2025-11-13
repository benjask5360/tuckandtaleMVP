-- Fix avatar_cache.created_by_user_id foreign key constraint
-- This column was added without ON DELETE CASCADE, blocking user deletion

-- Drop the existing constraint
ALTER TABLE public.avatar_cache
  DROP CONSTRAINT IF EXISTS avatar_cache_created_by_user_id_fkey;

-- Recreate with CASCADE
ALTER TABLE public.avatar_cache
  ADD CONSTRAINT avatar_cache_created_by_user_id_fkey
  FOREIGN KEY (created_by_user_id)
  REFERENCES auth.users(id)
  ON DELETE CASCADE;

COMMENT ON CONSTRAINT avatar_cache_created_by_user_id_fkey ON public.avatar_cache IS
  'CASCADE delete: When user is deleted, preview avatars they created are also deleted';

-- Verification
DO $$
BEGIN
  RAISE NOTICE '===========================================';
  RAISE NOTICE 'Fixed avatar_cache.created_by_user_id constraint';
  RAISE NOTICE '===========================================';
  RAISE NOTICE 'Users can now be deleted from Supabase auth panel';
  RAISE NOTICE '===========================================';
END $$;