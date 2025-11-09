-- ================================================
-- Add 'pet_color' to Attribute Type Check Constraint
-- ================================================
-- Allows pet color descriptors in descriptors_attribute table

-- Drop the existing constraint
ALTER TABLE public.descriptors_attribute
DROP CONSTRAINT IF EXISTS descriptors_attribute_attribute_type_check;

-- Recreate with pet_color included
ALTER TABLE public.descriptors_attribute
ADD CONSTRAINT descriptors_attribute_attribute_type_check
CHECK (attribute_type IN ('hair', 'eyes', 'skin', 'body', 'hair_length', 'glasses', 'pet_color'));

-- Add comment
COMMENT ON COLUMN public.descriptors_attribute.attribute_type IS
'Type of physical attribute. Includes: hair (human hair color), eyes, skin, body, hair_length, glasses, pet_color (fur/feathers/scales for animals)';
