-- Add infant/baby hair length option to descriptors_attribute table
-- This provides a realistic hair option for babies and very young children

INSERT INTO descriptors_attribute (
    attribute_type,
    simple_term,
    rich_description,
    sort_order,
    is_active
) VALUES (
    'hair_length',
    'infant_hair',
    'very short soft baby hair',
    0,  -- Sort before 'short' to appear first for babies
    true
)
ON CONFLICT (attribute_type, simple_term) DO UPDATE
SET
    rich_description = EXCLUDED.rich_description,
    sort_order = EXCLUDED.sort_order,
    is_active = EXCLUDED.is_active,
    updated_at = NOW();

-- Update sort orders for existing hair_length options to maintain proper ordering
UPDATE descriptors_attribute
SET sort_order = CASE simple_term
    WHEN 'infant_hair' THEN 0
    WHEN 'short' THEN 1
    WHEN 'medium' THEN 2
    WHEN 'long' THEN 3
    WHEN 'very_long' THEN 4
    WHEN 'bald' THEN 5
    ELSE sort_order
END
WHERE attribute_type = 'hair_length';