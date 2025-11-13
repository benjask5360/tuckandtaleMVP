-- Add hair_type as a new attribute type to descriptors_attribute table
-- This allows users to select hair texture (straight, wavy, curly, etc.)

-- First, update the CHECK constraint to include 'hair_type'
ALTER TABLE descriptors_attribute
DROP CONSTRAINT IF EXISTS descriptors_attribute_attribute_type_check;

ALTER TABLE descriptors_attribute
ADD CONSTRAINT descriptors_attribute_attribute_type_check
CHECK (attribute_type IN ('hair', 'eyes', 'skin', 'body', 'hair_length', 'hair_type', 'glasses', 'pet_color', 'magical_color'));

-- Insert hair type descriptors
INSERT INTO descriptors_attribute (
    attribute_type,
    simple_term,
    rich_description,
    sort_order,
    is_active
) VALUES
    ('hair_type', 'straight', 'straight', 1, true),
    ('hair_type', 'wavy', 'wavy', 2, true),
    ('hair_type', 'curly', 'curly', 3, true),
    ('hair_type', 'coily', 'coily', 4, true),
    ('hair_type', 'kinky', 'kinky', 5, true)
ON CONFLICT (attribute_type, simple_term) DO UPDATE
SET
    rich_description = EXCLUDED.rich_description,
    sort_order = EXCLUDED.sort_order,
    is_active = EXCLUDED.is_active,
    updated_at = NOW();

-- Note: descriptor_mappings doesn't need updates as it maps profile_type to descriptor_table
-- The attribute_type 'hair_type' will be available through descriptors_attribute table