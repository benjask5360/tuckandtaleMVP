-- Complete Growth Topics Seed Data
-- Replaces placeholder growth topics with comprehensive categorized list
-- Based on child development and parenting best practices

-- ============================================================================
-- REMOVE PLACEHOLDER GROWTH TOPICS
-- ============================================================================

DELETE FROM public.story_parameters WHERE type = 'growth_topic';

-- ============================================================================
-- EMOTIONAL & SOCIAL GROWTH
-- ============================================================================

INSERT INTO public.story_parameters (type, name, display_name, description, metadata, display_order, is_active)
VALUES
  (
    'growth_topic',
    'managing_big_feelings',
    'Managing Big Feelings',
    'Handling anger, frustration, and sadness',
    jsonb_build_object(
      'category', 'Emotional & Social Growth',
      'prompt_guidance', 'Create a story where the character experiences a big emotion (anger, frustration, or sadness). Show them learning to recognize the feeling, express it in a healthy way, and find comfort. Include calming strategies like deep breaths, talking about feelings, or getting a hug. Validate that all feelings are okay.'
    ),
    100,
    true
  ),
  (
    'growth_topic',
    'sharing_taking_turns',
    'Sharing & Taking Turns',
    'Learning to share with others',
    jsonb_build_object(
      'category', 'Emotional & Social Growth',
      'prompt_guidance', 'Create a story where the character struggles with sharing a toy or taking turns, but discovers that sharing makes play more fun and friends happier. Show both the difficulty and the reward of sharing. Include a moment where they experience the joy of cooperation.'
    ),
    101,
    true
  ),
  (
    'growth_topic',
    'saying_sorry_forgiving',
    'Saying Sorry & Forgiving',
    'Apologizing and making amends',
    jsonb_build_object(
      'category', 'Emotional & Social Growth',
      'prompt_guidance', 'Create a story where the character makes a mistake that hurts someone else. Show them learning to say sorry sincerely and make it right. Also demonstrate the power of forgiveness and how friendships can grow stronger after conflict. Make apologies feel empowering, not shameful.'
    ),
    102,
    true
  ),
  (
    'growth_topic',
    'overcoming_jealousy',
    'Overcoming Jealousy',
    'Dealing with envy and comparison',
    jsonb_build_object(
      'category', 'Emotional & Social Growth',
      'prompt_guidance', 'Create a story where the character feels jealous of someone else (new sibling, friend''s toy, another''s success). Help them understand these feelings are normal, then show them discovering their own special qualities and finding joy in others'' happiness. Focus on self-worth and celebrating others.'
    ),
    103,
    true
  ),
  (
    'growth_topic',
    'making_friends',
    'Making Friends',
    'Starting friendships and joining groups',
    jsonb_build_object(
      'category', 'Emotional & Social Growth',
      'prompt_guidance', 'Create a story where the character wants to make friends or join a group but feels nervous. Show them taking small brave steps like saying hello, asking to play, or sharing. Demonstrate that everyone feels shy sometimes and that friendship starts with simple kindness. End with successful connection.'
    ),
    104,
    true
  ),
  (
    'growth_topic',
    'handling_embarrassment',
    'Handling Embarrassment',
    'Coping with awkward moments',
    jsonb_build_object(
      'category', 'Emotional & Social Growth',
      'prompt_guidance', 'Create a story where the character experiences an embarrassing moment (falling down, making a mistake in front of others, etc.). Show them learning that everyone has embarrassing moments, that true friends are kind about them, and that we can laugh at ourselves. Include recovery and resilience.'
    ),
    105,
    true
  ),
  (
    'growth_topic',
    'asking_for_help',
    'Learning to Ask for Help',
    'Knowing when and how to seek support',
    jsonb_build_object(
      'category', 'Emotional & Social Growth',
      'prompt_guidance', 'Create a story where the character struggles with something and learns that asking for help is brave and smart, not weak. Show them discovering that people are happy to help and that we all need help sometimes. Celebrate both independence and knowing when to reach out.'
    ),
    106,
    true
  ),
  (
    'growth_topic',
    'dealing_with_fears',
    'Dealing with Fears',
    'Facing the dark, monsters, or loud noises',
    jsonb_build_object(
      'category', 'Emotional & Social Growth',
      'prompt_guidance', 'Create a story where the character faces a common childhood fear (dark, monsters, loud noises). Validate the fear while showing coping strategies like nightlights, comfort objects, or parent reassurance. Help them feel brave and show that fears can shrink with time and support.'
    ),
    107,
    true
  ),
  (
    'growth_topic',
    'showing_gratitude',
    'Showing Gratitude',
    'Appreciating kindness and saying thank you',
    jsonb_build_object(
      'category', 'Emotional & Social Growth',
      'prompt_guidance', 'Create a story where the character learns to notice and appreciate the kind things others do for them. Show them expressing thanks and how gratitude makes both people feel good. Include examples of everyday kindnesses to be grateful for (help, gifts, time, love).'
    ),
    108,
    true
  ),
  (
    'growth_topic',
    'understanding_kindness',
    'Understanding Kindness',
    'Being kind and showing empathy',
    jsonb_build_object(
      'category', 'Emotional & Social Growth',
      'prompt_guidance', 'Create a story that demonstrates acts of kindness and empathy. Show the character noticing when someone needs help or is sad, then doing something kind. Include how kindness makes everyone feel good and how small acts matter. Make kindness feel natural and rewarding.'
    ),
    109,
    true
  ),

