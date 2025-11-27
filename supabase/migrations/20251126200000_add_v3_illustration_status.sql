-- Add v3_illustration_status column for tracking V3 illustration generation progress
-- This JSONB column stores per-image status for cover and each scene illustration

ALTER TABLE public.content
  ADD COLUMN IF NOT EXISTS v3_illustration_status jsonb;

-- Add comment explaining the structure
COMMENT ON COLUMN public.content.v3_illustration_status IS 'V3 illustration generation status. Structure: { overall: string, cover: { status, prompt, tempUrl, imageUrl, error, attempts }, scenes: [{ paragraphIndex, status, prompt, tempUrl, imageUrl, error, attempts }] }';
