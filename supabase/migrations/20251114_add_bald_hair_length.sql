-- Add "bald" as a hair_length option
-- This allows characters to have no hair

INSERT INTO descriptors_attribute (attribute_type, simple_term, rich_description, sort_order, is_active)
VALUES ('hair_length', 'bald', 'bald', 5, true)
ON CONFLICT (attribute_type, simple_term) DO NOTHING;
