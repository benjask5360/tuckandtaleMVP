-- ========================================
-- Age-Aware Gender Descriptors Migration
-- ========================================
-- Makes gender descriptors age-aware with 12 granular age brackets (0-99)
-- Ensures age 25 → "man", age 45 → "middle-aged man", age 66 → "older man", age 99 → "elderly man"

-- Step 1: Drop the UNIQUE constraint on simple_term (we need multiple rows per term for age ranges)
ALTER TABLE public.descriptors_gender
DROP CONSTRAINT IF EXISTS descriptors_gender_simple_term_key;

-- Step 2: Add age-awareness columns to descriptors_gender
ALTER TABLE public.descriptors_gender
ADD COLUMN min_age INTEGER,
ADD COLUMN max_age INTEGER,
ADD COLUMN age_stage TEXT;

-- Step 3: Clear existing gender data (we'll replace with age-aware versions)
DELETE FROM public.descriptors_gender;

-- Step 4: Insert age-aware gender descriptors (12 age brackets × 3 gender categories = 36 rows)

-- Age Bracket 1: Infant/Toddler (0-3)
INSERT INTO public.descriptors_gender (simple_term, rich_description, pronouns, min_age, max_age, age_stage) VALUES
('male', 'baby boy', 'he/him', 0, 3, 'infant/toddler'),
('female', 'baby girl', 'she/her', 0, 3, 'infant/toddler'),
('non-binary', 'baby', 'they/them', 0, 3, 'infant/toddler');

-- Age Bracket 2: Young Child (4-8)
INSERT INTO public.descriptors_gender (simple_term, rich_description, pronouns, min_age, max_age, age_stage) VALUES
('male', 'young boy', 'he/him', 4, 8, 'young_child'),
('female', 'young girl', 'she/her', 4, 8, 'young_child'),
('non-binary', 'young child', 'they/them', 4, 8, 'young_child');

-- Age Bracket 3: Child (9-12)
INSERT INTO public.descriptors_gender (simple_term, rich_description, pronouns, min_age, max_age, age_stage) VALUES
('male', 'boy', 'he/him', 9, 12, 'child'),
('female', 'girl', 'she/her', 9, 12, 'child'),
('non-binary', 'child', 'they/them', 9, 12, 'child');

-- Age Bracket 4: Preteen (13-14)
INSERT INTO public.descriptors_gender (simple_term, rich_description, pronouns, min_age, max_age, age_stage) VALUES
('male', 'preteen boy', 'he/him', 13, 14, 'preteen'),
('female', 'preteen girl', 'she/her', 13, 14, 'preteen'),
('non-binary', 'preteen', 'they/them', 13, 14, 'preteen');

-- Age Bracket 5: Teen (15-17)
INSERT INTO public.descriptors_gender (simple_term, rich_description, pronouns, min_age, max_age, age_stage) VALUES
('male', 'teenage boy', 'he/him', 15, 17, 'teen'),
('female', 'teenage girl', 'she/her', 15, 17, 'teen'),
('non-binary', 'teenager', 'they/them', 15, 17, 'teen');

-- Age Bracket 6: Young Adult (18-24)
INSERT INTO public.descriptors_gender (simple_term, rich_description, pronouns, min_age, max_age, age_stage) VALUES
('male', 'young man', 'he/him', 18, 24, 'young_adult'),
('female', 'young woman', 'she/her', 18, 24, 'young_adult'),
('non-binary', 'young person', 'they/them', 18, 24, 'young_adult');

-- Age Bracket 7: Adult (25-34)
INSERT INTO public.descriptors_gender (simple_term, rich_description, pronouns, min_age, max_age, age_stage) VALUES
('male', 'man', 'he/him', 25, 34, 'adult'),
('female', 'woman', 'she/her', 25, 34, 'adult'),
('non-binary', 'person', 'they/them', 25, 34, 'adult');

-- Age Bracket 8: Adult Mid (35-44)
INSERT INTO public.descriptors_gender (simple_term, rich_description, pronouns, min_age, max_age, age_stage) VALUES
('male', 'man', 'he/him', 35, 44, 'adult_mid'),
('female', 'woman', 'she/her', 35, 44, 'adult_mid'),
('non-binary', 'person', 'they/them', 35, 44, 'adult_mid');

-- Age Bracket 9: Middle-Aged (45-54)
INSERT INTO public.descriptors_gender (simple_term, rich_description, pronouns, min_age, max_age, age_stage) VALUES
('male', 'middle-aged man', 'he/him', 45, 54, 'middle_aged'),
('female', 'middle-aged woman', 'she/her', 45, 54, 'middle_aged'),
('non-binary', 'middle-aged person', 'they/them', 45, 54, 'middle_aged');

-- Age Bracket 10: Mature (55-64)
INSERT INTO public.descriptors_gender (simple_term, rich_description, pronouns, min_age, max_age, age_stage) VALUES
('male', 'mature man', 'he/him', 55, 64, 'mature'),
('female', 'mature woman', 'she/her', 55, 64, 'mature'),
('non-binary', 'mature person', 'they/them', 55, 64, 'mature');

-- Age Bracket 11: Senior (65-74)
INSERT INTO public.descriptors_gender (simple_term, rich_description, pronouns, min_age, max_age, age_stage) VALUES
('male', 'older man', 'he/him', 65, 74, 'senior'),
('female', 'older woman', 'she/her', 65, 74, 'senior'),
('non-binary', 'older person', 'they/them', 65, 74, 'senior');

-- Age Bracket 12: Elderly (75-99)
INSERT INTO public.descriptors_gender (simple_term, rich_description, pronouns, min_age, max_age, age_stage) VALUES
('male', 'elderly man', 'he/him', 75, 99, 'elderly'),
('female', 'elderly woman', 'she/her', 75, 99, 'elderly'),
('non-binary', 'elderly person', 'they/them', 75, 99, 'elderly');

-- Step 5: Extend descriptors_age table to include ages 19-99
INSERT INTO public.descriptors_age (age_value, age_label, rich_description) VALUES
-- Ages 19-29
(19, '19', 'nineteen-year-old'),
(20, '20', 'twenty-year-old'),
(21, '21', 'twenty-one-year-old'),
(22, '22', 'twenty-two-year-old'),
(23, '23', 'twenty-three-year-old'),
(24, '24', 'twenty-four-year-old'),
(25, '25', 'twenty-five-year-old'),
(26, '26', 'twenty-six-year-old'),
(27, '27', 'twenty-seven-year-old'),
(28, '28', 'twenty-eight-year-old'),
(29, '29', 'twenty-nine-year-old'),

-- Ages 30-39
(30, '30', 'thirty-year-old'),
(31, '31', 'thirty-one-year-old'),
(32, '32', 'thirty-two-year-old'),
(33, '33', 'thirty-three-year-old'),
(34, '34', 'thirty-four-year-old'),
(35, '35', 'thirty-five-year-old'),
(36, '36', 'thirty-six-year-old'),
(37, '37', 'thirty-seven-year-old'),
(38, '38', 'thirty-eight-year-old'),
(39, '39', 'thirty-nine-year-old'),

-- Ages 40-49
(40, '40', 'forty-year-old'),
(41, '41', 'forty-one-year-old'),
(42, '42', 'forty-two-year-old'),
(43, '43', 'forty-three-year-old'),
(44, '44', 'forty-four-year-old'),
(45, '45', 'forty-five-year-old'),
(46, '46', 'forty-six-year-old'),
(47, '47', 'forty-seven-year-old'),
(48, '48', 'forty-eight-year-old'),
(49, '49', 'forty-nine-year-old'),

-- Ages 50-59
(50, '50', 'fifty-year-old'),
(51, '51', 'fifty-one-year-old'),
(52, '52', 'fifty-two-year-old'),
(53, '53', 'fifty-three-year-old'),
(54, '54', 'fifty-four-year-old'),
(55, '55', 'fifty-five-year-old'),
(56, '56', 'fifty-six-year-old'),
(57, '57', 'fifty-seven-year-old'),
(58, '58', 'fifty-eight-year-old'),
(59, '59', 'fifty-nine-year-old'),

-- Ages 60-69
(60, '60', 'sixty-year-old'),
(61, '61', 'sixty-one-year-old'),
(62, '62', 'sixty-two-year-old'),
(63, '63', 'sixty-three-year-old'),
(64, '64', 'sixty-four-year-old'),
(65, '65', 'sixty-five-year-old'),
(66, '66', 'sixty-six-year-old'),
(67, '67', 'sixty-seven-year-old'),
(68, '68', 'sixty-eight-year-old'),
(69, '69', 'sixty-nine-year-old'),

-- Ages 70-79
(70, '70', 'seventy-year-old'),
(71, '71', 'seventy-one-year-old'),
(72, '72', 'seventy-two-year-old'),
(73, '73', 'seventy-three-year-old'),
(74, '74', 'seventy-four-year-old'),
(75, '75', 'seventy-five-year-old'),
(76, '76', 'seventy-six-year-old'),
(77, '77', 'seventy-seven-year-old'),
(78, '78', 'seventy-eight-year-old'),
(79, '79', 'seventy-nine-year-old'),

-- Ages 80-89
(80, '80', 'eighty-year-old'),
(81, '81', 'eighty-one-year-old'),
(82, '82', 'eighty-two-year-old'),
(83, '83', 'eighty-three-year-old'),
(84, '84', 'eighty-four-year-old'),
(85, '85', 'eighty-five-year-old'),
(86, '86', 'eighty-six-year-old'),
(87, '87', 'eighty-seven-year-old'),
(88, '88', 'eighty-eight-year-old'),
(89, '89', 'eighty-nine-year-old'),

-- Ages 90-99
(90, '90', 'ninety-year-old'),
(91, '91', 'ninety-one-year-old'),
(92, '92', 'ninety-two-year-old'),
(93, '93', 'ninety-three-year-old'),
(94, '94', 'ninety-four-year-old'),
(95, '95', 'ninety-five-year-old'),
(96, '96', 'ninety-six-year-old'),
(97, '97', 'ninety-seven-year-old'),
(98, '98', 'ninety-eight-year-old'),
(99, '99', 'ninety-nine-year-old');

-- Step 6: Add indexes for age-based lookups
CREATE INDEX IF NOT EXISTS idx_descriptors_gender_age_range
ON public.descriptors_gender (simple_term, min_age, max_age);

-- Step 7: Add check constraint to ensure valid age ranges
ALTER TABLE public.descriptors_gender
ADD CONSTRAINT check_valid_age_range CHECK (min_age <= max_age);

-- Step 8: Create helper function to get age-aware gender descriptor
CREATE OR REPLACE FUNCTION public.get_gender_descriptor_for_age(
  p_gender TEXT,
  p_age INTEGER
) RETURNS TEXT AS $$
DECLARE
  v_rich_description TEXT;
BEGIN
  SELECT rich_description INTO v_rich_description
  FROM public.descriptors_gender
  WHERE simple_term = p_gender
    AND p_age >= min_age
    AND p_age <= max_age
    AND is_active = true
  LIMIT 1;

  RETURN COALESCE(v_rich_description, p_gender);
END;
$$ LANGUAGE plpgsql STABLE;

-- Grant execute permission to authenticated users
GRANT EXECUTE ON FUNCTION public.get_gender_descriptor_for_age(TEXT, INTEGER) TO authenticated;

-- ========================================
-- Verification Query (Optional - run separately to verify)
-- ========================================
-- SELECT age_number, simple_term as gender,
--        public.get_gender_descriptor_for_age(simple_term, age_number) as descriptor
-- FROM (VALUES
--   (6, 'male'), (25, 'male'), (45, 'male'), (66, 'male'), (99, 'male'),
--   (6, 'female'), (25, 'female'), (45, 'female'), (66, 'female'), (99, 'female')
-- ) AS test(age_number, simple_term);
--
-- Expected output:
-- 6, male → "young boy"
-- 25, male → "man"
-- 45, male → "middle-aged man"
-- 66, male → "older man"
-- 99, male → "elderly man"
