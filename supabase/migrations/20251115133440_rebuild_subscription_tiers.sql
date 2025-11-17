-- Step 2: Rebuild subscription_tiers table with new schema and seed data
-- This is a destructive rebuild for development environment

-- 1. Drop existing foreign key constraint from user_profiles
ALTER TABLE user_profiles
  DROP CONSTRAINT IF EXISTS user_profiles_subscription_tier_id_fkey CASCADE;

-- 2. Backup existing subscription_tiers data (for safety)
CREATE TABLE IF NOT EXISTS subscription_tiers_backup AS
  SELECT * FROM subscription_tiers;

-- 3. Drop the existing subscription_tiers table
DROP TABLE IF EXISTS subscription_tiers CASCADE;

-- 4. Create new subscription_tiers table with all new columns
CREATE TABLE subscription_tiers (
  -- Core identifiers
  id TEXT PRIMARY KEY,
  name TEXT NOT NULL,

  -- Pricing metadata (legacy fields retained)
  price_monthly DECIMAL(10,2) DEFAULT 0,
  price_yearly DECIMAL(10,2),

  -- Display metadata (legacy field retained)
  display_order INTEGER DEFAULT 0,
  is_active BOOLEAN DEFAULT true,

  -- Story generation limits
  illustrated_limit_total INTEGER,      -- Lifetime cap (NULL = no cap)
  illustrated_limit_month INTEGER NOT NULL,
  text_limit_month INTEGER NOT NULL,

  -- Profile limits
  child_profiles INTEGER NOT NULL,
  other_character_profiles INTEGER NOT NULL,

  -- Avatar limits
  avatar_regenerations_month INTEGER NOT NULL,

  -- Character type permissions
  allow_pets BOOLEAN NOT NULL DEFAULT false,
  allow_magical_creatures BOOLEAN NOT NULL DEFAULT false,

  -- Story mode permissions
  allow_fun_stories BOOLEAN NOT NULL DEFAULT false,
  allow_growth_stories BOOLEAN NOT NULL DEFAULT false,
  allow_growth_areas BOOLEAN NOT NULL DEFAULT false,

  -- Customization permissions
  allow_genres BOOLEAN NOT NULL DEFAULT false,
  allow_writing_styles BOOLEAN NOT NULL DEFAULT false,
  allow_moral_lessons BOOLEAN NOT NULL DEFAULT false,
  allow_special_requests BOOLEAN NOT NULL DEFAULT false,
  allow_story_length BOOLEAN NOT NULL DEFAULT false,
  allow_advanced_customization BOOLEAN NOT NULL DEFAULT false,

  -- Library features
  allow_library BOOLEAN NOT NULL DEFAULT false,
  allow_favorites BOOLEAN NOT NULL DEFAULT false,

  -- Support and access
  early_access BOOLEAN NOT NULL DEFAULT false,
  support_level TEXT NOT NULL CHECK (support_level IN ('standard', 'priority', 'premium')),

  -- Timestamps (legacy fields retained)
  created_at TIMESTAMPTZ DEFAULT NOW(),
  updated_at TIMESTAMPTZ DEFAULT NOW()
);

-- 5. Add comments for documentation
COMMENT ON TABLE subscription_tiers IS 'Subscription tier definitions with feature flags and limits';
COMMENT ON COLUMN subscription_tiers.id IS 'Unique identifier for the tier (moonlight, starlight, supernova)';
COMMENT ON COLUMN subscription_tiers.name IS 'Display name for the tier';
COMMENT ON COLUMN subscription_tiers.illustrated_limit_total IS 'Lifetime illustrated story cap (NULL = no lifetime cap)';
COMMENT ON COLUMN subscription_tiers.illustrated_limit_month IS 'Monthly illustrated story quota';
COMMENT ON COLUMN subscription_tiers.text_limit_month IS 'Monthly text-only story quota';
COMMENT ON COLUMN subscription_tiers.child_profiles IS 'Maximum number of child profiles allowed';
COMMENT ON COLUMN subscription_tiers.other_character_profiles IS 'Maximum number of other characters (pets, magical creatures)';
COMMENT ON COLUMN subscription_tiers.avatar_regenerations_month IS 'Monthly avatar regeneration limit';
COMMENT ON COLUMN subscription_tiers.support_level IS 'Support tier level: standard, priority, or premium';

