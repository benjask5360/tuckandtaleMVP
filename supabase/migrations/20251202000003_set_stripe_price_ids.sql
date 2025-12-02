-- Set Stripe price IDs for Stories Plus tier
UPDATE subscription_tiers
SET
  stripe_price_monthly = 'price_1SZyKrBpMc7tEVZS7CdeGinl',
  updated_at = NOW()
WHERE id = 'tier_stories_plus';
