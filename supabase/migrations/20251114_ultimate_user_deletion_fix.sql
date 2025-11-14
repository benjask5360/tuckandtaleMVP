-- ============================================================================
-- ULTIMATE USER DELETION FIX
-- Comprehensively fixes ALL foreign key constraints that block user deletion
-- ============================================================================

DO $$
DECLARE
  rec RECORD;
  fix_count INTEGER := 0;
  total_count INTEGER := 0;
  constraint_exists BOOLEAN;
BEGIN
  RAISE NOTICE '';
  RAISE NOTICE '====================================';
  RAISE NOTICE 'ULTIMATE USER DELETION FIX';
  RAISE NOTICE '====================================';
  RAISE NOTICE '';

  -- Process each foreign key constraint to auth.users
  FOR rec IN
    SELECT
      c.conname as constraint_name,
      n.nspname as schema_name,
      cl.relname as table_name,
      a.attname as column_name,
      c.confdeltype as delete_type
    FROM pg_constraint c
    JOIN pg_namespace n ON n.oid = c.connamespace
    JOIN pg_class cl ON cl.oid = c.conrelid
    JOIN pg_attribute a ON a.attnum = ANY(c.conkey) AND a.attrelid = c.conrelid
    WHERE c.confrelid = 'auth.users'::regclass
      AND c.contype = 'f'
    ORDER BY n.nspname, cl.relname, a.attname
  LOOP
    total_count := total_count + 1;

    -- Only fix constraints that are blocking (NO ACTION or RESTRICT)
    IF rec.delete_type IN ('a', 'r') THEN
      RAISE NOTICE 'FIXING: %.%.%', rec.schema_name, rec.table_name, rec.column_name;
      RAISE NOTICE '  Current constraint: %', rec.constraint_name;

      -- Drop the existing constraint
      BEGIN
        EXECUTE format('ALTER TABLE %I.%I DROP CONSTRAINT %I CASCADE',
          rec.schema_name, rec.table_name, rec.constraint_name);
        RAISE NOTICE '  ✓ Dropped old constraint';
      EXCEPTION WHEN OTHERS THEN
        RAISE NOTICE '  ⚠️ Could not drop: %', SQLERRM;
      END;

      -- Recreate with appropriate behavior
      BEGIN
        -- Special handling for specific tables
        IF rec.table_name = 'api_cost_logs' THEN
          -- Preserve logs by setting to NULL
          EXECUTE format('ALTER TABLE %I.%I ADD CONSTRAINT %I FOREIGN KEY (%I) REFERENCES auth.users(id) ON DELETE SET NULL',
            rec.schema_name, rec.table_name, rec.constraint_name, rec.column_name);
          RAISE NOTICE '  ✓ Recreated with SET NULL (preserves logs)';

        ELSIF rec.table_name = 'avatar_cache' AND rec.column_name = 'created_by_user_id' THEN
          -- Avatar cache should cascade
          EXECUTE format('ALTER TABLE %I.%I ADD CONSTRAINT %I FOREIGN KEY (%I) REFERENCES auth.users(id) ON DELETE CASCADE',
            rec.schema_name, rec.table_name, rec.constraint_name, rec.column_name);
          RAISE NOTICE '  ✓ Recreated with CASCADE';

        ELSIF rec.table_name IN ('user_profiles', 'character_profiles', 'content', 'generation_usage', 'stories', 'children', 'story_preferences', 'user_subscriptions', 'child_subscription_usage', 'ai_configs') THEN
          -- User-owned data should cascade
          EXECUTE format('ALTER TABLE %I.%I ADD CONSTRAINT %I FOREIGN KEY (%I) REFERENCES auth.users(id) ON DELETE CASCADE',
            rec.schema_name, rec.table_name, rec.constraint_name, rec.column_name);
          RAISE NOTICE '  ✓ Recreated with CASCADE';

        ELSIF rec.table_name LIKE '%_log%' OR rec.table_name LIKE '%_audit%' THEN
          -- Any log or audit table preserves records
          EXECUTE format('ALTER TABLE %I.%I ADD CONSTRAINT %I FOREIGN KEY (%I) REFERENCES auth.users(id) ON DELETE SET NULL',
            rec.schema_name, rec.table_name, rec.constraint_name, rec.column_name);
          RAISE NOTICE '  ✓ Recreated with SET NULL (preserves records)';

        ELSE
          -- Default: cascade for user data
          EXECUTE format('ALTER TABLE %I.%I ADD CONSTRAINT %I FOREIGN KEY (%I) REFERENCES auth.users(id) ON DELETE CASCADE',
            rec.schema_name, rec.table_name, rec.constraint_name, rec.column_name);
          RAISE NOTICE '  ✓ Recreated with CASCADE (default)';
        END IF;

        fix_count := fix_count + 1;
      EXCEPTION WHEN OTHERS THEN
        RAISE WARNING '  ❌ Failed to recreate: %', SQLERRM;
      END;

      RAISE NOTICE '';
    END IF;
  END LOOP;

  -- Also check for any columns that might have been added without proper constraints
  -- This catches cases where columns exist but constraints weren't created properly

  -- Fix avatar_cache.created_by_user_id if it exists but has wrong constraint
  SELECT EXISTS (
    SELECT 1 FROM information_schema.columns
    WHERE table_schema = 'public'
      AND table_name = 'avatar_cache'
      AND column_name = 'created_by_user_id'
  ) INTO constraint_exists;

  IF constraint_exists THEN
    -- Drop any existing constraint with various possible names
    FOR rec IN
      SELECT conname
      FROM pg_constraint c
      JOIN pg_class cl ON cl.oid = c.conrelid
      WHERE cl.relname = 'avatar_cache'
        AND c.confrelid = 'auth.users'::regclass
        AND c.contype = 'f'
    LOOP
      BEGIN
        EXECUTE format('ALTER TABLE public.avatar_cache DROP CONSTRAINT %I', rec.conname);
        RAISE NOTICE 'Dropped avatar_cache constraint: %', rec.conname;
      EXCEPTION WHEN OTHERS THEN
        NULL; -- Ignore if doesn't exist
      END;
    END LOOP;

    -- Add the correct constraint
    BEGIN
      ALTER TABLE public.avatar_cache
        ADD CONSTRAINT avatar_cache_created_by_user_id_fkey
        FOREIGN KEY (created_by_user_id)
        REFERENCES auth.users(id)
        ON DELETE CASCADE;
      RAISE NOTICE 'Added correct constraint for avatar_cache.created_by_user_id';
      fix_count := fix_count + 1;
    EXCEPTION WHEN OTHERS THEN
      RAISE NOTICE 'Could not add avatar_cache constraint: %', SQLERRM;
    END;
  END IF;

  RAISE NOTICE '';
  RAISE NOTICE '====================================';
  RAISE NOTICE 'FIX COMPLETE';
  RAISE NOTICE '  Total constraints checked: %', total_count;
  RAISE NOTICE '  Constraints fixed: %', fix_count;

  IF fix_count = 0 THEN
    RAISE NOTICE '  ✅ All constraints already properly configured!';
  ELSE
    RAISE NOTICE '  ✅ Fixed % constraint(s)', fix_count;
    RAISE NOTICE '  User deletion should now work!';
  END IF;
  RAISE NOTICE '====================================';
