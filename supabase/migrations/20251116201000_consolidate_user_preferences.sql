-- Consolidate user_preferences into user_profiles for MVP simplicity
-- Add email preference columns to user_profiles table

-- Add email preference columns to user_profiles
ALTER TABLE user_profiles
ADD COLUMN IF NOT EXISTS email_marketing boolean NOT NULL DEFAULT false,
ADD COLUMN IF NOT EXISTS email_product_updates boolean NOT NULL DEFAULT true,
ADD COLUMN IF NOT EXISTS email_account_notifications boolean NOT NULL DEFAULT true;

-- Migrate existing data from user_preferences to user_profiles
UPDATE user_profiles up
SET
  email_marketing = COALESCE(pref.email_marketing, false),
  email_product_updates = COALESCE(pref.email_product_updates, true),
  email_account_notifications = COALESCE(pref.email_account_notifications, true)
FROM user_preferences pref
WHERE up.id = pref.id;

-- Drop the user_preferences table and all associated objects
DROP TRIGGER IF EXISTS on_auth_user_created_preferences ON auth.users;
DROP FUNCTION IF EXISTS handle_new_user_preferences();
DROP TRIGGER IF EXISTS update_user_preferences_timestamp ON user_preferences;
DROP FUNCTION IF EXISTS update_user_preferences_updated_at();
DROP TABLE IF EXISTS user_preferences;