-- ============================================================================
-- SELF-CONTROL & HABITS
-- ============================================================================

  (
    'growth_topic',
    'biting_hitting_pushing',
    'No Biting, Hitting, or Pushing',
    'Using gentle hands and words',
    jsonb_build_object(
      'category', 'Self-Control & Habits',
      'prompt_guidance', 'Create a story where the character feels very frustrated and wants to hit/bite/push but learns to use gentle hands and words instead. Show the trigger, the feeling, the better choice, and the positive result. Teach "use your words" and give specific alternatives to physical aggression.'
    ),
    200,
    true
  ),
  (
    'growth_topic',
    'interrupting_yelling',
    'Not Interrupting or Yelling',
    'Waiting for turns to talk',
    jsonb_build_object(
      'category', 'Self-Control & Habits',
      'prompt_guidance', 'Create a story where the character is very excited and wants to talk RIGHT NOW, but learns to wait their turn and use an indoor voice. Show the importance of listening to others and how conversation works. Make waiting feel manageable and worthwhile.'
    ),
    201,
    true
  ),
  (
    'growth_topic',
    'listening_following_directions',
    'Listening & Following Directions',
    'Paying attention when asked',
    jsonb_build_object(
      'category', 'Self-Control & Habits',
      'prompt_guidance', 'Create a story where the character is distracted or doesn''t listen, and something goes wrong or they miss out. Show them learning to stop, listen, and follow through. Demonstrate the positive results of paying attention and cooperating. Keep it encouraging, not punitive.'
    ),
    202,
    true
  ),
  (
    'growth_topic',
    'patience_waiting',
    'Patience (Waiting Your Turn)',
    'Tolerating delays and taking turns',
    jsonb_build_object(
      'category', 'Self-Control & Habits',
      'prompt_guidance', 'Create a story where the character has to wait for something they really want (turn at playground, cookie to cool, delayed gratification). Show strategies for waiting (counting, singing, playing) and demonstrate that good things are worth waiting for. Celebrate their patience.'
    ),
    203,
    true
  ),
  (
    'growth_topic',
    'cleaning_up',
    'Cleaning Up After Playtime',
    'Putting toys away',
    jsonb_build_object(
      'category', 'Self-Control & Habits',
      'prompt_guidance', 'Create a story where cleanup feels fun or at least manageable. Show the character making cleaning up a game, working together with others, or feeling proud of a tidy space. Emphasize that taking care of our things matters and that cleanup can be quick when we work together.'
    ),
    204,
    true
  ),
  (
    'growth_topic',
    'brushing_teeth_hygiene',
    'Brushing Teeth & Hygiene',
    'Washing hands and brushing teeth',
    jsonb_build_object(
      'category', 'Self-Control & Habits',
      'prompt_guidance', 'Create a story that makes hygiene fun and important. Show the character learning why we brush teeth (fighting sugar bugs!), wash hands (bye germs!), or bathe. Include a fun routine, catchy song, or game to make it engaging. Focus on health and feeling fresh, not shame.'
    ),
    205,
    true
  ),
  (
    'growth_topic',
    'going_to_bed',
    'Going to Bed Without Fussing',
    'Accepting bedtime calmly',
    jsonb_build_object(
      'category', 'Self-Control & Habits',
      'prompt_guidance', 'Create a story with a gentle, calming bedtime routine that makes sleep feel safe and cozy. Show the character learning that bedtime means rest, dreams, and waking up ready for fun. Include a predictable routine (bath, story, song, cuddles) and emphasize the comfort of bed and family closeness.'
    ),
    206,
    true
  ),
  (
    'growth_topic',
    'getting_dressed',
    'Getting Dressed',
    'Trying new clothes and dressing independently',
    jsonb_build_object(
      'category', 'Self-Control & Habits',
      'prompt_guidance', 'Create a story where the character learns to dress themselves or tries new clothes. Show the pride in independence, problem-solving (which arm goes first?), and the fun of choosing clothes. Make it feel like a growing-up accomplishment, not a battle.'
    ),
    207,
    true
  ),
  (
    'growth_topic',
    'toilet_training',
    'Toilet Training / Using the Potty',
    'Learning to use the toilet',
    jsonb_build_object(
      'category', 'Self-Control & Habits',
      'prompt_guidance', 'Create a story that makes potty training feel like an exciting milestone. Show the character learning their body''s signals, using the potty, and feeling proud. Include patience for accidents and celebrating successes. Keep it positive, pressure-free, and encouraging. Make it a normal part of growing up.'
    ),
    208,
    true
  ),
  (
    'growth_topic',
    'handling_disappointment',
    'Handling Disappointment',
    'Coping when things don''t go as planned',
    jsonb_build_object(
      'category', 'Self-Control & Habits',
      'prompt_guidance', 'Create a story where the character doesn''t get what they wanted (didn''t win, couldn''t go somewhere, didn''t get chosen). Show them feeling sad, then finding a way to cope - trying again, finding something else fun, or accepting the outcome. Teach resilience and emotional regulation.'
    ),
    209,
    true
  ),

