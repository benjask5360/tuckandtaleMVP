-- Add magical_color and hair_type to descriptors_attribute constraint
-- This allows magical creatures to have their own distinct color attribute separate from pet colors

-- Step 1: Drop the existing constraint
ALTER TABLE descriptors_attribute
DROP CONSTRAINT IF EXISTS descriptors_attribute_attribute_type_check;

-- Step 2: Add the updated constraint with magical_color and hair_type
ALTER TABLE descriptors_attribute
ADD CONSTRAINT descriptors_attribute_attribute_type_check
CHECK (attribute_type = ANY (ARRAY['hair', 'eyes', 'skin', 'body', 'hair_length', 'hair_type', 'glasses', 'pet_color', 'magical_color']));

-- Step 3: Insert magical creature color descriptors with enchanting descriptions
INSERT INTO descriptors_attribute (attribute_type, simple_term, rich_description, sort_order) VALUES
('magical_color', 'gold', 'shimmering golden', 10),
('magical_color', 'silver', 'gleaming silver', 20),
('magical_color', 'rainbow', 'iridescent rainbow', 30),
('magical_color', 'purple', 'mystical purple', 40),
('magical_color', 'blue', 'celestial blue', 50),
('magical_color', 'green', 'emerald green', 60),
('magical_color', 'red', 'fiery crimson', 70),
('magical_color', 'white', 'pure luminous white', 80),
('magical_color', 'black', 'midnight obsidian', 90)
ON CONFLICT DO NOTHING;
