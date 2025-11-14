-- Test migration to verify dedicated pooler works
-- This creates a simple test table and immediately drops it

-- Create test table
CREATE TABLE IF NOT EXISTS _migration_test (
  id SERIAL PRIMARY KEY,
  test_column TEXT NOT NULL DEFAULT 'Migration system works!',
  created_at TIMESTAMPTZ NOT NULL DEFAULT NOW()
);

-- Insert a test row
INSERT INTO _migration_test (test_column) VALUES ('Dedicated pooler connected successfully!');

-- Clean up - drop the test table
DROP TABLE _migration_test;

-- Add a comment to confirm this migration ran
COMMENT ON SCHEMA public IS 'Last migration: test_connection';