-- ============================================================================
-- CONFIDENCE & GROWTH MINDSET
-- ============================================================================

  (
    'growth_topic',
    'trying_new_foods',
    'Trying New Foods',
    'Being brave with new tastes',
    jsonb_build_object(
      'category', 'Confidence & Growth Mindset',
      'prompt_guidance', 'Create a story where the character is nervous about trying a new food but discovers it''s actually good (or at least not scary). Show them taking a brave bite, describing what they taste, and feeling proud for trying. It''s okay if they don''t like it - trying is the win!'
    ),
    300,
    true
  ),
  (
    'growth_topic',
    'learning_from_mistakes',
    'Learning from Mistakes',
    'Accepting that mistakes help us learn',
    jsonb_build_object(
      'category', 'Confidence & Growth Mindset',
      'prompt_guidance', 'Create a story where the character makes a mistake (spills, breaks something, gets an answer wrong) and learns that mistakes are how we learn and grow. Show them trying again, doing better, and feeling proud. Emphasize "practice makes progress" and that everyone makes mistakes.'
    ),
    301,
    true
  ),
  (
    'growth_topic',
    'being_brave',
    'Being Brave in New Situations',
    'Facing school, dentist, doctor visits',
    jsonb_build_object(
      'category', 'Confidence & Growth Mindset',
      'prompt_guidance', 'Create a story where the character faces something new and potentially scary (first day of school, doctor visit, dentist, etc.). Show them feeling nervous, using coping strategies (deep breaths, holding a hand, asking questions), and discovering it wasn''t so bad. Celebrate their bravery.'
    ),
    302,
    true
  ),
  (
    'growth_topic',
    'persistence',
    'Persistence / Not Giving Up',
    'Trying again when something is hard',
    jsonb_build_object(
      'category', 'Confidence & Growth Mindset',
      'prompt_guidance', 'Create a story where the character struggles with something hard (building, tying shoes, learning a skill) and wants to quit. Show them trying again, asking for help, breaking it into steps, and eventually succeeding. Emphasize "I can''t do it YET" and the power of practice.'
    ),
    303,
    true
  ),
  (
    'growth_topic',
    'self_belief',
    'Self-Belief (I Can Do Hard Things)',
    'Building confidence and self-trust',
    jsonb_build_object(
      'category', 'Confidence & Growth Mindset',
      'prompt_guidance', 'Create a story where the character doubts themselves but discovers they ARE capable. Show them trying something hard, struggling, then succeeding through effort. Include positive self-talk ("I can do this!") and celebrating their strength. Make them feel powerful and capable.'
    ),
    304,
    true
  ),
  (
    'growth_topic',
    'problem_solving',
    'Problem-Solving with Imagination',
    'Creative thinking to solve challenges',
    jsonb_build_object(
      'category', 'Confidence & Growth Mindset',
      'prompt_guidance', 'Create a story where the character faces a problem and uses creative thinking to solve it. Show them brainstorming ideas, trying different solutions, and thinking outside the box. Celebrate imagination and innovation. Make problem-solving feel fun and empowering.'
    ),
    305,
    true
  ),

