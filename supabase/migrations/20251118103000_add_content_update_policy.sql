-- Add UPDATE policy for content table to allow users to edit their own stories
-- This enables the story editing feature

-- First, check if RLS is enabled (it should be)
-- If not, enable it
DO $$
BEGIN
  IF NOT (
    SELECT relrowsecurity
    FROM pg_class
    WHERE relname = 'content' AND relnamespace = 'public'::regnamespace
  ) THEN
    ALTER TABLE public.content ENABLE ROW LEVEL SECURITY;
    RAISE NOTICE 'RLS enabled on content table';
  ELSE
    RAISE NOTICE 'RLS already enabled on content table';
  END IF;
END $$;

-- Drop the policy if it exists (to allow re-running this migration)
DROP POLICY IF EXISTS "Users can update their own content" ON public.content;

-- Create policy to allow users to UPDATE their own content
CREATE POLICY "Users can update their own content"
  ON public.content
  FOR UPDATE
  TO authenticated
  USING (auth.uid() = user_id)
  WITH CHECK (auth.uid() = user_id);

-- Add comment explaining the policy
COMMENT ON POLICY "Users can update their own content" ON public.content IS
  'Allows authenticated users to update (edit) their own stories and other content. Used by the story editing feature.';
