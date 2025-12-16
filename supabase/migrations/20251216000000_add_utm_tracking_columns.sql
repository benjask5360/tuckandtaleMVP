-- Add UTM tracking columns to user_profiles
-- These capture the marketing source that led to signup

ALTER TABLE user_profiles ADD COLUMN IF NOT EXISTS utm_source TEXT;
ALTER TABLE user_profiles ADD COLUMN IF NOT EXISTS utm_medium TEXT;
ALTER TABLE user_profiles ADD COLUMN IF NOT EXISTS utm_campaign TEXT;

COMMENT ON COLUMN user_profiles.utm_source IS 'UTM source parameter from signup (e.g., facebook, google)';
COMMENT ON COLUMN user_profiles.utm_medium IS 'UTM medium parameter from signup (e.g., cpc, email)';
COMMENT ON COLUMN user_profiles.utm_campaign IS 'UTM campaign parameter from signup (e.g., holiday_promo)';
