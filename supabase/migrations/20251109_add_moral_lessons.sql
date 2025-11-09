-- Add Moral Lessons Parameter Type
-- Optional moral/lesson themes for "Just for Fun" stories
-- Can also be used in "Help My Child Grow" stories as secondary lessons

-- ============================================================================
-- UPDATE TYPE CHECK CONSTRAINT
-- ============================================================================
-- Add 'moral_lesson' to the allowed types

ALTER TABLE public.story_parameters
  DROP CONSTRAINT IF EXISTS story_parameters_type_check;

ALTER TABLE public.story_parameters
  ADD CONSTRAINT story_parameters_type_check
  CHECK (type IN ('genre', 'tone', 'length', 'growth_topic', 'growth_category', 'moral_lesson'));

-- ============================================================================
-- INSERT MORAL LESSONS
-- ============================================================================

INSERT INTO public.story_parameters (type, name, display_name, description, metadata, display_order, is_active)
VALUES
  -- Classic Values
  (
    'moral_lesson',
    'kindness_matters',
    'Kindness Matters',
    'Being kind to others makes everyone feel good',
    jsonb_build_object(
      'category', 'Classic Values',
      'prompt_guidance', 'Weave in a moment where kindness (helping, sharing, including someone) makes a positive difference. Show the ripple effect of kind actions.'
    ),
    1,
    true
  ),
  (
    'moral_lesson',
    'honesty_best_policy',
    'Honesty is the Best Policy',
    'Telling the truth, even when it''s hard',
    jsonb_build_object(
      'category', 'Classic Values',
      'prompt_guidance', 'Include a moment where being honest (even when scared) leads to a better outcome than lying or hiding the truth.'
    ),
    2,
    true
  ),
  (
    'moral_lesson',
    'sharing_caring',
    'Sharing is Caring',
    'Good things are better when shared',
    jsonb_build_object(
      'category', 'Classic Values',
      'prompt_guidance', 'Show that sharing (toys, food, time, experiences) makes friendships stronger and fun more enjoyable.'
    ),
    3,
    true
  ),
  (
    'moral_lesson',
    'treat_others_well',
    'Treat Others How You Want to Be Treated',
    'The Golden Rule in action',
    jsonb_build_object(
      'category', 'Classic Values',
      'prompt_guidance', 'Demonstrate the Golden Rule - when the character treats others with kindness and respect, they receive the same in return.'
    ),
    4,
    true
  ),
  (
    'moral_lesson',
    'everyone_special',
    'Everyone is Special',
    'We all have unique gifts and talents',
    jsonb_build_object(
      'category', 'Classic Values',
      'prompt_guidance', 'Show characters discovering their own special qualities or appreciating what makes others unique. Celebrate diversity and individual strengths.'
    ),
    5,
    true
  ),

  -- Friendship & Social
  (
    'moral_lesson',
    'true_friends_accept',
    'True Friends Accept You',
    'Real friends like you for who you are',
    jsonb_build_object(
      'category', 'Friendship & Social',
      'prompt_guidance', 'Show that true friendship means being yourself and that real friends appreciate you without needing you to change.'
    ),
    10,
    true
  ),
  (
    'moral_lesson',
    'working_together',
    'Working Together is Better',
    'Teamwork makes things easier and more fun',
    jsonb_build_object(
      'category', 'Friendship & Social',
      'prompt_guidance', 'Demonstrate that cooperation and teamwork help achieve goals that would be hard alone. Show the joy of working together.'
    ),
    11,
    true
  ),
  (
    'moral_lesson',
    'apologizing_important',
    'Saying Sorry Matters',
    'Apologies help heal hurt feelings',
    jsonb_build_object(
      'category', 'Friendship & Social',
      'prompt_guidance', 'Include a moment where a sincere apology repairs a friendship or makes someone feel better. Show that saying sorry is brave and important.'
    ),
    12,
    true
  ),
  (
    'moral_lesson',
    'including_others',
    'Including Others is Kind',
    'Making sure no one feels left out',
    jsonb_build_object(
      'category', 'Friendship & Social',
      'prompt_guidance', 'Show the importance of inviting others to join, noticing when someone is alone, and making everyone feel welcome.'
    ),
    13,
    true
  ),

  -- Courage & Growth
  (
    'moral_lesson',
    'try_new_things',
    'Trying New Things Can Be Fun',
    'New experiences lead to new adventures',
    jsonb_build_object(
      'category', 'Courage & Growth',
      'prompt_guidance', 'Show a character being nervous about something new but discovering it''s fun or rewarding. Celebrate curiosity and bravery.'
    ),
    20,
    true
  ),
  (
    'moral_lesson',
    'practice_makes_better',
    'Practice Makes Progress',
    'Keep trying and you''ll improve',
    jsonb_build_object(
      'category', 'Courage & Growth',
      'prompt_guidance', 'Demonstrate that skills improve with practice, and that mistakes are part of learning. Show the character getting better through effort.'
    ),
    21,
    true
  ),
  (
    'moral_lesson',
    'asking_help_okay',
    'Asking for Help is Smart',
    'We all need help sometimes',
    jsonb_build_object(
      'category', 'Courage & Growth',
      'prompt_guidance', 'Show that asking for help is brave and wise, not weak. Demonstrate that people are happy to help and we all need support sometimes.'
    ),
    22,
    true
  ),
  (
    'moral_lesson',
    'mistakes_help_learn',
    'Mistakes Help Us Learn',
    'Errors are opportunities to grow',
    jsonb_build_object(
      'category', 'Courage & Growth',
      'prompt_guidance', 'Show a character making a mistake, learning from it, and doing better next time. Normalize mistakes as part of growth.'
    ),
    23,
    true
  ),
  (
    'moral_lesson',
    'brave_even_scared',
    'Being Brave Means Acting Despite Fear',
    'Courage is doing things even when you''re scared',
    jsonb_build_object(
      'category', 'Courage & Growth',
      'prompt_guidance', 'Show that bravery isn''t the absence of fear - it''s doing what''s right or trying something new even when you feel nervous.'
    ),
    24,
    true
  ),

  -- Wisdom & Problem-Solving
  (
    'moral_lesson',
    'think_before_act',
    'Think Before You Act',
    'Planning helps avoid problems',
    jsonb_build_object(
      'category', 'Wisdom & Problem-Solving',
      'prompt_guidance', 'Show the difference between rushing into something versus thinking it through. Demonstrate that pausing to plan leads to better outcomes.'
    ),
    30,
    true
  ),
  (
    'moral_lesson',
    'listen_to_learn',
    'Listening Helps You Learn',
    'Pay attention to wise advice',
    jsonb_build_object(
      'category', 'Wisdom & Problem-Solving',
      'prompt_guidance', 'Show a character learning by listening to others (parents, teachers, friends, elders). Demonstrate that listening helps us avoid mistakes and discover new things.'
    ),
    31,
    true
  ),
  (
    'moral_lesson',
    'creative_solutions',
    'Creative Thinking Solves Problems',
    'Imagination helps find answers',
    jsonb_build_object(
      'category', 'Wisdom & Problem-Solving',
      'prompt_guidance', 'Show the character using imagination and creativity to solve a problem in an unexpected way. Celebrate thinking outside the box.'
    ),
    32,
    true
  ),
  (
    'moral_lesson',
    'patience_rewarded',
    'Good Things Come to Those Who Wait',
    'Patience often pays off',
    jsonb_build_object(
      'category', 'Wisdom & Problem-Solving',
      'prompt_guidance', 'Show that waiting patiently (for a turn, for something to grow, for a reward) often leads to good outcomes. Demonstrate delayed gratification.'
    ),
    33,
    true
  ),

  -- Gratitude & Appreciation
  (
    'moral_lesson',
    'be_grateful',
    'Appreciate What You Have',
    'Gratitude makes us happier',
    jsonb_build_object(
      'category', 'Gratitude & Appreciation',
      'prompt_guidance', 'Show the character learning to notice and appreciate the good things in their life - people, experiences, or things they might take for granted.'
    ),
    40,
    true
  ),
  (
    'moral_lesson',
    'small_things_matter',
    'Little Things Make a Big Difference',
    'Small acts of kindness count',
    jsonb_build_object(
      'category', 'Gratitude & Appreciation',
      'prompt_guidance', 'Demonstrate that small gestures (a smile, a thank you, a small help) can have a big positive impact. Celebrate everyday kindness.'
    ),
    41,
    true
  ),
  (
    'moral_lesson',
    'saying_thank_you',
    'Saying Thank You Feels Good',
    'Expressing gratitude spreads joy',
    jsonb_build_object(
      'category', 'Gratitude & Appreciation',
      'prompt_guidance', 'Show the character learning to express thanks and how it makes both people feel happy. Model gratitude in action.'
    ),
    42,
    true
  ),

  -- Nature & Wonder
  (
    'moral_lesson',
    'nature_wonderful',
    'Nature is Full of Wonders',
    'The world around us is amazing',
    jsonb_build_object(
      'category', 'Nature & Wonder',
      'prompt_guidance', 'Inspire curiosity and appreciation for the natural world - animals, plants, weather, seasons. Show the character discovering something amazing in nature.'
    ),
    50,
    true
  ),
  (
    'moral_lesson',
    'take_care_earth',
    'Take Care of Our Planet',
    'We share the Earth with all living things',
    jsonb_build_object(
      'category', 'Nature & Wonder',
      'prompt_guidance', 'Show simple ways to care for the environment (not littering, recycling, being gentle with animals/plants). Make environmental care age-appropriate and positive.'
    ),
    51,
    true
  ),
  (
    'moral_lesson',
    'all_creatures_matter',
    'All Creatures Deserve Kindness',
    'Be gentle with animals and insects',
    jsonb_build_object(
      'category', 'Nature & Wonder',
      'prompt_guidance', 'Demonstrate compassion for animals and insects. Show that all living things deserve gentle treatment and care.'
    ),
    52,
    true
  ),

  -- Family & Love
  (
    'moral_lesson',
    'family_loves_you',
    'Family Loves You No Matter What',
    'Unconditional love and acceptance',
    jsonb_build_object(
      'category', 'Family & Love',
      'prompt_guidance', 'Show that family love is constant - through mistakes, bad days, and challenges. Emphasize unconditional love and acceptance.'
    ),
    60,
    true
  ),
  (
    'moral_lesson',
    'home_where_loved',
    'Home is Where You''re Loved',
    'Family makes a place feel like home',
    jsonb_build_object(
      'category', 'Family & Love',
      'prompt_guidance', 'Show that home isn''t just a place - it''s being with people who love you. Great for stories about moving or visiting family.'
    ),
    61,
    true
  ),
  (
    'moral_lesson',
    'helping_family',
    'Helping Family Feels Good',
    'Contributing to your family matters',
    jsonb_build_object(
      'category', 'Family & Love',
      'prompt_guidance', 'Show the character helping with family tasks and feeling proud to contribute. Demonstrate that being helpful makes the family stronger.'
    ),
    62,
    true
  ),

  -- Optional/General
  (
    'moral_lesson',
    'no_specific_moral',
    'No Specific Moral (Just Fun!)',
    'A purely entertaining story',
    jsonb_build_object(
      'category', 'Optional',
      'prompt_guidance', 'Focus purely on fun, adventure, and entertainment. No need to weave in a specific lesson - just create a delightful story that sparks imagination and joy.'
    ),
    99,
    true
  );

