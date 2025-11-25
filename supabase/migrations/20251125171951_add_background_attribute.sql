-- Add 'background' attribute_type to descriptors_attribute table
-- This adds ethnicity/background options for Child and Storybook Character profiles

-- Step 1: Update constraint to allow 'background' attribute_type
ALTER TABLE descriptors_attribute
DROP CONSTRAINT IF EXISTS descriptors_attribute_attribute_type_check;

ALTER TABLE descriptors_attribute
ADD CONSTRAINT descriptors_attribute_attribute_type_check
CHECK (attribute_type = ANY (ARRAY['hair', 'eyes', 'skin', 'body',
    'hair_length', 'glasses', 'pet_color', 'hair_type', 'magical_color', 'background']));

-- Step 2: Insert background descriptors (OMB-aligned ethnicity options)
INSERT INTO public.descriptors_attribute
  (attribute_type, simple_term, rich_description, sort_order, is_active)
VALUES
  ('background', 'white', 'White', 0, true),
  ('background', 'black_african_american', 'Black or African American', 1, true),
  ('background', 'american_indian_alaska_native', 'American Indian or Alaska Native', 2, true),
  ('background', 'asian', 'Asian', 3, true),
  ('background', 'native_hawaiian_pacific_islander', 'Native Hawaiian or Other Pacific Islander', 4, true),
  ('background', 'middle_eastern_north_african', 'Middle Eastern or North African', 5, true),
  ('background', 'hispanic_latino', 'Hispanic or Latino', 6, true),
  ('background', 'other', 'Other', 7, true);
