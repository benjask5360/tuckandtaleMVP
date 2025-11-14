-- GET ACTUAL CURRENT SCHEMA FROM PRODUCTION DATABASE
-- This will show us the REAL state, not what migrations claim

-- ============================================
-- 1. AVATAR_CACHE TABLE STRUCTURE
-- ============================================
SELECT '===== AVATAR_CACHE TABLE STRUCTURE =====' as section;

SELECT
  column_name,
  data_type,
  character_maximum_length,
  column_default,
  is_nullable,
  CASE
    WHEN column_name = 'id' THEN '(Primary Key)'
    ELSE ''
  END as notes
FROM information_schema.columns
WHERE table_schema = 'public'
  AND table_name = 'avatar_cache'
ORDER BY ordinal_position;

-- ============================================
-- 2. AVATAR_CACHE CONSTRAINTS
-- ============================================
SELECT '===== AVATAR_CACHE CONSTRAINTS =====' as section;

SELECT
  tc.constraint_name,
  tc.constraint_type,
  kcu.column_name,
  CASE
    WHEN tc.constraint_type = 'FOREIGN KEY' THEN
      'References: ' || ccu.table_schema || '.' || ccu.table_name || '(' || ccu.column_name || ')'
    ELSE ''
  END as references_info,
  CASE
    WHEN tc.constraint_type = 'FOREIGN KEY' THEN
      'ON DELETE: ' || rc.delete_rule
    ELSE ''
  END as delete_rule
FROM information_schema.table_constraints tc
LEFT JOIN information_schema.key_column_usage kcu
  ON tc.constraint_name = kcu.constraint_name
  AND tc.table_schema = kcu.table_schema
LEFT JOIN information_schema.constraint_column_usage ccu
  ON ccu.constraint_name = tc.constraint_name
  AND ccu.table_schema = tc.table_schema
LEFT JOIN information_schema.referential_constraints rc
  ON rc.constraint_name = tc.constraint_name
WHERE tc.table_schema = 'public'
  AND tc.table_name = 'avatar_cache'
ORDER BY tc.constraint_type, tc.constraint_name;

-- ============================================
-- 3. RLS POLICIES ON AVATAR_CACHE
-- ============================================
SELECT '===== RLS POLICIES ON AVATAR_CACHE =====' as section;

SELECT
  polname as policy_name,
  CASE polcmd
    WHEN 'r' THEN 'SELECT'
    WHEN 'a' THEN 'INSERT'
    WHEN 'w' THEN 'UPDATE'
    WHEN 'd' THEN 'DELETE'
    WHEN '*' THEN 'ALL'
  END as command,
  CASE
    WHEN polpermissive THEN 'PERMISSIVE'
    ELSE 'RESTRICTIVE'
  END as type,
  pg_get_expr(polqual, polrelid) as using_expression,
  pg_get_expr(polwithcheck, polrelid) as with_check_expression
FROM pg_policy
WHERE polrelid = 'public.avatar_cache'::regclass
ORDER BY polname;

-- ============================================
-- 4. CHECK IF RLS IS ENABLED
-- ============================================
SELECT '===== RLS STATUS =====' as section;

SELECT
  relname as table_name,
  CASE relrowsecurity
    WHEN true THEN 'RLS ENABLED'
    ELSE 'RLS DISABLED'
  END as rls_status,
  CASE relforcerowsecurity
    WHEN true THEN 'FORCE RLS: YES'
    ELSE 'FORCE RLS: NO'
  END as force_rls
FROM pg_class
WHERE oid = 'public.avatar_cache'::regclass;

-- ============================================
-- 5. TRIGGERS ON AVATAR_CACHE
-- ============================================
SELECT '===== TRIGGERS ON AVATAR_CACHE =====' as section;

SELECT
  t.tgname as trigger_name,
  CASE
    WHEN t.tgtype & 2 != 0 THEN 'BEFORE'
    WHEN t.tgtype & 64 != 0 THEN 'INSTEAD OF'
    ELSE 'AFTER'
  END as timing,
  CASE
    WHEN t.tgtype & 4 != 0 THEN 'INSERT'
    WHEN t.tgtype & 8 != 0 THEN 'DELETE'
    WHEN t.tgtype & 16 != 0 THEN 'UPDATE'
  END as event,
  p.proname as function_name,
  CASE t.tgenabled
    WHEN 'O' THEN 'ENABLED'
    WHEN 'D' THEN 'DISABLED'
    WHEN 'R' THEN 'REPLICA ONLY'
    WHEN 'A' THEN 'ALWAYS'
  END as status
FROM pg_trigger t
JOIN pg_proc p ON t.tgfoid = p.oid
WHERE t.tgrelid = 'public.avatar_cache'::regclass
  AND NOT t.tgisinternal
ORDER BY t.tgname;

-- ============================================
-- 6. CHARACTER_PROFILES TABLE STRUCTURE
-- ============================================
SELECT '===== CHARACTER_PROFILES TABLE STRUCTURE =====' as section;

SELECT
  column_name,
  data_type,
  column_default,
  is_nullable
FROM information_schema.columns
WHERE table_schema = 'public'
  AND table_name = 'character_profiles'
  AND column_name IN ('id', 'user_id', 'avatar_cache_id', 'created_at', 'updated_at')
ORDER BY ordinal_position;

-- ============================================
-- 7. CHECK FOR FUNCTIONS AFFECTING AVATAR_CACHE
-- ============================================
SELECT '===== FUNCTIONS REFERENCING AVATAR_CACHE =====' as section;

SELECT
  n.nspname || '.' || p.proname as function_name,
  pg_get_function_result(p.oid) as returns
FROM pg_proc p
JOIN pg_namespace n ON p.pronamespace = n.oid
WHERE pg_get_functiondef(p.oid) LIKE '%avatar_cache%'
  AND n.nspname NOT IN ('pg_catalog', 'information_schema')
ORDER BY function_name;

-- ============================================
-- 8. INDEXES ON AVATAR_CACHE
-- ============================================
SELECT '===== INDEXES ON AVATAR_CACHE =====' as section;

SELECT
  i.relname as index_name,
  a.attname as column_name,
  CASE ix.indisunique
    WHEN true THEN 'UNIQUE'
    ELSE 'NON-UNIQUE'
  END as uniqueness,
  CASE ix.indisprimary
    WHEN true THEN 'PRIMARY KEY'
    ELSE ''
  END as is_primary
FROM pg_index ix
JOIN pg_class i ON i.oid = ix.indexrelid
JOIN pg_attribute a ON a.attrelid = ix.indrelid AND a.attnum = ANY(ix.indkey)
WHERE ix.indrelid = 'public.avatar_cache'::regclass
ORDER BY i.relname, a.attnum;