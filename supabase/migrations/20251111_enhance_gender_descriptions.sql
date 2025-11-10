-- ========================================
-- Enhance Gender Descriptor Rich Descriptions
-- ========================================
-- Adds brief but visually descriptive aging details
-- Splits some age ranges for better granularity (especially 65-74, 75-99)
-- Ensures 40-year-olds look different from 65-year-olds in AI generation

-- Clear existing gender descriptors
DELETE FROM public.descriptors_gender;

-- ========================================
-- CHILDREN & TEENS (Ages 0-17) - Keep Simple
-- ========================================

-- Infant (0-1)
INSERT INTO public.descriptors_gender (simple_term, rich_description, pronouns, min_age, max_age, age_stage) VALUES
('male', 'baby boy', 'he/him', 0, 1, 'infant'),
('female', 'baby girl', 'she/her', 0, 1, 'infant'),
('non-binary', 'baby', 'they/them', 0, 1, 'infant');

-- Toddler (2-3)
INSERT INTO public.descriptors_gender (simple_term, rich_description, pronouns, min_age, max_age, age_stage) VALUES
('male', 'toddler boy', 'he/him', 2, 3, 'toddler'),
('female', 'toddler girl', 'she/her', 2, 3, 'toddler'),
('non-binary', 'toddler', 'they/them', 2, 3, 'toddler');

-- Preschooler (4-5)
INSERT INTO public.descriptors_gender (simple_term, rich_description, pronouns, min_age, max_age, age_stage) VALUES
('male', 'little boy', 'he/him', 4, 5, 'preschooler'),
('female', 'little girl', 'she/her', 4, 5, 'preschooler'),
('non-binary', 'little child', 'they/them', 4, 5, 'preschooler');

-- Early Childhood (6-7)
INSERT INTO public.descriptors_gender (simple_term, rich_description, pronouns, min_age, max_age, age_stage) VALUES
('male', 'young boy', 'he/him', 6, 7, 'early_childhood'),
('female', 'young girl', 'she/her', 6, 7, 'early_childhood'),
('non-binary', 'young child', 'they/them', 6, 7, 'early_childhood');

-- Middle Childhood (8-10)
INSERT INTO public.descriptors_gender (simple_term, rich_description, pronouns, min_age, max_age, age_stage) VALUES
('male', 'boy', 'he/him', 8, 10, 'middle_childhood'),
('female', 'girl', 'she/her', 8, 10, 'middle_childhood'),
('non-binary', 'child', 'they/them', 8, 10, 'middle_childhood');

-- Preteen (11-12)
INSERT INTO public.descriptors_gender (simple_term, rich_description, pronouns, min_age, max_age, age_stage) VALUES
('male', 'preteen boy', 'he/him', 11, 12, 'preteen'),
('female', 'preteen girl', 'she/her', 11, 12, 'preteen'),
('non-binary', 'preteen', 'they/them', 11, 12, 'preteen');

-- Early Teen (13-14)
INSERT INTO public.descriptors_gender (simple_term, rich_description, pronouns, min_age, max_age, age_stage) VALUES
('male', 'teenage boy', 'he/him', 13, 14, 'early_teen'),
('female', 'teenage girl', 'she/her', 13, 14, 'early_teen'),
('non-binary', 'teenager', 'they/them', 13, 14, 'early_teen');

-- Teen (15-17)
INSERT INTO public.descriptors_gender (simple_term, rich_description, pronouns, min_age, max_age, age_stage) VALUES
('male', 'teen boy', 'he/him', 15, 17, 'teen'),
('female', 'teen girl', 'she/her', 15, 17, 'teen'),
('non-binary', 'teen', 'they/them', 15, 17, 'teen');

-- ========================================
-- ADULTS (Ages 18-39) - Minimal Details
-- ========================================

-- Young Adult (18-24)
INSERT INTO public.descriptors_gender (simple_term, rich_description, pronouns, min_age, max_age, age_stage) VALUES
('male', 'young man', 'he/him', 18, 24, 'young_adult'),
('female', 'young woman', 'she/her', 18, 24, 'young_adult'),
('non-binary', 'young person', 'they/them', 18, 24, 'young_adult');

-- Adult (25-39) - Prime adult years, no aging details needed
INSERT INTO public.descriptors_gender (simple_term, rich_description, pronouns, min_age, max_age, age_stage) VALUES
('male', 'man', 'he/him', 25, 39, 'adult'),
('female', 'woman', 'she/her', 25, 39, 'adult'),
('non-binary', 'person', 'they/them', 25, 39, 'adult');

