-- Reset Migration History
--
-- This SQL clears the Supabase migration history table.
-- Run this in the Supabase Dashboard SQL Editor to fix migration mismatches.
--
-- IMPORTANT: This does NOT affect your data or schema - only the migration tracking.

-- Clear all migration history
TRUNCATE TABLE supabase_migrations.schema_migrations;

-- Verify it's cleared
SELECT COUNT(*) as remaining_migrations FROM supabase_migrations.schema_migrations;

-- The result should be 0
