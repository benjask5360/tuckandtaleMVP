# Quick Fix Guide - User Deletion Issue

## The Problem
Users cannot be deleted from Supabase dashboard - getting 500 error.

## The Cause
`avatar_cache.created_by_user_id` foreign key is missing `ON DELETE CASCADE`.

## Quick Fix (2 minutes)

### Option 1: Apply Migration (Recommended)
```bash
cd f:\Projects\tuckandtaleMVP\tuckandtaleMVP
npx supabase db push
```

### Option 2: Direct SQL Fix
If migration fails, run this in Supabase SQL Editor:

```sql
-- Find and fix the constraint
DO $$
DECLARE
    constraint_name text;
BEGIN
    -- Find the constraint name
    SELECT c.conname INTO constraint_name
    FROM pg_constraint c
    JOIN pg_attribute a ON a.attnum = ANY(c.conkey) AND a.attrelid = c.conrelid
    WHERE c.conrelid = 'public.avatar_cache'::regclass
      AND a.attname = 'created_by_user_id'
      AND c.contype = 'f';

    -- Drop it
    IF constraint_name IS NOT NULL THEN
        EXECUTE format('ALTER TABLE public.avatar_cache DROP CONSTRAINT %I', constraint_name);
    END IF;
END $$;

-- Add it back with CASCADE
ALTER TABLE public.avatar_cache
ADD CONSTRAINT avatar_cache_created_by_user_id_fkey
FOREIGN KEY (created_by_user_id)
REFERENCES auth.users(id)
ON DELETE CASCADE;
```

## Verify Fix

Run this query - it should return "CASCADE ✅":

```sql
SELECT
  CASE c.confdeltype
    WHEN 'c' THEN 'CASCADE ✅'
    WHEN 'a' THEN 'NO ACTION ❌'
  END as status
FROM pg_constraint c
JOIN pg_attribute a ON a.attnum = ANY(c.conkey) AND a.attrelid = c.conrelid
WHERE c.conrelid = 'public.avatar_cache'::regclass
  AND a.attname = 'created_by_user_id';
```

## Test
1. Go to Supabase dashboard > Authentication > Users
2. Try deleting a test user
3. Should work without errors!

## If Still Failing

Check for other problematic constraints:

```sql
SELECT
  c.relname as table,
  a.attname as column,
  CASE con.confdeltype
    WHEN 'c' THEN 'CASCADE'
    WHEN 'n' THEN 'SET NULL'
    WHEN 'a' THEN 'NO ACTION ❌ PROBLEM'
  END as on_delete
FROM pg_constraint con
JOIN pg_class c ON c.oid = con.conrelid
JOIN pg_attribute a ON a.attnum = ANY(con.conkey) AND a.attrelid = c.conrelid
WHERE con.confrelid = 'auth.users'::regclass
  AND con.confdeltype NOT IN ('c', 'n');
```

Any rows returned need fixing!