-- Add story_illustration_prompt field to content table
-- This field stores the OpenAI-generated illustration prompt for creating a 3x3 grid of story scenes
-- Used when "Include Illustrations" toggle is enabled during text story generation

ALTER TABLE content
ADD COLUMN IF NOT EXISTS story_illustration_prompt text;

-- Add comment to explain the field's purpose
COMMENT ON COLUMN content.story_illustration_prompt IS
'OpenAI-generated prompt for creating story illustrations. Contains a 3x3 grid description with character introductions and 8 scene descriptions in Disney Pixar style. Only populated when includeIllustrations flag is set during story generation.';

-- Also add a flag to track whether illustrations were requested
ALTER TABLE content
ADD COLUMN IF NOT EXISTS include_illustrations boolean DEFAULT false;

COMMENT ON COLUMN content.include_illustrations IS
'Flag indicating whether illustration prompt generation was requested for this story.';