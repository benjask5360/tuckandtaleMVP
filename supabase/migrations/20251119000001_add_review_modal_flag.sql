-- Add flag to track if user has been shown the review modal
-- This ensures the modal only shows on the user's first favorite

ALTER TABLE user_profiles
ADD COLUMN IF NOT EXISTS has_shown_review_modal BOOLEAN NOT NULL DEFAULT false;

-- Create index for faster queries when checking this flag
CREATE INDEX IF NOT EXISTS idx_user_profiles_review_modal ON user_profiles(has_shown_review_modal)
WHERE has_shown_review_modal = false;

COMMENT ON COLUMN user_profiles.has_shown_review_modal IS 'Track if user has been shown the review request modal (shown only on first favorite)';
