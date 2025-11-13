-- Complete User Deletion Fix
-- This ensures ALL tables properly handle user deletion
-- Run this to fix all foreign key constraints at once

-- ============================================================================
-- STEP 1: Find and fix ALL foreign key constraints to auth.users
-- ============================================================================

DO $$
DECLARE
  rec RECORD;
  cmd TEXT;
BEGIN
  RAISE NOTICE '===========================================';
  RAISE NOTICE 'Fixing ALL foreign key constraints to auth.users';
  RAISE NOTICE '===========================================';

  -- Loop through ALL foreign key constraints pointing to auth.users
  FOR rec IN
    SELECT
      c.conname as constraint_name,
      c.conrelid::regclass::text as table_name,
      a.attname as column_name,
      c.confdeltype as current_delete_type
    FROM pg_constraint c
    JOIN pg_attribute a ON a.attnum = ANY(c.conkey) AND a.attrelid = c.conrelid
    WHERE c.confrelid = 'auth.users'::regclass
      AND c.contype = 'f'
      AND c.confdeltype != 'c'  -- Not already CASCADE
  LOOP
    RAISE NOTICE 'Fixing: %.% (constraint: %)', rec.table_name, rec.column_name, rec.constraint_name;

    -- Drop the old constraint
    cmd := format('ALTER TABLE %s DROP CONSTRAINT IF EXISTS %I', rec.table_name, rec.constraint_name);
    EXECUTE cmd;

    -- Recreate with CASCADE
    cmd := format('ALTER TABLE %s ADD CONSTRAINT %I FOREIGN KEY (%I) REFERENCES auth.users(id) ON DELETE CASCADE',
                  rec.table_name, rec.constraint_name, rec.column_name);
    EXECUTE cmd;

    RAISE NOTICE '  ✅ Changed to CASCADE';
  END LOOP;

  RAISE NOTICE '===========================================';
  RAISE NOTICE 'All foreign keys now use CASCADE';
  RAISE NOTICE '===========================================';
END $$;

-- ============================================================================
-- STEP 2: Check storage.objects table (common blocker)
-- ============================================================================

-- Storage objects might have owner constraints
-- Note: We may not have permission to modify storage schema, so we handle it gracefully
DO $$
BEGIN
  -- Check if storage.objects has an owner column
  IF EXISTS (
    SELECT 1
    FROM information_schema.columns
    WHERE table_schema = 'storage'
      AND table_name = 'objects'
      AND column_name = 'owner'
  ) THEN
    -- Try to fix the constraint, but handle permission errors gracefully
    BEGIN
      -- Check the constraint
      IF NOT EXISTS (
        SELECT 1
        FROM pg_constraint c
        WHERE c.conrelid = 'storage.objects'::regclass
          AND c.confrelid = 'auth.users'::regclass
          AND c.confdeltype = 'c'  -- CASCADE
      ) THEN
        RAISE NOTICE 'Attempting to fix storage.objects owner constraint...';

        -- Drop existing constraint if any
        ALTER TABLE storage.objects
          DROP CONSTRAINT IF EXISTS objects_owner_fkey;

        -- Add with CASCADE
        ALTER TABLE storage.objects
          ADD CONSTRAINT objects_owner_fkey
          FOREIGN KEY (owner)
          REFERENCES auth.users(id)
          ON DELETE CASCADE;

        RAISE NOTICE '  ✅ storage.objects.owner now uses CASCADE';
      END IF;
    EXCEPTION
      WHEN insufficient_privilege THEN
        RAISE NOTICE '  ⚠️  Cannot modify storage.objects (insufficient privileges)';
        RAISE NOTICE '      This is managed by Supabase and usually handles deletion properly';
      WHEN OTHERS THEN
        RAISE NOTICE '  ⚠️  Could not modify storage.objects: %', SQLERRM;
    END;
  END IF;
END $$;

-- ============================================================================
-- STEP 3: Create bulletproof delete function
-- ============================================================================

CREATE OR REPLACE FUNCTION public.force_delete_user(p_user_id uuid)
RETURNS boolean
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public, auth, storage
AS $$
DECLARE
  v_count integer;
