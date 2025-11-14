-- Diagnostic Query: Check All Foreign Key Constraints to auth.users
-- Use this to verify cascade settings are correct

-- Main query to check all user references
SELECT
    n.nspname as schema,
    c.relname as table_name,
    a.attname as column_name,
    con.conname as constraint_name,
    CASE con.confdeltype
        WHEN 'a' THEN 'NO ACTION ❌ BLOCKS DELETION'
        WHEN 'r' THEN 'RESTRICT ❌ BLOCKS DELETION'
        WHEN 'c' THEN 'CASCADE ✅'
        WHEN 'n' THEN 'SET NULL ✅'
        WHEN 'd' THEN 'SET DEFAULT ⚠️'
    END as on_delete_behavior,
    CASE
        WHEN con.confdeltype IN ('a', 'r') THEN 'NEEDS FIX!'
        ELSE 'OK'
    END as status
FROM pg_constraint con
JOIN pg_class c ON c.oid = con.conrelid
JOIN pg_namespace n ON n.oid = c.relnamespace
JOIN pg_attribute a ON a.attnum = ANY(con.conkey) AND a.attrelid = c.conrelid
WHERE con.confrelid = 'auth.users'::regclass
ORDER BY status DESC, n.nspname, c.relname, a.attname;
