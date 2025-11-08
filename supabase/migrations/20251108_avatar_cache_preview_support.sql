-- ================================================
-- Avatar Cache Preview Support Migration
-- ================================================
-- Makes columns nullable to support preview avatar generation
-- where character_profile_id and storage details aren't available yet

-- Make columns nullable for preview mode
ALTER TABLE public.avatar_cache
ALTER COLUMN character_profile_id DROP NOT NULL,
ALTER COLUMN storage_path DROP NOT NULL,
ALTER COLUMN image_url DROP NOT NULL,
ALTER COLUMN style DROP NOT NULL,
ALTER COLUMN prompt_used DROP NOT NULL;

-- Add comment explaining preview avatars
COMMENT ON COLUMN public.avatar_cache.character_profile_id IS
'Character ID. NULL for preview avatars that haven''t been linked to a character yet.';