BEGIN
  -- Log what we're about to delete
  RAISE NOTICE '===========================================';
  RAISE NOTICE 'Force deleting user: %', p_user_id;
  RAISE NOTICE '===========================================';

  -- 1. Clear any circular references in character_profiles
  UPDATE public.character_profiles
  SET avatar_cache_id = NULL
  WHERE user_id = p_user_id;
  GET DIAGNOSTICS v_count = ROW_COUNT;
  IF v_count > 0 THEN
    RAISE NOTICE 'Cleared % avatar_cache references', v_count;
  END IF;

  -- 2. Delete from avatar_cache (both character and created_by references)
  DELETE FROM public.avatar_cache
  WHERE character_profile_id IN (
    SELECT id FROM public.character_profiles WHERE user_id = p_user_id
  ) OR created_by_user_id = p_user_id;
  GET DIAGNOSTICS v_count = ROW_COUNT;
  IF v_count > 0 THEN
    RAISE NOTICE 'Deleted % avatar_cache records', v_count;
  END IF;

  -- 3. Delete content_characters junction records
  DELETE FROM public.content_characters
  WHERE content_id IN (
    SELECT id FROM public.content WHERE user_id = p_user_id
  ) OR character_profile_id IN (
    SELECT id FROM public.character_profiles WHERE user_id = p_user_id
  );
  GET DIAGNOSTICS v_count = ROW_COUNT;
  IF v_count > 0 THEN
    RAISE NOTICE 'Deleted % content_characters records', v_count;
  END IF;

  -- 4. Try to delete storage objects if they exist (may not have permission)
  BEGIN
    DELETE FROM storage.objects WHERE owner = p_user_id;
    GET DIAGNOSTICS v_count = ROW_COUNT;
    IF v_count > 0 THEN
      RAISE NOTICE 'Deleted % storage objects', v_count;
    END IF;
  EXCEPTION
    WHEN insufficient_privilege THEN
      RAISE NOTICE 'Skipped storage.objects (no permission)';
    WHEN undefined_table THEN
      NULL; -- Table doesn't exist, that's fine
    WHEN OTHERS THEN
      RAISE NOTICE 'Could not delete from storage.objects: %', SQLERRM;
  END;

  -- 5. Now delete from auth.users (everything else will CASCADE)
  DELETE FROM auth.users WHERE id = p_user_id;
  GET DIAGNOSTICS v_count = ROW_COUNT;

  IF v_count > 0 THEN
    RAISE NOTICE '===========================================';
    RAISE NOTICE '✅ Successfully deleted user and all related data';
    RAISE NOTICE '===========================================';
    RETURN TRUE;
  ELSE
    RAISE NOTICE '⚠️  User not found: %', p_user_id;
    RETURN FALSE;
  END IF;

EXCEPTION
  WHEN OTHERS THEN
    RAISE WARNING 'Error deleting user %: %', p_user_id, SQLERRM;
    RAISE WARNING 'Error detail: %', SQLSTATE;
    RETURN FALSE;
END;
$$;

COMMENT ON FUNCTION public.force_delete_user IS
  'Forcefully deletes a user and all related data, handling circular dependencies';

-- ============================================================================
-- STEP 4: Grant necessary permissions
-- ============================================================================

-- Grant execute permission to service role (Supabase dashboard uses this)
GRANT EXECUTE ON FUNCTION public.force_delete_user TO service_role;

-- ============================================================================
-- VERIFICATION
-- ============================================================================

DO $$
DECLARE
  non_cascade_count integer;
BEGIN
  -- Count non-CASCADE foreign keys to auth.users
  SELECT COUNT(*)
  INTO non_cascade_count
  FROM pg_constraint
  WHERE confrelid = 'auth.users'::regclass
    AND contype = 'f'
    AND confdeltype != 'c';

  RAISE NOTICE '===========================================';
  RAISE NOTICE 'Migration Complete!';
  RAISE NOTICE '===========================================';

  IF non_cascade_count = 0 THEN
    RAISE NOTICE '✅ All foreign keys to auth.users now use CASCADE';
  ELSE
    RAISE WARNING '⚠️  Still have % non-CASCADE constraints', non_cascade_count;
  END IF;

  RAISE NOTICE '';
  RAISE NOTICE 'To delete a user, you can now:';
  RAISE NOTICE '1. Use Supabase Auth panel (should work now)';
  RAISE NOTICE '2. Or run: SELECT force_delete_user(''user_id_here'');';
  RAISE NOTICE '===========================================';
END $$;