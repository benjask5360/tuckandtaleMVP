-- Add foreign key constraint for avatar_cache_id in character_profiles
-- This allows Supabase to automatically join the tables

ALTER TABLE public.character_profiles
ADD CONSTRAINT character_profiles_avatar_cache_id_fkey
FOREIGN KEY (avatar_cache_id)
REFERENCES public.avatar_cache(id)
ON DELETE SET NULL;

-- Add comment for clarity
COMMENT ON COLUMN public.character_profiles.avatar_cache_id IS 'Foreign key to avatar_cache table - references the current active avatar for this character';
