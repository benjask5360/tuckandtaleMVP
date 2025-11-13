-- Add RLS policy to allow users to create preview avatars (without character_profile_id)
-- This is needed for the avatar preview feature where users can generate avatars
-- before saving the character profile

-- Add user_id column to avatar_cache for tracking preview avatars
ALTER TABLE public.avatar_cache
ADD COLUMN IF NOT EXISTS created_by_user_id uuid REFERENCES auth.users(id);

-- Add index for efficient querying
CREATE INDEX IF NOT EXISTS idx_avatar_cache_created_by_user
ON public.avatar_cache(created_by_user_id)
WHERE character_profile_id IS NULL;

-- Drop existing policies to recreate them with preview support
DROP POLICY IF EXISTS "Users can view avatar cache" ON public.avatar_cache;
DROP POLICY IF EXISTS "Users can manage avatar cache" ON public.avatar_cache;

-- Policy for viewing avatars:
-- 1. Avatars linked to user's characters
-- 2. Preview avatars (no character_profile_id) - track by created_by_user_id
CREATE POLICY "Users can view avatar cache" ON public.avatar_cache
  FOR SELECT USING (
    -- Can view if linked to their character
    EXISTS (
      SELECT 1 FROM public.character_profiles
      WHERE character_profiles.id = avatar_cache.character_profile_id
      AND character_profiles.user_id = auth.uid()
    )
    -- OR if it's a preview avatar they created
    OR (character_profile_id IS NULL AND created_by_user_id = auth.uid())
  );

-- Policy for managing avatars (INSERT, UPDATE, DELETE):
-- 1. Avatars linked to user's characters
-- 2. Preview avatars created by the user
CREATE POLICY "Users can manage avatar cache" ON public.avatar_cache
  FOR ALL USING (
    -- Can manage if linked to their character
    EXISTS (
      SELECT 1 FROM public.character_profiles
      WHERE character_profiles.id = avatar_cache.character_profile_id
      AND character_profiles.user_id = auth.uid()
    )
    -- OR if it's a preview avatar they're creating
    OR (character_profile_id IS NULL AND created_by_user_id = auth.uid())
  );