-- ============================================================================
-- RESPONSIBILITY & EMPATHY
-- ============================================================================

  (
    'growth_topic',
    'caring_for_pets',
    'Caring for Pets or Plants',
    'Being responsible for living things',
    jsonb_build_object(
      'category', 'Responsibility & Empathy',
      'prompt_guidance', 'Create a story where the character learns to take care of a pet or plant. Show the responsibility (feeding, watering, gentle touch) and the reward of seeing their pet/plant happy and healthy. Emphasize that living things depend on us and that caring for them feels good.'
    ),
    400,
    true
  ),
  (
    'growth_topic',
    'recycling_planet',
    'Recycling & Caring for the Planet',
    'Environmental responsibility',
    jsonb_build_object(
      'category', 'Responsibility & Empathy',
      'prompt_guidance', 'Create a story where the character learns about taking care of the Earth through recycling, not littering, or conserving. Show them making eco-friendly choices and understanding why it matters. Make it age-appropriate and empowering - even small actions help!'
    ),
    401,
    true
  ),
  (
    'growth_topic',
    'telling_truth',
    'Telling the Truth / Honesty',
    'Being truthful even when scared',
    jsonb_build_object(
      'category', 'Responsibility & Empathy',
      'prompt_guidance', 'Create a story where the character is tempted to lie or hide something but chooses honesty instead. Show that telling the truth might feel scary but is the right thing, and that people appreciate honesty. Emphasize that mistakes + honesty = growth, not punishment.'
    ),
    402,
    true
  ),
  (
    'growth_topic',
    'respecting_differences',
    'Respecting Differences',
    'Appreciating diversity in people',
    jsonb_build_object(
      'category', 'Responsibility & Empathy',
      'prompt_guidance', 'Create a story that celebrates differences in people - different abilities, cultures, appearances, families, or ways of doing things. Show the character learning that differences make the world interesting and that everyone deserves kindness and respect. Emphasize inclusion and curiosity.'
    ),
    403,
    true
  ),
  (
    'growth_topic',
    'helping_others',
    'Helping Others',
    'Acts of service and teamwork',
    jsonb_build_object(
      'category', 'Responsibility & Empathy',
      'prompt_guidance', 'Create a story where the character helps someone in need - a friend, family member, or even a stranger. Show them noticing the need, taking action, and feeling the joy that comes from helping. Emphasize that helping makes the world better and that we''re all connected.'
    ),
    404,
    true
  ),

