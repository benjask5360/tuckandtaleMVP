-- Add Growth Categories as Separate Parameter Type
-- Allows users to select category first, then see filtered topics

-- ============================================================================
-- UPDATE TYPE CHECK CONSTRAINT
-- ============================================================================
-- Add 'growth_category' to the allowed types

ALTER TABLE public.story_parameters
  DROP CONSTRAINT IF EXISTS story_parameters_type_check;

ALTER TABLE public.story_parameters
  ADD CONSTRAINT story_parameters_type_check
  CHECK (type IN ('genre', 'tone', 'length', 'growth_topic', 'growth_category'));

-- ============================================================================
-- INSERT GROWTH CATEGORIES
-- ============================================================================

INSERT INTO public.story_parameters (type, name, display_name, description, metadata, display_order, is_active)
VALUES
  (
    'growth_category',
    'emotional_social',
    'Emotional & Social Growth',
    'Managing feelings, making friends, and understanding emotions',
    jsonb_build_object(
      'icon', '❤️',
      'description_long', 'Stories that help children understand and express their emotions, build friendships, develop empathy, and navigate social situations with confidence and kindness.'
    ),
    1,
    true
  ),
  (
    'growth_category',
    'self_control_habits',
    'Self-Control & Habits',
    'Building routines and practicing self-regulation',
    jsonb_build_object(
      'icon', '🌟',
      'description_long', 'Stories that teach children healthy habits, self-control, patience, and the importance of routines like bedtime, hygiene, and cleaning up. Helps build independence and responsibility.'
    ),
    2,
    true
  ),
  (
    'growth_category',
    'confidence_mindset',
    'Confidence & Growth Mindset',
    'Trying new things and believing in yourself',
    jsonb_build_object(
      'icon', '💪',
      'description_long', 'Stories that encourage children to be brave, try new experiences, learn from mistakes, and develop a growth mindset. Celebrates persistence, problem-solving, and self-belief.'
    ),
    3,
    true
  ),
  (
    'growth_category',
    'responsibility_empathy',
    'Responsibility & Empathy',
    'Caring for others and doing the right thing',
    jsonb_build_object(
      'icon', '🌍',
      'description_long', 'Stories that teach children about responsibility, honesty, helping others, respecting differences, and caring for pets, plants, and the planet. Builds character and empathy.'
    ),
    4,
    true
  ),
  (
    'growth_category',
    'family_situations',
    'Everyday Family Situations',
    'Handling changes and family experiences',
    jsonb_build_object(
      'icon', '🏠',
      'description_long', 'Stories that help children navigate common family situations like welcoming a new sibling, moving homes, saying goodbye, managing screen time, and building strong family bonds.'
    ),
    5,
    true
  );

-- ============================================================================
-- UPDATE GROWTH TOPICS WITH CATEGORY REFERENCE
-- ============================================================================
-- Add category_name to growth topics metadata for easy filtering

UPDATE public.story_parameters
SET metadata = metadata || jsonb_build_object('category_name', 'emotional_social')
WHERE type = 'growth_topic'
  AND metadata->>'category' = 'Emotional & Social Growth';

UPDATE public.story_parameters
SET metadata = metadata || jsonb_build_object('category_name', 'self_control_habits')
WHERE type = 'growth_topic'
  AND metadata->>'category' = 'Self-Control & Habits';

UPDATE public.story_parameters
SET metadata = metadata || jsonb_build_object('category_name', 'confidence_mindset')
WHERE type = 'growth_topic'
  AND metadata->>'category' = 'Confidence & Growth Mindset';

UPDATE public.story_parameters
SET metadata = metadata || jsonb_build_object('category_name', 'responsibility_empathy')
WHERE type = 'growth_topic'
  AND metadata->>'category' = 'Responsibility & Empathy';

UPDATE public.story_parameters
SET metadata = metadata || jsonb_build_object('category_name', 'family_situations')
WHERE type = 'growth_topic'
  AND metadata->>'category' = 'Everyday Family Situations';

-- ============================================================================
-- DISPLAY RESULTS
-- ============================================================================

DO $$
DECLARE
  category_count integer;
  topic_count integer;
BEGIN
  SELECT COUNT(*) INTO category_count FROM public.story_parameters WHERE type = 'growth_category';
  SELECT COUNT(*) INTO topic_count FROM public.story_parameters WHERE type = 'growth_topic';

  RAISE NOTICE '===========================================';
  RAISE NOTICE 'Growth categories added successfully!';
  RAISE NOTICE '===========================================';
  RAISE NOTICE 'Growth categories: %', category_count;
  RAISE NOTICE 'Growth topics: %', topic_count;
  RAISE NOTICE '';
  RAISE NOTICE 'Growth topics now have category_name in metadata';
  RAISE NOTICE 'for easy filtering on the frontend.';
  RAISE NOTICE '===========================================';
END $$;
