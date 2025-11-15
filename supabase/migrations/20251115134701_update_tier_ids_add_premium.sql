-- Update tier IDs to final permanent internal keys and add fourth inactive tier

-- 1. Temporarily drop the foreign key constraint to allow updates
ALTER TABLE user_profiles
  DROP CONSTRAINT IF EXISTS user_profiles_subscription_tier_id_fkey;

-- 2. Update the tier IDs to their final permanent internal keys
UPDATE subscription_tiers SET id = 'tier_free'  WHERE id = 'moonlight';
UPDATE subscription_tiers SET id = 'tier_basic' WHERE id = 'starlight';
UPDATE subscription_tiers SET id = 'tier_plus'  WHERE id = 'supernova';

-- 3. Update display names to match final marketing names
UPDATE subscription_tiers SET name = 'Moonlight (Free)' WHERE id = 'tier_free';
UPDATE subscription_tiers SET name = 'Starlight'         WHERE id = 'tier_basic';
UPDATE subscription_tiers SET name = 'Supernova'         WHERE id = 'tier_plus';

-- 4. Add the fourth tier (tier_premium) as inactive
INSERT INTO subscription_tiers (
  id, name, price_monthly, price_yearly,
  display_order, is_active,
  illustrated_limit_total, illustrated_limit_month, text_limit_month,
  child_profiles, other_character_profiles, avatar_regenerations_month,
  allow_pets, allow_magical_creatures,
  allow_fun_stories, allow_growth_stories, allow_growth_areas,
  allow_genres, allow_writing_styles,
  allow_moral_lessons, allow_special_requests, allow_story_length, allow_advanced_customization,
  allow_library, allow_favorites,
  early_access, support_level
) VALUES (
  'tier_premium', 'Premium (Coming Soon)',
  NULL, NULL,
  4, false,
  NULL, 0, 0,
  0, 0, 0,
  false, false,
  false, false, false,
  false, false,
  false, false, false, false,
  false, false,
  false, 'premium'
);

-- 5. Update user_profiles foreign key values to final tier IDs
-- All users are currently on 'moonlight', so update them to 'tier_free'
UPDATE user_profiles
SET subscription_tier_id = 'tier_free'
WHERE subscription_tier_id = 'moonlight';

-- 6. Re-add the foreign key constraint
ALTER TABLE user_profiles
  ADD CONSTRAINT user_profiles_subscription_tier_id_fkey
  FOREIGN KEY (subscription_tier_id)
  REFERENCES subscription_tiers(id)
  ON DELETE RESTRICT
  ON UPDATE CASCADE;

-- Done! Tier IDs are now:
-- tier_free (Moonlight Free)
-- tier_basic (Starlight)
-- tier_plus (Supernova)
-- tier_premium (Premium - Coming Soon, inactive)