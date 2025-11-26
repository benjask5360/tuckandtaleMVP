-- Migration: Add illustration upload tracking columns
-- Created: 2025-11-26
-- Purpose: Support fast Leonardo URL display with background Supabase upload

-- Add columns for temporary URLs and upload status tracking
ALTER TABLE public.content
  ADD COLUMN IF NOT EXISTS temp_cover_url text,
  ADD COLUMN IF NOT EXISTS illustration_upload_status text DEFAULT 'pending';

-- Add comments explaining the columns
COMMENT ON COLUMN public.content.temp_cover_url IS 'Temporary Leonardo CDN URL for cover (valid ~24h), used before Supabase upload completes';
COMMENT ON COLUMN public.content.illustration_upload_status IS 'Background upload status: pending, uploading, complete, failed';

-- Note: story_scenes JSON will include tempUrl field alongside illustrationUrl
-- Schema: { paragraph, charactersInScene[], illustrationPrompt, tempUrl?, illustrationUrl? }
