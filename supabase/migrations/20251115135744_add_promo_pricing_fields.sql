-- Add promo pricing fields to subscription_tiers table

-- 1. Add new promo pricing columns
ALTER TABLE subscription_tiers
ADD COLUMN price_monthly_promo NUMERIC(10,2);

ALTER TABLE subscription_tiers
ADD COLUMN promo_active BOOLEAN NOT NULL DEFAULT false;

-- Add comments for documentation
COMMENT ON COLUMN subscription_tiers.price_monthly_promo IS 'Promotional monthly price (when promo_active is true)';
COMMENT ON COLUMN subscription_tiers.promo_active IS 'Whether promotional pricing is currently active for this tier';

-- 2. Set the correct real (non-discount) monthly prices
UPDATE subscription_tiers
SET price_monthly = 0.00
WHERE id = 'tier_free';

UPDATE subscription_tiers
SET price_monthly = 19.99
WHERE id = 'tier_basic';

UPDATE subscription_tiers
SET price_monthly = 29.99
WHERE id = 'tier_plus';

UPDATE subscription_tiers
SET price_monthly = NULL
WHERE id = 'tier_premium';

-- 3. Set promo pricing values
UPDATE subscription_tiers
SET price_monthly_promo = 0.00
WHERE id = 'tier_free';

UPDATE subscription_tiers
SET price_monthly_promo = 9.99
WHERE id = 'tier_basic';

UPDATE subscription_tiers
SET price_monthly_promo = 14.99
WHERE id = 'tier_plus';

UPDATE subscription_tiers
SET price_monthly_promo = NULL
WHERE id = 'tier_premium';

-- 4. Leave promo_active as FALSE for all tiers (default)
-- Promos will be activated manually later when needed

-- Done! Pricing structure:
-- tier_free:    $0.00 (always free)
-- tier_basic:   $19.99 regular / $9.99 promo
-- tier_plus:    $29.99 regular / $14.99 promo
-- tier_premium: Not yet priced (placeholder tier)