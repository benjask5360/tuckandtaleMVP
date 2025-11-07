-- Add user_type column to user_profiles table
ALTER TABLE user_profiles
ADD COLUMN IF NOT EXISTS user_type TEXT DEFAULT 'parent';

-- Add check constraint for allowed user types (if not exists)
DO $$
BEGIN
    IF NOT EXISTS (
        SELECT 1 FROM pg_constraint
        WHERE conname = 'user_type_check'
        AND conrelid = 'user_profiles'::regclass
    ) THEN
        ALTER TABLE user_profiles
        ADD CONSTRAINT user_type_check CHECK (user_type IN ('parent', 'admin'));
    END IF;
END $$;

-- Set existing users as 'parent' type (if any exist without a type)
UPDATE user_profiles
SET user_type = 'parent'
WHERE user_type IS NULL;

-- Add comment to explain the field
COMMENT ON COLUMN user_profiles.user_type IS 'User type: parent (regular users) or admin (team members)';

-- Optional: Set your team members as admin
-- You can uncomment and update these with your actual email addresses
-- UPDATE user_profiles
-- SET user_type = 'admin'
-- WHERE user_id IN (
--   SELECT id FROM auth.users WHERE email IN ('your-email@example.com', 'team-member@example.com')
-- );