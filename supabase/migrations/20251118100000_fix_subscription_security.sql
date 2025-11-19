-- Fix Supabase security warnings for subscription tables
-- This migration:
-- 1. Enables RLS on subscription_tiers with permissive policies (won't break existing access)
-- 2. Drops orphaned subscription_tiers_backup table

-- Enable RLS on subscription_tiers table
ALTER TABLE subscription_tiers ENABLE ROW LEVEL SECURITY;

-- Allow everyone to view active subscription tiers
-- This maintains existing behavior where both authenticated and anon users can read
CREATE POLICY "Allow all to view active tiers"
  ON subscription_tiers
  FOR SELECT
  USING (is_active = true);

-- Service role needs full access for administrative operations
CREATE POLICY "Service role full access"
  ON subscription_tiers
  TO service_role
  USING (true)
  WITH CHECK (true);

-- Drop the orphaned backup table (created during migration, no longer needed)
DROP TABLE IF EXISTS subscription_tiers_backup;

-- Add comment documenting the security model
COMMENT ON TABLE subscription_tiers IS 'Reference table for subscription tier configuration. RLS enabled with permissive SELECT for all users since pricing data is public. SECURITY DEFINER functions bypass RLS to enforce usage limits.';
