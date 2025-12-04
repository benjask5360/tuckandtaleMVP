-- Migration: Add purchased_story_count for one-for-one preview slot progression
-- Each individual story purchase unlocks exactly ONE additional preview slot
-- Formula: maxPreviewStory = 2 + purchased_story_count

-- =====================================================
-- PART 1: Add purchased_story_count column to user_profiles
-- =====================================================

ALTER TABLE user_profiles ADD COLUMN IF NOT EXISTS
  purchased_story_count INTEGER DEFAULT 0;

COMMENT ON COLUMN user_profiles.purchased_story_count IS
  'Number of individual story purchases. Each purchase unlocks one additional preview slot. Formula: maxPreviewStory = 2 + purchased_story_count';

-- =====================================================
-- PART 2: Create index for performance
-- =====================================================

CREATE INDEX IF NOT EXISTS idx_user_profiles_purchased_count
  ON user_profiles(purchased_story_count)
  WHERE purchased_story_count > 0;

-- =====================================================
-- PART 3: RPC function to increment purchased_story_count
-- =====================================================

CREATE OR REPLACE FUNCTION increment_purchased_story_count(p_user_id UUID)
RETURNS INTEGER
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
DECLARE
  new_count INTEGER;
BEGIN
  UPDATE user_profiles
  SET purchased_story_count = purchased_story_count + 1,
      updated_at = NOW()
  WHERE id = p_user_id
  RETURNING purchased_story_count INTO new_count;

  RETURN new_count;
END;
$$;

-- =====================================================
-- PART 4: Backfill purchased_story_count from story_purchases table
-- =====================================================

-- Count single_story purchases for each user and backfill
UPDATE user_profiles up
SET purchased_story_count = (
  SELECT COUNT(*)
  FROM story_purchases sp
  WHERE sp.user_id = up.id
    AND sp.purchase_type = 'single_story'
)
WHERE EXISTS (
  SELECT 1 FROM story_purchases sp
  WHERE sp.user_id = up.id
    AND sp.purchase_type = 'single_story'
);
