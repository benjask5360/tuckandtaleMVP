-- ========================================
-- Improved Age Granularity for Gender Descriptors
-- ========================================
-- Updates age ranges to be more developmentally accurate
-- Key changes:
-- - Separates infants (0-1) from toddlers (2-3)
-- - More accurate age progression for children

-- Step 1: Clear existing gender data
DELETE FROM public.descriptors_gender;

-- Step 2: Insert improved age-aware gender descriptors with better granularity

-- Age Bracket 1: Infant (0-1)
-- Babies who are not yet walking consistently
INSERT INTO public.descriptors_gender (simple_term, rich_description, pronouns, min_age, max_age, age_stage) VALUES
('male', 'baby boy', 'he/him', 0, 1, 'infant'),
('female', 'baby girl', 'she/her', 0, 1, 'infant'),
('non-binary', 'baby', 'they/them', 0, 1, 'infant');

-- Age Bracket 2: Toddler (2-3)
-- Walking, talking toddlers
INSERT INTO public.descriptors_gender (simple_term, rich_description, pronouns, min_age, max_age, age_stage) VALUES
('male', 'toddler boy', 'he/him', 2, 3, 'toddler'),
('female', 'toddler girl', 'she/her', 2, 3, 'toddler'),
('non-binary', 'toddler', 'they/them', 2, 3, 'toddler');

-- Age Bracket 3: Preschooler (4-5)
-- Preschool age, early learning
INSERT INTO public.descriptors_gender (simple_term, rich_description, pronouns, min_age, max_age, age_stage) VALUES
('male', 'little boy', 'he/him', 4, 5, 'preschooler'),
('female', 'little girl', 'she/her', 4, 5, 'preschooler'),
('non-binary', 'little child', 'they/them', 4, 5, 'preschooler');

-- Age Bracket 4: Early Childhood (6-7)
-- Early elementary school age
INSERT INTO public.descriptors_gender (simple_term, rich_description, pronouns, min_age, max_age, age_stage) VALUES
('male', 'young boy', 'he/him', 6, 7, 'early_childhood'),
('female', 'young girl', 'she/her', 6, 7, 'early_childhood'),
('non-binary', 'young child', 'they/them', 6, 7, 'early_childhood');

-- Age Bracket 5: Middle Childhood (8-10)
-- Elementary school age
INSERT INTO public.descriptors_gender (simple_term, rich_description, pronouns, min_age, max_age, age_stage) VALUES
('male', 'boy', 'he/him', 8, 10, 'middle_childhood'),
('female', 'girl', 'she/her', 8, 10, 'middle_childhood'),
('non-binary', 'child', 'they/them', 8, 10, 'middle_childhood');

-- Age Bracket 6: Late Childhood/Preteen (11-12)
-- Upper elementary/middle school
INSERT INTO public.descriptors_gender (simple_term, rich_description, pronouns, min_age, max_age, age_stage) VALUES
('male', 'preteen boy', 'he/him', 11, 12, 'preteen'),
('female', 'preteen girl', 'she/her', 11, 12, 'preteen'),
('non-binary', 'preteen', 'they/them', 11, 12, 'preteen');

-- Age Bracket 7: Early Teen (13-14)
-- Middle school age
INSERT INTO public.descriptors_gender (simple_term, rich_description, pronouns, min_age, max_age, age_stage) VALUES
('male', 'teenage boy', 'he/him', 13, 14, 'early_teen'),
('female', 'teenage girl', 'she/her', 13, 14, 'early_teen'),
('non-binary', 'teenager', 'they/them', 13, 14, 'early_teen');

-- Age Bracket 8: Teen (15-17)
-- High school age
INSERT INTO public.descriptors_gender (simple_term, rich_description, pronouns, min_age, max_age, age_stage) VALUES
('male', 'teen boy', 'he/him', 15, 17, 'teen'),
('female', 'teen girl', 'she/her', 15, 17, 'teen'),
('non-binary', 'teen', 'they/them', 15, 17, 'teen');

