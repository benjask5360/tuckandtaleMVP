-- Migration: Add generation status field for streaming story generation
-- Created: 2025-11-21
-- Purpose: Support progressive story generation with instant redirect

-- Add generation_status column to content table
ALTER TABLE public.content
  ADD COLUMN IF NOT EXISTS generation_status text DEFAULT 'complete';

-- Add constraint for valid status values (only if it doesn't exist)
DO $$
BEGIN
  IF NOT EXISTS (
    SELECT 1 FROM pg_constraint
    WHERE conname = 'content_generation_status_check'
  ) THEN
    ALTER TABLE public.content
      ADD CONSTRAINT content_generation_status_check
      CHECK (generation_status IN ('generating', 'text_complete', 'complete', 'error'));
  END IF;
END $$;

-- Add comment explaining the column
COMMENT ON COLUMN public.content.generation_status IS 'Status of story generation: generating (in progress), text_complete (text done, illustrations pending), complete (all done), error';

-- Create index for faster filtering by generation status
CREATE INDEX IF NOT EXISTS idx_content_generation_status ON public.content(generation_status);

-- Update existing stories to be marked as complete
UPDATE public.content
SET generation_status = 'complete'
WHERE generation_status IS NULL;