-- ============================================================================
-- DISPLAY RESULTS
-- ============================================================================

DO $$
DECLARE
  total_count integer;
  classic_count integer;
  friendship_count integer;
  courage_count integer;
  wisdom_count integer;
  gratitude_count integer;
  nature_count integer;
  family_count integer;
BEGIN
  SELECT COUNT(*) INTO total_count FROM public.story_parameters WHERE type = 'moral_lesson';
  SELECT COUNT(*) INTO classic_count FROM public.story_parameters WHERE type = 'moral_lesson' AND metadata->>'category' = 'Classic Values';
  SELECT COUNT(*) INTO friendship_count FROM public.story_parameters WHERE type = 'moral_lesson' AND metadata->>'category' = 'Friendship & Social';
  SELECT COUNT(*) INTO courage_count FROM public.story_parameters WHERE type = 'moral_lesson' AND metadata->>'category' = 'Courage & Growth';
  SELECT COUNT(*) INTO wisdom_count FROM public.story_parameters WHERE type = 'moral_lesson' AND metadata->>'category' = 'Wisdom & Problem-Solving';
  SELECT COUNT(*) INTO gratitude_count FROM public.story_parameters WHERE type = 'moral_lesson' AND metadata->>'category' = 'Gratitude & Appreciation';
  SELECT COUNT(*) INTO nature_count FROM public.story_parameters WHERE type = 'moral_lesson' AND metadata->>'category' = 'Nature & Wonder';
  SELECT COUNT(*) INTO family_count FROM public.story_parameters WHERE type = 'moral_lesson' AND metadata->>'category' = 'Family & Love';

  RAISE NOTICE '===========================================';
  RAISE NOTICE 'Moral lessons seeded successfully!';
  RAISE NOTICE '===========================================';
  RAISE NOTICE 'Total moral lessons: %', total_count;
  RAISE NOTICE '';
  RAISE NOTICE 'By category:';
  RAISE NOTICE '  - Classic Values: %', classic_count;
  RAISE NOTICE '  - Friendship & Social: %', friendship_count;
  RAISE NOTICE '  - Courage & Growth: %', courage_count;
  RAISE NOTICE '  - Wisdom & Problem-Solving: %', wisdom_count;
  RAISE NOTICE '  - Gratitude & Appreciation: %', gratitude_count;
  RAISE NOTICE '  - Nature & Wonder: %', nature_count;
  RAISE NOTICE '  - Family & Love: %', family_count;
  RAISE NOTICE '===========================================';
  RAISE NOTICE '';
  RAISE NOTICE 'Note: Moral lessons are OPTIONAL for Fun stories';
  RAISE NOTICE 'They add gentle educational value without being preachy.';
  RAISE NOTICE '===========================================';
END $$;
