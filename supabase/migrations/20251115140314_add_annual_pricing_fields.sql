-- Add annual pricing support to subscription_tiers table
-- Note: price_yearly column already exists from initial schema, we only need to add price_yearly_promo

-- 1. Add annual promo price field (price_yearly already exists)
ALTER TABLE subscription_tiers
ADD COLUMN IF NOT EXISTS price_yearly_promo NUMERIC(10,2);

-- Add comment for documentation
COMMENT ON COLUMN subscription_tiers.price_yearly_promo IS 'Promotional annual price (when promo_active is true)';

-- 2. Set REAL (non-promo) annual prices
-- Free Tier
UPDATE subscription_tiers
SET price_yearly = 0.00
WHERE id = 'tier_free';

-- Basic Tier (Annual) - ~2 months free discount
UPDATE subscription_tiers
SET price_yearly = 199.99
WHERE id = 'tier_basic';

-- Plus Tier (Annual) - ~2 months free discount
UPDATE subscription_tiers
SET price_yearly = 299.99
WHERE id = 'tier_plus';

-- Premium Tier (Coming Soon)
UPDATE subscription_tiers
SET price_yearly = NULL
WHERE id = 'tier_premium';

-- 3. Set PROMO annual prices (50% off structure)
-- Free Tier
UPDATE subscription_tiers
SET price_yearly_promo = 0.00
WHERE id = 'tier_free';

-- Basic Tier Promo Annual
UPDATE subscription_tiers
SET price_yearly_promo = 99.99
WHERE id = 'tier_basic';

-- Plus Tier Promo Annual
UPDATE subscription_tiers
SET price_yearly_promo = 149.99
WHERE id = 'tier_plus';

-- Premium Tier (Coming Soon)
UPDATE subscription_tiers
SET price_yearly_promo = NULL
WHERE id = 'tier_premium';

-- Done! Annual pricing structure:
-- tier_free:    $0.00/year (always free)
-- tier_basic:   $199.99/year regular ($239.88 if paid monthly) / $99.99/year promo
-- tier_plus:    $299.99/year regular ($359.88 if paid monthly) / $149.99/year promo
-- tier_premium: Not yet priced (placeholder tier)