-- 6. Insert the 3 new subscription tiers
INSERT INTO subscription_tiers (
  id, name,
  price_monthly, price_yearly, display_order, is_active,
  illustrated_limit_total, illustrated_limit_month, text_limit_month,
  child_profiles, other_character_profiles, avatar_regenerations_month,
  allow_pets, allow_magical_creatures,
  allow_fun_stories, allow_growth_stories, allow_growth_areas,
  allow_genres, allow_writing_styles,
  allow_moral_lessons, allow_special_requests, allow_story_length, allow_advanced_customization,
  allow_library, allow_favorites,
  early_access, support_level
) VALUES
  -- Moonlight (Free) Tier
  (
    'moonlight', 'Moonlight (Free)',
    0.00, NULL, 1, true,
    3, 3, 5,
    1, 1, 3,
    true, false,
    true, false, false,
    false, false,
    false, false, false, false,
    true, false,
    false, 'standard'
  ),
  -- Starlight (Paid) Tier
  (
    'starlight', 'Starlight',
    9.99, NULL, 2, true,
    NULL, 20, 50,
    3, 5, 25,
    true, true,
    true, true, true,
    true, true,
    true, true, true, true,
    true, true,
    false, 'priority'
  ),
  -- Supernova (Premium) Tier
  (
    'supernova', 'Supernova',
    14.99, NULL, 3, true,
    NULL, 40, 100,
    10, 20, 100,
    true, true,
    true, true, true,
    true, true,
    true, true, true, true,
    true, true,
    true, 'premium'
  );

-- 7. Migrate user_profiles.subscription_tier_id from UUID to TEXT
-- First, add a new TEXT column
ALTER TABLE user_profiles
  ADD COLUMN subscription_tier_id_new TEXT;

-- Set all existing users to 'moonlight' (free tier)
UPDATE user_profiles
  SET subscription_tier_id_new = 'moonlight';

-- Drop the old UUID column
ALTER TABLE user_profiles
  DROP COLUMN IF EXISTS subscription_tier_id;

-- Rename the new column to replace the old one
ALTER TABLE user_profiles
  RENAME COLUMN subscription_tier_id_new TO subscription_tier_id;

-- Add NOT NULL constraint after data is populated
ALTER TABLE user_profiles
  ALTER COLUMN subscription_tier_id SET NOT NULL;

-- Re-add foreign key constraint
ALTER TABLE user_profiles
  ADD CONSTRAINT user_profiles_subscription_tier_id_fkey
  FOREIGN KEY (subscription_tier_id)
  REFERENCES subscription_tiers(id)
  ON DELETE RESTRICT
  ON UPDATE CASCADE;

-- 8. Create trigger for updated_at
CREATE TRIGGER handle_subscription_tiers_updated_at
  BEFORE UPDATE ON subscription_tiers
  FOR EACH ROW
  EXECUTE FUNCTION handle_updated_at();

-- 9. Grant appropriate permissions
GRANT SELECT ON subscription_tiers TO authenticated;
GRANT SELECT ON subscription_tiers TO anon;
GRANT SELECT ON subscription_tiers TO service_role;

-- 10. Create index for performance
CREATE INDEX idx_subscription_tiers_id ON subscription_tiers(id);
CREATE INDEX idx_user_profiles_subscription_tier_id ON user_profiles(subscription_tier_id);

-- Done! All users have been migrated to the 'moonlight' free tier.
-- The subscription_tiers table has been completely rebuilt with the new schema.