-- ========================================
-- MIDDLE AGE & BEYOND (Ages 40+) - Progressive Aging Details
-- ========================================

-- Middle-Aged (40-54) - Early signs of aging
INSERT INTO public.descriptors_gender (simple_term, rich_description, pronouns, min_age, max_age, age_stage) VALUES
('male', 'middle-aged man with distinguished features', 'he/him', 40, 54, 'middle_aged'),
('female', 'middle-aged woman with refined features', 'she/her', 40, 54, 'middle_aged'),
('non-binary', 'middle-aged person with distinguished features', 'they/them', 40, 54, 'middle_aged');

-- Mature (55-64) - Noticeable aging, graying hair
INSERT INTO public.descriptors_gender (simple_term, rich_description, pronouns, min_age, max_age, age_stage) VALUES
('male', 'mature man with silver-streaked hair and weathered features', 'he/him', 55, 64, 'mature'),
('female', 'mature woman with graying hair and elegant aging', 'she/her', 55, 64, 'mature'),
('non-binary', 'mature person with silver-streaked hair and weathered features', 'they/them', 55, 64, 'mature');

-- Early Senior (65-69) - Clearly aged but still active-looking
INSERT INTO public.descriptors_gender (simple_term, rich_description, pronouns, min_age, max_age, age_stage) VALUES
('male', 'older man with gray hair, gentle wrinkles, and kind eyes', 'he/him', 65, 69, 'senior'),
('female', 'older woman with gray hair, soft wrinkles, and warm features', 'she/her', 65, 69, 'senior'),
('non-binary', 'older person with gray hair, gentle wrinkles, and kind eyes', 'they/them', 65, 69, 'senior');

-- Late Senior (70-74) - More pronounced aging
INSERT INTO public.descriptors_gender (simple_term, rich_description, pronouns, min_age, max_age, age_stage) VALUES
('male', 'older man with silver-white hair, laugh lines, and experienced features', 'he/him', 70, 74, 'senior'),
('female', 'older woman with silver-white hair, smile lines, and graceful aging', 'she/her', 70, 74, 'senior'),
('non-binary', 'older person with silver-white hair, laugh lines, and experienced features', 'they/them', 70, 74, 'senior');

-- Early Elderly (75-84) - Elderly but not frail
INSERT INTO public.descriptors_gender (simple_term, rich_description, pronouns, min_age, max_age, age_stage) VALUES
('male', 'elderly man with white hair, deep smile lines, age spots, and wise kindly features', 'he/him', 75, 84, 'elderly'),
('female', 'elderly woman with white hair, gentle wrinkles, soft skin, and warm wise features', 'she/her', 75, 84, 'elderly'),
('non-binary', 'elderly person with white hair, deep smile lines, age spots, and wise kindly features', 'they/them', 75, 84, 'elderly');

-- Very Elderly (85-99) - Advanced age
INSERT INTO public.descriptors_gender (simple_term, rich_description, pronouns, min_age, max_age, age_stage) VALUES
('male', 'very elderly man with snow-white hair, pronounced wrinkles, and gentle aged features', 'he/him', 85, 99, 'very_elderly'),
('female', 'very elderly woman with snow-white hair, delicate aged skin, and serene features', 'she/her', 85, 99, 'very_elderly'),
('non-binary', 'very elderly person with snow-white hair, pronounced wrinkles, and gentle aged features', 'they/them', 85, 99, 'very_elderly');

-- ========================================
-- Verification
-- ========================================
-- Test query to see the progression:
-- SELECT min_age, max_age, simple_term, rich_description, age_stage
-- FROM public.descriptors_gender
-- WHERE simple_term = 'male'
-- ORDER BY min_age;
--
-- Key test ages to verify visual distinction:
-- Age 40: "middle-aged man with distinguished features"
-- Age 55: "mature man with silver-streaked hair and weathered features"
-- Age 65: "older man with gray hair, gentle wrinkles, and kind eyes"
-- Age 70: "older man with silver-white hair, laugh lines, and experienced features"
-- Age 75: "elderly man with white hair, deep smile lines, age spots, and wise kindly features"
-- Age 90: "very elderly man with snow-white hair, pronounced wrinkles, and gentle aged features"
