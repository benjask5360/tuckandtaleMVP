-- Add story_illustrations JSONB field to content table
-- This field stores an array of illustration objects for stories
-- Supports both the initial 3x3 grid and future spliced individual scene images

ALTER TABLE content
ADD COLUMN IF NOT EXISTS story_illustrations jsonb;

-- Add comment to explain the field's purpose
COMMENT ON COLUMN content.story_illustrations IS
'Array of illustration objects for stories. Each object contains type (grid_3x3, scene_0-8), URL, generation timestamp, and metadata. Supports both full grid illustrations and individual spliced scenes.';

-- Add index for efficient querying of illustration types
CREATE INDEX IF NOT EXISTS idx_content_story_illustrations_type
ON content USING gin ((story_illustrations));

-- Insert AI config for story illustration generation using Google Gemini
INSERT INTO public.ai_configs (
  id,
  name,
  purpose,
  provider,
  model_id,
  model_name,
  model_type,
  settings,
  is_active,
  is_default,
  created_at,
  updated_at
)
VALUES (
  gen_random_uuid(),
  'google_gemini_flash_image_story_illustration',
  'story_illustration',
  'google',
  'gemini-2.5-flash-image',
  'Gemini 2.5 Flash Image (Nano Banana)',
  'image',
  jsonb_build_object(
    'aspectRatio', '1:1',
    'width', 1024,
    'height', 1024,
    'responseModalities', ARRAY['Image'],
    'temperature', 1,
    'topP', 0.95,
    'maxOutputTokens', 32768
  ),
  true,
  true,
  now(),
  now()
)
ON CONFLICT (name) DO UPDATE SET
  settings = EXCLUDED.settings,
  updated_at = now();