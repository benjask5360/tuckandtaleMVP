-- Migration: Update "Managing Big Feelings" to "Tantrums & Big Feelings"
-- Description: Rename topic, set as first item, and update category description for Facebook ad alignment

-- Change 1: Rename topic and set to display first in Emotional & Social Growth category
UPDATE story_parameters
SET
  display_name = 'Tantrums & Big Feelings',
  display_order = 0
WHERE
  type = 'growth_topic'
  AND display_name = 'Managing Big Feelings';

-- Change 2: Update Emotional & Social Growth category description to emphasize tantrums
UPDATE story_parameters
SET description = 'Stories that help children manage tantrums and big feelings, understand and express their emotions, build friendships, develop empathy, and navigate social situations with confidence and kindness.'
WHERE
  type = 'growth_category'
  AND display_name = 'Emotional & Social Growth';
