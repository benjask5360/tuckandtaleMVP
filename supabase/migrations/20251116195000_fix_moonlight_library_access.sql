-- Fix Moonlight tier library and favorites access
-- Moonlight (free tier) should have access to library but NOT favorites
-- Only paid tiers get the favorites feature

UPDATE subscription_tiers
SET
  allow_library = true,
  allow_favorites = false
WHERE id = 'tier_free';

-- Ensure paid tiers have both library and favorites
UPDATE subscription_tiers
SET
  allow_library = true,
  allow_favorites = true
WHERE id IN ('tier_basic', 'tier_plus');
