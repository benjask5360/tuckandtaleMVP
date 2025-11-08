-- ================================================
-- Seed Missing Descriptor Data
-- ================================================
-- Adds descriptor mappings for hair_length, body, and glasses

-- Hair Length Descriptors
INSERT INTO descriptors_attribute (attribute_type, simple_term, rich_description, sort_order, is_active) VALUES
('hair_length', 'short', 'short', 1, true),
('hair_length', 'medium', 'shoulder-length', 2, true),
('hair_length', 'long', 'long, flowing', 3, true),
('hair_length', 'very_long', 'very long, flowing', 4, true)
ON CONFLICT (attribute_type, simple_term) DO UPDATE SET
  rich_description = EXCLUDED.rich_description,
  sort_order = EXCLUDED.sort_order,
  is_active = EXCLUDED.is_active,
  updated_at = now();

-- Body Type Descriptors (enhanced versions)
INSERT INTO descriptors_attribute (attribute_type, simple_term, rich_description, sort_order, is_active) VALUES
('body', 'slim', 'slender', 1, true),
('body', 'average', 'average build', 2, true),
('body', 'athletic', 'athletic', 3, true),
('body', 'stocky', 'sturdy', 4, true)
ON CONFLICT (attribute_type, simple_term) DO UPDATE SET
  rich_description = EXCLUDED.rich_description,
  sort_order = EXCLUDED.sort_order,
  is_active = EXCLUDED.is_active,
  updated_at = now();

-- Glasses Descriptors
INSERT INTO descriptors_attribute (attribute_type, simple_term, rich_description, sort_order, is_active) VALUES
('glasses', 'true', 'wearing glasses', 1, true),
('glasses', 'false', '', 2, true)
ON CONFLICT (attribute_type, simple_term) DO UPDATE SET
  rich_description = EXCLUDED.rich_description,
  sort_order = EXCLUDED.sort_order,
  is_active = EXCLUDED.is_active,
  updated_at = now();
