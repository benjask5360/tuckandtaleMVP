-- Add character limit columns to subscription_tiers table
ALTER TABLE subscription_tiers
ADD COLUMN IF NOT EXISTS max_child_profiles INTEGER,
ADD COLUMN IF NOT EXISTS max_other_characters INTEGER;

-- Set limits for Free tier
UPDATE subscription_tiers
SET
  max_child_profiles = 1,
  max_other_characters = 0
WHERE tier_name = 'free';

-- Set limits for Moonlight tier ($9.99)
UPDATE subscription_tiers
SET
  max_child_profiles = 3,
  max_other_characters = 5
WHERE tier_name = 'moonlight';

-- Set limits for Starlight tier ($19.99)
UPDATE subscription_tiers
SET
  max_child_profiles = 10,
  max_other_characters = 20
WHERE tier_name = 'starlight';

-- Set limits for Supernova tier ($39.99) - NULL means unlimited
UPDATE subscription_tiers
SET
  max_child_profiles = NULL,
  max_other_characters = NULL
WHERE tier_name = 'supernova';

-- Add comment to explain NULL values
COMMENT ON COLUMN subscription_tiers.max_child_profiles IS 'Maximum number of child profiles allowed for this tier. NULL means unlimited.';
COMMENT ON COLUMN subscription_tiers.max_other_characters IS 'Maximum number of other characters (pets, storybook, magical) allowed for this tier. NULL means unlimited.';