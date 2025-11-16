-- Fix Moonlight tier to not allow library/favorites access
-- Moonlight (free tier) should not have access to story library & favorites

UPDATE subscription_tiers
SET allow_library = false
WHERE id = 'tier_free';
