-- Add anonymization tracking fields for GDPR compliance

-- Add anonymized_at to content table
ALTER TABLE content
ADD COLUMN IF NOT EXISTS anonymized_at TIMESTAMPTZ;

-- Add deleted_at to user_profiles for soft deletion tracking
ALTER TABLE user_profiles
ADD COLUMN IF NOT EXISTS deleted_at TIMESTAMPTZ;

-- Create index for querying anonymized content
CREATE INDEX IF NOT EXISTS idx_content_anonymized_at ON content(anonymized_at);

-- Create index for querying deleted user profiles
CREATE INDEX IF NOT EXISTS idx_user_profiles_deleted_at ON user_profiles(deleted_at);

COMMENT ON COLUMN content.anonymized_at IS 'Timestamp when user_id was anonymized due to account deletion';
COMMENT ON COLUMN user_profiles.deleted_at IS 'Timestamp when user profile was marked for deletion';
