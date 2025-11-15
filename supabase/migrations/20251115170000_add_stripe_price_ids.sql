-- Add Stripe price ID columns to subscription_tiers table
-- These will store the Stripe Price IDs for checkout sessions

-- Add columns for Stripe price IDs
ALTER TABLE public.subscription_tiers
ADD COLUMN stripe_price_monthly TEXT,
ADD COLUMN stripe_price_monthly_promo TEXT,
ADD COLUMN stripe_price_yearly TEXT,
ADD COLUMN stripe_price_yearly_promo TEXT;

-- Update Moonlight (tier_free) - No Stripe prices as it's free
UPDATE public.subscription_tiers
SET
  stripe_price_monthly = NULL,
  stripe_price_monthly_promo = NULL,
  stripe_price_yearly = NULL,
  stripe_price_yearly_promo = NULL
WHERE id = 'tier_free';

-- Update Starlight (tier_basic) with Stripe Price IDs
UPDATE public.subscription_tiers
SET
  stripe_price_monthly = 'price_1SToQlAxMZBrawG595QKRUBc', -- $19.95/mo
  stripe_price_monthly_promo = 'price_1SToSUAxMZBrawG5yJ8vLfMJ', -- $9.95/mo promo
  stripe_price_yearly = 'price_1SToTaAxMZBrawG5PQkClHVQ', -- $149.95/yr
  stripe_price_yearly_promo = 'price_1SToU8AxMZBrawG5xltV8kU2' -- $99.95/yr promo
WHERE id = 'tier_basic';

-- Update Supernova (tier_plus) with Stripe Price IDs
UPDATE public.subscription_tiers
SET
  stripe_price_monthly = 'price_1SToVKAxMZBrawG5KYNsYeir', -- $29.95/mo
  stripe_price_monthly_promo = 'price_1SToVmAxMZBrawG5jxKtnzVK', -- $14.95/mo promo
  stripe_price_yearly = 'price_1SToWGAxMZBrawG5nmBD4cDM', -- $249.95/yr
  stripe_price_yearly_promo = 'price_1SToWYAxMZBrawG5DRWZhdLp' -- $149.95/yr promo
WHERE id = 'tier_plus';

-- Update Premium (tier_premium) - Placeholder, no active prices yet
UPDATE public.subscription_tiers
SET
  stripe_price_monthly = NULL,
  stripe_price_monthly_promo = NULL,
  stripe_price_yearly = NULL,
  stripe_price_yearly_promo = NULL
WHERE id = 'tier_premium';

-- Add Stripe-related columns to user_profiles if they don't exist
ALTER TABLE public.user_profiles
ADD COLUMN IF NOT EXISTS stripe_customer_id TEXT,
ADD COLUMN IF NOT EXISTS stripe_subscription_id TEXT,
ADD COLUMN IF NOT EXISTS subscription_starts_at TIMESTAMP WITH TIME ZONE,
ADD COLUMN IF NOT EXISTS subscription_ends_at TIMESTAMP WITH TIME ZONE,
ADD COLUMN IF NOT EXISTS subscription_status TEXT DEFAULT 'inactive';

-- Create index on stripe_customer_id for faster lookups
CREATE INDEX IF NOT EXISTS idx_user_profiles_stripe_customer
ON public.user_profiles(stripe_customer_id)
WHERE stripe_customer_id IS NOT NULL;

-- Create index on stripe_subscription_id for faster lookups
CREATE INDEX IF NOT EXISTS idx_user_profiles_stripe_subscription
ON public.user_profiles(stripe_subscription_id)
WHERE stripe_subscription_id IS NOT NULL;

-- Add comment explaining the price structure
COMMENT ON COLUMN public.subscription_tiers.stripe_price_monthly IS 'Stripe Price ID for regular monthly billing';
COMMENT ON COLUMN public.subscription_tiers.stripe_price_monthly_promo IS 'Stripe Price ID for promotional monthly billing';
COMMENT ON COLUMN public.subscription_tiers.stripe_price_yearly IS 'Stripe Price ID for regular annual billing';
COMMENT ON COLUMN public.subscription_tiers.stripe_price_yearly_promo IS 'Stripe Price ID for promotional annual billing';