END $$;

-- Verification: Show final state
DO $$
DECLARE
  rec RECORD;
  problem_count INTEGER := 0;
BEGIN
  RAISE NOTICE '';
  RAISE NOTICE 'Final constraint verification:';
  RAISE NOTICE '------------------------------';

  FOR rec IN
    SELECT
      n.nspname || '.' || cl.relname || '.' || a.attname as location,
      CASE c.confdeltype
        WHEN 'c' THEN 'CASCADE ✅'
        WHEN 'n' THEN 'SET NULL ✅'
        WHEN 'a' THEN 'NO ACTION ❌'
        WHEN 'r' THEN 'RESTRICT ❌'
        WHEN 'd' THEN 'SET DEFAULT'
      END as behavior
    FROM pg_constraint c
    JOIN pg_namespace n ON n.oid = c.connamespace
    JOIN pg_class cl ON cl.oid = c.conrelid
    JOIN pg_attribute a ON a.attnum = ANY(c.conkey) AND a.attrelid = c.conrelid
    WHERE c.confrelid = 'auth.users'::regclass
      AND c.contype = 'f'
    ORDER BY
      CASE c.confdeltype
        WHEN 'a' THEN 1
        WHEN 'r' THEN 2
        ELSE 3
      END,
      n.nspname, cl.relname
  LOOP
    RAISE NOTICE '  % -> %', rec.location, rec.behavior;
    IF rec.behavior LIKE '%❌%' THEN
      problem_count := problem_count + 1;
    END IF;
  END LOOP;

  RAISE NOTICE '';
  IF problem_count > 0 THEN
    RAISE WARNING 'Still have % problematic constraint(s)!', problem_count;
  ELSE
    RAISE NOTICE '✅ All constraints properly configured for user deletion!';
  END IF;
END $$;