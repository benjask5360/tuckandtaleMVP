-- Add 'tan' as a pet color option
INSERT INTO descriptors_attribute (attribute_type, simple_term, rich_description)
VALUES ('pet_color', 'tan', 'tan')
ON CONFLICT DO NOTHING;
