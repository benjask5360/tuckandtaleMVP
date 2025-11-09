-- Seed Data for Story Parameters
-- Populates the story_parameters table with initial genres, tones, and lengths

-- ============================================================================
-- 1. GENRES
-- ============================================================================

INSERT INTO public.story_parameters (type, name, display_name, description, display_order, is_active)
VALUES
  ('genre', 'adventure', 'Adventure', 'Exciting quests and explorations', 1, true),
  ('genre', 'fantasy', 'Fantasy', 'Magical worlds and enchanted creatures', 2, true),
  ('genre', 'fairy_tale', 'Fairy Tale', 'Classic magical stories with lessons', 3, true),
  ('genre', 'friendship', 'Friendship', 'Stories about friends and relationships', 4, true),
  ('genre', 'animals', 'Animals', 'Animal characters and nature', 5, true),
  ('genre', 'space', 'Space', 'Adventures in space and among the stars', 6, true),
  ('genre', 'family', 'Family', 'Family adventures and relationships', 7, true),
  ('genre', 'custom', 'Custom', 'Let your imagination decide!', 99, true)
ON CONFLICT (type, name) DO UPDATE
SET
  display_name = EXCLUDED.display_name,
  description = EXCLUDED.description,
  display_order = EXCLUDED.display_order,
  updated_at = now();

-- ============================================================================
-- 2. TONES / STYLES
-- ============================================================================

INSERT INTO public.story_parameters (type, name, display_name, description, display_order, is_active)
VALUES
  ('tone', 'classic_bedtime', 'Classic Bedtime', 'Gentle, calming stories perfect for bedtime', 1, true),
  ('tone', 'pixar_adventure', 'Pixar Adventure', 'Exciting, heartfelt adventures with humor', 2, true),
  ('tone', 'disney_princess', 'Disney Princess', 'Magical fairy tale style with heart', 3, true),
  ('tone', 'funny_silly', 'Funny & Silly', 'Playful and humorous stories', 4, true),
  ('tone', 'gentle_calming', 'Gentle & Calming', 'Soothing stories with peaceful themes', 5, true),
  ('tone', 'rhyming_seuss', 'Rhyming / Dr. Seuss-like', 'Fun, rhythmic stories that rhyme', 6, true)
ON CONFLICT (type, name) DO UPDATE
SET
  display_name = EXCLUDED.display_name,
  description = EXCLUDED.description,
  display_order = EXCLUDED.display_order,
  updated_at = now();

-- ============================================================================
-- 3. STORY LENGTHS
-- ============================================================================
-- metadata contains word counts and paragraph targets

INSERT INTO public.story_parameters (type, name, display_name, description, metadata, display_order, is_active)
VALUES
  (
    'length',
    'short',
    'Short Story',
    'Perfect for a quick bedtime story (3-4 minutes)',
    jsonb_build_object(
      'paragraph_count_min', 3,
      'paragraph_count_max', 4,
      'word_count_min', 250,
      'word_count_max', 350,
      'estimated_reading_minutes', 3
    ),
    1,
    true
  ),
  (
    'length',
    'medium',
    'Medium Story',
    'A cozy story with more detail (5-7 minutes)',
    jsonb_build_object(
      'paragraph_count_min', 5,
      'paragraph_count_max', 6,
      'word_count_min', 350,
      'word_count_max', 550,
      'estimated_reading_minutes', 5
    ),
    2,
    true
  ),
  (
    'length',
    'long',
    'Long Story',
    'An immersive adventure (8-10 minutes)',
    jsonb_build_object(
      'paragraph_count_min', 7,
      'paragraph_count_max', 9,
      'word_count_min', 550,
      'word_count_max', 850,
      'estimated_reading_minutes', 9
    ),
    3,
    true
  )
ON CONFLICT (type, name) DO UPDATE
SET
  display_name = EXCLUDED.display_name,
  description = EXCLUDED.description,
  metadata = EXCLUDED.metadata,
  display_order = EXCLUDED.display_order,
  updated_at = now();

-- ============================================================================
-- 4. GROWTH TOPICS (Placeholder - User will provide specific topics)
-- ============================================================================
-- These are example growth topics to demonstrate the structure
-- User will provide the finalized list later

INSERT INTO public.story_parameters (type, name, display_name, description, metadata, display_order, is_active)
VALUES
  (
    'growth_topic',
    'sharing',
    'Sharing & Taking Turns',
    'Learning to share with others',
    jsonb_build_object(
      'category', 'Social Skills',
      'prompt_guidance', 'Create a story where the character learns the joy and importance of sharing with friends or siblings. Show both the challenge and the reward of sharing.'
    ),
    1,
    true
  ),
  (
    'growth_topic',
    'emotions',
    'Understanding Emotions',
    'Identifying and expressing feelings',
    jsonb_build_object(
      'category', 'Emotional Intelligence',
      'prompt_guidance', 'Create a story that helps the character identify different emotions (happy, sad, angry, scared) and learn healthy ways to express them. Use clear emotion words and validate all feelings.'
    ),
    2,
    true
  ),
  (
    'growth_topic',
    'bedtime_routine',
    'Bedtime Routine',
    'Making bedtime easier and more fun',
    jsonb_build_object(
      'category', 'Daily Routines',
      'prompt_guidance', 'Create a story that makes bedtime feel calm, safe, and positive. Show a gentle bedtime routine and emphasize the comfort and security of sleep.'
    ),
    3,
    true
  ),
  (
    'growth_topic',
    'trying_new_things',
    'Trying New Things',
    'Building courage and confidence',
    jsonb_build_object(
      'category', 'Confidence',
      'prompt_guidance', 'Create a story where the character faces something new and scary, but discovers it''s not so bad. Show that trying new things can lead to wonderful experiences. Celebrate small acts of bravery.'
    ),
    4,
    true
  ),
  (
    'growth_topic',
    'kindness',
    'Kindness & Empathy',
    'Being kind to others',
    jsonb_build_object(
      'category', 'Character Values',
      'prompt_guidance', 'Create a story that demonstrates acts of kindness and shows how helping others feels good. Include perspective-taking moments where the character considers how others feel.'
    ),
    5,
    true
  )
ON CONFLICT (type, name) DO UPDATE
SET
  display_name = EXCLUDED.display_name,
  description = EXCLUDED.description,
  metadata = EXCLUDED.metadata,
  display_order = EXCLUDED.display_order,
  updated_at = now();

-- ============================================================================
-- SEED DATA COMPLETE
-- ============================================================================

-- Display counts
DO $$
DECLARE
  genre_count integer;
  tone_count integer;
  length_count integer;
  topic_count integer;
BEGIN
  SELECT COUNT(*) INTO genre_count FROM public.story_parameters WHERE type = 'genre';
  SELECT COUNT(*) INTO tone_count FROM public.story_parameters WHERE type = 'tone';
  SELECT COUNT(*) INTO length_count FROM public.story_parameters WHERE type = 'length';
  SELECT COUNT(*) INTO topic_count FROM public.story_parameters WHERE type = 'growth_topic';

  RAISE NOTICE 'Story parameters seeded successfully:';
  RAISE NOTICE '  - Genres: %', genre_count;
  RAISE NOTICE '  - Tones: %', tone_count;
  RAISE NOTICE '  - Lengths: %', length_count;
  RAISE NOTICE '  - Growth Topics: %', topic_count;
END $$;
