-- Final comprehensive fix for user deletion cascade issues
-- Problem: avatar_cache.created_by_user_id is missing ON DELETE CASCADE
-- This blocks all user deletions from auth.users table

-- Step 1: Find and drop the existing constraint on avatar_cache.created_by_user_id
-- We use dynamic SQL because PostgreSQL may have auto-generated a different constraint name
DO $$
DECLARE
    constraint_name text;
BEGIN
    -- Find the actual constraint name for created_by_user_id
    SELECT c.conname INTO constraint_name
    FROM pg_constraint c
    JOIN pg_attribute a ON a.attnum = ANY(c.conkey) AND a.attrelid = c.conrelid
    WHERE c.conrelid = 'public.avatar_cache'::regclass
      AND a.attname = 'created_by_user_id'
      AND c.contype = 'f';  -- foreign key constraint

    -- Drop the constraint if it exists
    IF constraint_name IS NOT NULL THEN
        EXECUTE format('ALTER TABLE public.avatar_cache DROP CONSTRAINT %I', constraint_name);
        RAISE NOTICE 'Dropped constraint: %', constraint_name;
    ELSE
        RAISE NOTICE 'No foreign key constraint found for avatar_cache.created_by_user_id';
    END IF;
END $$;

-- Step 2: Re-add the foreign key with ON DELETE CASCADE
ALTER TABLE public.avatar_cache
ADD CONSTRAINT avatar_cache_created_by_user_id_fkey
FOREIGN KEY (created_by_user_id)
REFERENCES auth.users(id)
ON DELETE CASCADE;

-- Step 3: Verify all user references have proper cascade settings
-- This query will show all foreign keys to auth.users and their delete actions
DO $$
DECLARE
    rec record;
    missing_cascades text := '';
BEGIN
    RAISE NOTICE 'Checking all foreign key references to auth.users...';

    FOR rec IN
        SELECT
            n.nspname as schema,
            c.relname as table,
            a.attname as column,
            con.conname as constraint_name,
            CASE con.confdeltype
                WHEN 'a' THEN 'NO ACTION ❌'
                WHEN 'r' THEN 'RESTRICT ❌'
                WHEN 'c' THEN 'CASCADE ✅'
                WHEN 'n' THEN 'SET NULL ✅'
                WHEN 'd' THEN 'SET DEFAULT ⚠️'
            END as on_delete_action
        FROM pg_constraint con
        JOIN pg_class c ON c.oid = con.conrelid
        JOIN pg_namespace n ON n.oid = c.relnamespace
        JOIN pg_attribute a ON a.attnum = ANY(con.conkey) AND a.attrelid = c.conrelid
        WHERE con.confrelid = 'auth.users'::regclass
        ORDER BY n.nspname, c.relname, a.attname
    LOOP
        RAISE NOTICE '  %.%.% -> %', rec.schema, rec.table, rec.column, rec.on_delete_action;

        -- Track any problematic constraints
        IF rec.on_delete_action IN ('NO ACTION ❌', 'RESTRICT ❌') THEN
            missing_cascades := missing_cascades || format('%s.%s.%s, ', rec.schema, rec.table, rec.column);
        END IF;
    END LOOP;

    -- Report any remaining issues
    IF missing_cascades != '' THEN
        RAISE WARNING 'The following columns still need CASCADE or SET NULL: %', rtrim(missing_cascades, ', ');
    ELSE
        RAISE NOTICE 'All foreign key references to auth.users have proper ON DELETE behavior ✅';
    END IF;
END $$;

-- Step 4: Double-check avatar_cache specifically
SELECT
    'avatar_cache.created_by_user_id cascade status:' as check,
    CASE c.confdeltype
        WHEN 'c' THEN 'CASCADE ✅ - User deletion will now work!'
        WHEN 'a' THEN 'NO ACTION ❌ - Migration may have failed'
        WHEN 'n' THEN 'SET NULL ⚠️ - Will null out but not ideal'
    END as status
FROM pg_constraint c
JOIN pg_attribute a ON a.attnum = ANY(c.conkey) AND a.attrelid = c.conrelid
WHERE c.conrelid = 'public.avatar_cache'::regclass
  AND a.attname = 'created_by_user_id';

-- Add helpful comment
COMMENT ON COLUMN public.avatar_cache.created_by_user_id IS 'User who created this avatar (for preview avatars). Cascades on user deletion.';

-- Final message
DO $$
BEGIN
    RAISE NOTICE '';
    RAISE NOTICE '========================================';
    RAISE NOTICE 'User deletion cascade fix completed!';
    RAISE NOTICE 'Users can now be deleted from auth.users';
    RAISE NOTICE '========================================';
END $$;