-- Age Bracket 9: Young Adult (18-24)
-- College/early career age
INSERT INTO public.descriptors_gender (simple_term, rich_description, pronouns, min_age, max_age, age_stage) VALUES
('male', 'young man', 'he/him', 18, 24, 'young_adult'),
('female', 'young woman', 'she/her', 18, 24, 'young_adult'),
('non-binary', 'young person', 'they/them', 18, 24, 'young_adult');

-- Age Bracket 10: Adult (25-39)
-- Prime adult years
INSERT INTO public.descriptors_gender (simple_term, rich_description, pronouns, min_age, max_age, age_stage) VALUES
('male', 'man', 'he/him', 25, 39, 'adult'),
('female', 'woman', 'she/her', 25, 39, 'adult'),
('non-binary', 'person', 'they/them', 25, 39, 'adult');

-- Age Bracket 11: Middle-Aged (40-54)
-- Middle adulthood
INSERT INTO public.descriptors_gender (simple_term, rich_description, pronouns, min_age, max_age, age_stage) VALUES
('male', 'middle-aged man', 'he/him', 40, 54, 'middle_aged'),
('female', 'middle-aged woman', 'she/her', 40, 54, 'middle_aged'),
('non-binary', 'middle-aged person', 'they/them', 40, 54, 'middle_aged');

-- Age Bracket 12: Mature Adult (55-64)
-- Late middle age
INSERT INTO public.descriptors_gender (simple_term, rich_description, pronouns, min_age, max_age, age_stage) VALUES
('male', 'mature man', 'he/him', 55, 64, 'mature'),
('female', 'mature woman', 'she/her', 55, 64, 'mature'),
('non-binary', 'mature person', 'they/them', 55, 64, 'mature');

-- Age Bracket 13: Senior (65-74)
-- Early senior years
INSERT INTO public.descriptors_gender (simple_term, rich_description, pronouns, min_age, max_age, age_stage) VALUES
('male', 'older man', 'he/him', 65, 74, 'senior'),
('female', 'older woman', 'she/her', 65, 74, 'senior'),
('non-binary', 'older person', 'they/them', 65, 74, 'senior');

-- Age Bracket 14: Elderly (75-99)
-- Late senior years
INSERT INTO public.descriptors_gender (simple_term, rich_description, pronouns, min_age, max_age, age_stage) VALUES
('male', 'elderly man', 'he/him', 75, 99, 'elderly'),
('female', 'elderly woman', 'she/her', 75, 99, 'elderly'),
('non-binary', 'elderly person', 'they/them', 75, 99, 'elderly');

-- ========================================
-- Verification Query
-- ========================================
-- You can run this separately to test the new ranges:
-- SELECT
--   age_number,
--   simple_term as gender,
--   public.get_gender_descriptor_for_age(simple_term, age_number) as descriptor,
--   dg.age_stage
-- FROM (VALUES
--   (0, 'male'), (1, 'male'), (2, 'male'), (3, 'male'), (4, 'male'), (5, 'male'),
--   (6, 'male'), (7, 'male'), (8, 'male'), (10, 'male'), (11, 'male'), (12, 'male'),
--   (13, 'male'), (15, 'male'), (18, 'male'), (25, 'male'), (40, 'male'),
--   (55, 'male'), (66, 'male'), (75, 'male'), (99, 'male')
-- ) AS test(age_number, simple_term)
-- LEFT JOIN public.descriptors_gender dg
--   ON dg.simple_term = test.simple_term
--   AND test.age_number BETWEEN dg.min_age AND dg.max_age
-- ORDER BY age_number;
--
-- Expected key outputs:
-- 0, male → "baby boy" (infant)
-- 1, male → "baby boy" (infant)
-- 2, male → "toddler boy" (toddler)
-- 3, male → "toddler boy" (toddler)
-- 4, male → "little boy" (preschooler)
-- 5, male → "little boy" (preschooler)
-- 6, male → "young boy" (early_childhood)
-- 8, male → "boy" (middle_childhood)
-- 11, male → "preteen boy" (preteen)
-- 13, male → "teenage boy" (early_teen)
-- 15, male → "teen boy" (teen)
-- 18, male → "young man" (young_adult)
-- 25, male → "man" (adult)
-- 40, male → "middle-aged man" (middle_aged)
-- 66, male → "older man" (senior)
-- 75, male → "elderly man" (elderly)
