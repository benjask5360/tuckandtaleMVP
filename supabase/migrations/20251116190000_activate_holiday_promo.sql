-- Activate holiday promotional pricing for paid tiers
-- This enables the 50% off holiday promotion for Starlight and Supernova plans

UPDATE subscription_tiers
SET promo_active = true
WHERE id IN ('tier_basic', 'tier_plus');
