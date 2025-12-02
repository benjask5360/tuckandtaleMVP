-- Migration: Update subscription tiers for new pricing model
-- - Remove old tiers (tier_basic, tier_plus, tier_premium)
-- - Update tier_free to enable all features (paywall controls access, not features)
-- - Add new tier_stories_plus ($14.99/month, 30 stories)

-- =====================================================
-- PART 1: Remove old subscription tiers
-- =====================================================

-- First, reset any users on old tiers to tier_free
UPDATE user_profiles
SET subscription_tier_id = 'tier_free',
    subscription_status = 'inactive',
    stripe_subscription_id = NULL,
    subscription_starts_at = NULL,
    subscription_ends_at = NULL,
    updated_at = NOW()
WHERE subscription_tier_id IN ('tier_basic', 'tier_plus', 'tier_premium');

-- Delete old tiers
DELETE FROM subscription_tiers
WHERE id IN ('tier_basic', 'tier_plus', 'tier_premium');

-- =====================================================
-- PART 2: Update tier_free to enable all features
-- =====================================================

-- In new model, paywall controls access - not feature flags
-- So we enable all features for free tier too
UPDATE subscription_tiers SET
  name = 'Free',
  -- Set limits to 0 (paywall service handles access logic)
  illustrated_limit_total = NULL,
  illustrated_limit_month = 0,
  text_limit_month = 0,
  -- Enable all story features
  allow_fun_stories = true,
  allow_growth_stories = true,
  allow_growth_areas = true,
  allow_genres = true,
  allow_writing_styles = true,
  allow_moral_lessons = true,
  allow_special_requests = true,
  allow_story_length = true,
  allow_advanced_customization = true,
  -- Enable character features
  allow_pets = true,
  allow_magical_creatures = true,
  -- Enable library features
  allow_library = true,
  allow_favorites = true,
  -- Reasonable profile limits
  child_profiles = 5,
  other_character_profiles = 10,
  avatar_regenerations_month = 10,
  -- Standard support
  early_access = false,
  support_level = 'standard',
  -- Keep active
  is_active = true,
  display_order = 0,
  updated_at = NOW()
WHERE id = 'tier_free';

-- =====================================================
-- PART 3: Add Stories Plus tier
-- =====================================================

INSERT INTO subscription_tiers (
  id,
  name,
  -- Pricing
  price_monthly,
  price_monthly_promo,
  price_yearly,
  price_yearly_promo,
  promo_active,
  -- Story limits (30/month combined)
  illustrated_limit_total,
  illustrated_limit_month,
  text_limit_month,
  -- All features enabled
  allow_fun_stories,
  allow_growth_stories,
  allow_growth_areas,
  allow_genres,
  allow_writing_styles,
  allow_moral_lessons,
  allow_special_requests,
  allow_story_length,
  allow_advanced_customization,
  allow_pets,
  allow_magical_creatures,
  allow_library,
  allow_favorites,
  -- Generous profile limits
  child_profiles,
  other_character_profiles,
  avatar_regenerations_month,
  -- Priority support
  early_access,
  support_level,
  -- Stripe price IDs (to be updated after creating in Stripe)
  stripe_price_monthly,
  stripe_price_monthly_promo,
  stripe_price_yearly,
  stripe_price_yearly_promo,
  -- Active and display
  is_active,
  display_order
) VALUES (
  'tier_stories_plus',
  'Stories Plus',
  -- Pricing: $14.99/month only (no yearly for now)
  14.99,
  NULL,
  NULL,
  NULL,
  false,
  -- 30 stories per month (no lifetime cap)
  NULL,
  30,
  30,
  -- All features enabled
  true, true, true, true, true, true, true, true, true, true, true, true, true,
  -- Generous limits
  10,  -- child profiles
  20,  -- other characters
  50,  -- avatar regenerations
  -- Priority support, no early access yet
  false,
  'priority',
  -- Stripe price IDs (placeholder - update after creating in Stripe)
  NULL,
  NULL,
  NULL,
  NULL,
  -- Active
  true,
  1
)
ON CONFLICT (id) DO UPDATE SET
  name = EXCLUDED.name,
  price_monthly = EXCLUDED.price_monthly,
  illustrated_limit_month = EXCLUDED.illustrated_limit_month,
  text_limit_month = EXCLUDED.text_limit_month,
  allow_fun_stories = EXCLUDED.allow_fun_stories,
  allow_growth_stories = EXCLUDED.allow_growth_stories,
  allow_growth_areas = EXCLUDED.allow_growth_areas,
  allow_genres = EXCLUDED.allow_genres,
  allow_writing_styles = EXCLUDED.allow_writing_styles,
  allow_moral_lessons = EXCLUDED.allow_moral_lessons,
  allow_special_requests = EXCLUDED.allow_special_requests,
  allow_story_length = EXCLUDED.allow_story_length,
  allow_advanced_customization = EXCLUDED.allow_advanced_customization,
  allow_pets = EXCLUDED.allow_pets,
  allow_magical_creatures = EXCLUDED.allow_magical_creatures,
  allow_library = EXCLUDED.allow_library,
  allow_favorites = EXCLUDED.allow_favorites,
  child_profiles = EXCLUDED.child_profiles,
  other_character_profiles = EXCLUDED.other_character_profiles,
  avatar_regenerations_month = EXCLUDED.avatar_regenerations_month,
  early_access = EXCLUDED.early_access,
  support_level = EXCLUDED.support_level,
  is_active = EXCLUDED.is_active,
  display_order = EXCLUDED.display_order,
  updated_at = NOW();
