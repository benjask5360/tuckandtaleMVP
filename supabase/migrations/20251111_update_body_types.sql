-- ========================================
-- Update Body Type Descriptors
-- ========================================
-- Replaces height-based descriptors with build-focused options
-- New options: petite, average, athletic, strong, husky, round

-- Step 1: Delete existing body type descriptors
DELETE FROM public.descriptors_attribute
WHERE attribute_type = 'body';

-- Step 2: Insert new body type descriptors
INSERT INTO public.descriptors_attribute (attribute_type, simple_term, rich_description, sort_order) VALUES
('body', 'petite', 'petite build', 1),
('body', 'average', 'average build', 2),
('body', 'athletic', 'athletic build', 3),
('body', 'strong', 'strong build', 4),
('body', 'husky', 'husky build', 5),
('body', 'round', 'round build', 6);

-- Add comment for documentation
COMMENT ON COLUMN public.descriptors_attribute.simple_term IS 'User-facing term for selection (e.g., "petite", "husky")';
COMMENT ON COLUMN public.descriptors_attribute.rich_description IS 'Enhanced description for AI prompts (e.g., "petite build", "round build")';

-- ========================================
-- Verification Query
-- ========================================
-- Run this to verify the new body types:
-- SELECT simple_term, rich_description, sort_order
-- FROM public.descriptors_attribute
-- WHERE attribute_type = 'body'
-- ORDER BY sort_order;
