-- Migration: Rename body type 'petite' to 'slender' in descriptors_attribute table
-- Date: 2025-11-23

-- Update the simple_term from 'petite' to 'slender' for body type descriptor
UPDATE descriptors_attribute
SET
  simple_term = 'slender',
  updated_at = NOW()
WHERE
  attribute_type = 'body'
  AND simple_term = 'petite';