-- ============================================================================
-- EVERYDAY FAMILY SITUATIONS
-- ============================================================================

  (
    'growth_topic',
    'becoming_sibling',
    'Becoming a Big Brother/Sister',
    'Welcoming a new baby',
    jsonb_build_object(
      'category', 'Everyday Family Situations',
      'prompt_guidance', 'Create a story where the character becomes a big sibling. Address the mixed feelings (excitement, jealousy, confusion), show them finding their special role, and celebrate their importance. Include ways they can help and feel proud. Validate that change is hard but also wonderful.'
    ),
    500,
    true
  ),
  (
    'growth_topic',
    'moving_homes',
    'Moving Homes or Changing Schools',
    'Handling big transitions',
    jsonb_build_object(
      'category', 'Everyday Family Situations',
      'prompt_guidance', 'Create a story where the character moves to a new home or changes schools. Show the sadness of leaving, the nervousness of new things, and the excitement of new adventures. Include saying goodbye, making new friends, and discovering that home is where family is. Emphasize resilience through change.'
    ),
    501,
    true
  ),
  (
    'growth_topic',
    'visiting_grandparents',
    'Visiting Grandparents or Family',
    'Family trips and connections',
    jsonb_build_object(
      'category', 'Everyday Family Situations',
      'prompt_guidance', 'Create a story about visiting family (grandparents, cousins, etc.) that emphasizes the joy of family connections. Show special activities, stories, love, and making memories. Include the warmth of family traditions and the excitement of reunions. Celebrate intergenerational bonds.'
    ),
    502,
    true
  ),
  (
    'growth_topic',
    'handling_screen_time',
    'Handling Screen Time Limits',
    'Turning off devices without tantrums',
    jsonb_build_object(
      'category', 'Everyday Family Situations',
      'prompt_guidance', 'Create a story where the character loves screen time but learns to turn it off when asked. Show the struggle, then demonstrate fun alternatives (playing outside, crafts, family time). Include the idea that screens are one fun thing, but there are many others. Make transitions feel manageable.'
    ),
    503,
    true
  ),
  (
    'growth_topic',
    'gentle_with_pets',
    'Being Gentle with Babies or Pets',
    'Soft touches and careful play',
    jsonb_build_object(
      'category', 'Everyday Family Situations',
      'prompt_guidance', 'Create a story where the character learns to be gentle with someone smaller or more fragile (baby sibling, pet, younger friend). Show them learning about soft touches, quiet voices, and careful movements. Emphasize that being gentle shows love and that little ones need our protection.'
    ),
    504,
    true
  ),
  (
    'growth_topic',
    'saying_goodbye',
    'Saying Goodbye',
    'Starting preschool, missing a parent, etc.',
    jsonb_build_object(
      'category', 'Everyday Family Situations',
      'prompt_guidance', 'Create a story about separation (preschool drop-off, parent traveling, etc.) that validates the sadness while providing comfort. Show that goodbyes are temporary, that the parent always comes back, and that new experiences can be fun. Include a special goodbye ritual and reunion joy.'
    ),
    505,
    true
  );

-- ============================================================================
-- DISPLAY COUNTS
-- ============================================================================

DO $$
DECLARE
  total_count integer;
  emotional_count integer;
  selfcontrol_count integer;
  confidence_count integer;
  responsibility_count integer;
  family_count integer;
BEGIN
  SELECT COUNT(*) INTO total_count FROM public.story_parameters WHERE type = 'growth_topic';
  SELECT COUNT(*) INTO emotional_count FROM public.story_parameters WHERE type = 'growth_topic' AND metadata->>'category' = 'Emotional & Social Growth';
  SELECT COUNT(*) INTO selfcontrol_count FROM public.story_parameters WHERE type = 'growth_topic' AND metadata->>'category' = 'Self-Control & Habits';
  SELECT COUNT(*) INTO confidence_count FROM public.story_parameters WHERE type = 'growth_topic' AND metadata->>'category' = 'Confidence & Growth Mindset';
  SELECT COUNT(*) INTO responsibility_count FROM public.story_parameters WHERE type = 'growth_topic' AND metadata->>'category' = 'Responsibility & Empathy';
  SELECT COUNT(*) INTO family_count FROM public.story_parameters WHERE type = 'growth_topic' AND metadata->>'category' = 'Everyday Family Situations';

  RAISE NOTICE '===========================================';
  RAISE NOTICE 'Growth topics seeded successfully!';
  RAISE NOTICE '===========================================';
  RAISE NOTICE 'Total growth topics: %', total_count;
  RAISE NOTICE '';
  RAISE NOTICE 'By category:';
  RAISE NOTICE '  - Emotional & Social Growth: %', emotional_count;
  RAISE NOTICE '  - Self-Control & Habits: %', selfcontrol_count;
  RAISE NOTICE '  - Confidence & Growth Mindset: %', confidence_count;
  RAISE NOTICE '  - Responsibility & Empathy: %', responsibility_count;
  RAISE NOTICE '  - Everyday Family Situations: %', family_count;
  RAISE NOTICE '===========================================';
END $$;
