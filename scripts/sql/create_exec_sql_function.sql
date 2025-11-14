-- Create RPC function to execute arbitrary SQL
-- Run this FIRST in Supabase Dashboard SQL Editor
-- This will allow automated migration management

CREATE OR REPLACE FUNCTION exec_sql(sql_query TEXT)
RETURNS TEXT
LANGUAGE plpgsql
SECURITY DEFINER
AS $$
BEGIN
  EXECUTE sql_query;
  RETURN 'OK';
EXCEPTION
  WHEN OTHERS THEN
    RETURN SQLERRM;
END;
$$;

-- Grant execute permission to service role
GRANT EXECUTE ON FUNCTION exec_sql(TEXT) TO service_role;

-- Test it works
SELECT exec_sql('SELECT 1');
