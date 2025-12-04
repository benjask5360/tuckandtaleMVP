-- Add v3_illustration_system_prompt column to store the OpenAI system prompt
-- used to generate illustration prompts for V3 stories

ALTER TABLE public.content
  ADD COLUMN IF NOT EXISTS v3_illustration_system_prompt text;

COMMENT ON COLUMN public.content.v3_illustration_system_prompt IS 'The full system prompt sent to OpenAI to generate illustration prompts for V3 stories. Used for debugging and inspection.';
