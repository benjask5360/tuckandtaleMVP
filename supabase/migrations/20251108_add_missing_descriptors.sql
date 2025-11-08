-- ================================================
-- Add Missing Descriptor Attribute Types
-- ================================================
-- Adds support for hair_length and glasses to the descriptor_attribute table

-- Update CHECK constraint to include new attribute types
ALTER TABLE descriptors_attribute
DROP CONSTRAINT IF EXISTS descriptors_attribute_attribute_type_check;

ALTER TABLE descriptors_attribute
ADD CONSTRAINT descriptors_attribute_attribute_type_check
CHECK (attribute_type IN ('hair', 'eyes', 'skin', 'body', 'hair_length', 'glasses'));
