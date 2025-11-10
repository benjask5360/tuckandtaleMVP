-- ========================================
-- Streamline Age Descriptors Table
-- ========================================
-- Simplifies descriptors_age table by:
-- 1. Removing redundant age_label (same as rich_description)
-- 2. Removing unused min_age/max_age (these belong in gender table)
-- 3. Keeping developmental_stage as optional metadata

-- Note: This migration preserves developmental_stage as it may be useful
-- for future features, even though it's not currently used in code logic

-- Step 1: Drop redundant columns
ALTER TABLE public.descriptors_age
DROP COLUMN IF EXISTS age_label,
DROP COLUMN IF EXISTS min_age,
DROP COLUMN IF EXISTS max_age;

-- Step 2: Update existing rich_description values to be consistent
-- Ensure all ages 0-99 have standardized descriptions

-- Clear and rebuild with consistent data
DELETE FROM public.descriptors_age;

-- Insert standardized age descriptors (0-18 years - primary story age range)
INSERT INTO public.descriptors_age (age_value, rich_description, developmental_stage) VALUES
-- Infants (0-1)
(0, 'baby', 'infant'),
(1, 'one-year-old', 'infant'),

-- Toddlers (2-3)
(2, 'two-year-old', 'toddler'),
(3, 'three-year-old', 'toddler'),

-- Preschoolers (4-5)
(4, 'four-year-old', 'preschool'),
(5, 'five-year-old', 'preschool'),

-- Early childhood (6-7)
(6, 'six-year-old', 'early childhood'),
(7, 'seven-year-old', 'early childhood'),

-- Middle childhood (8-10)
(8, 'eight-year-old', 'middle childhood'),
(9, 'nine-year-old', 'middle childhood'),
(10, 'ten-year-old', 'middle childhood'),

-- Pre-teen (11-12)
(11, 'eleven-year-old', 'pre-teen'),
(12, 'twelve-year-old', 'pre-teen'),

-- Teen (13-17)
(13, 'thirteen-year-old', 'teen'),
(14, 'fourteen-year-old', 'teen'),
(15, 'fifteen-year-old', 'teen'),
(16, 'sixteen-year-old', 'teen'),
(17, 'seventeen-year-old', 'teen'),

-- Young adult (18+)
(18, 'eighteen-year-old', 'young adult');

-- Insert ages 19-99 (less common but available)
INSERT INTO public.descriptors_age (age_value, rich_description, developmental_stage) VALUES
-- Young adults (19-29)
(19, 'nineteen-year-old', 'young adult'),
(20, 'twenty-year-old', 'young adult'),
(21, 'twenty-one-year-old', 'young adult'),
(22, 'twenty-two-year-old', 'young adult'),
(23, 'twenty-three-year-old', 'young adult'),
(24, 'twenty-four-year-old', 'young adult'),
(25, 'twenty-five-year-old', 'young adult'),
(26, 'twenty-six-year-old', 'young adult'),
(27, 'twenty-seven-year-old', 'young adult'),
(28, 'twenty-eight-year-old', 'young adult'),
(29, 'twenty-nine-year-old', 'young adult'),

-- Adults (30-39)
(30, 'thirty-year-old', 'adult'),
(31, 'thirty-one-year-old', 'adult'),
(32, 'thirty-two-year-old', 'adult'),
(33, 'thirty-three-year-old', 'adult'),
(34, 'thirty-four-year-old', 'adult'),
(35, 'thirty-five-year-old', 'adult'),
(36, 'thirty-six-year-old', 'adult'),
(37, 'thirty-seven-year-old', 'adult'),
(38, 'thirty-eight-year-old', 'adult'),
(39, 'thirty-nine-year-old', 'adult'),

-- Middle-aged (40-54)
(40, 'forty-year-old', 'middle-aged'),
(41, 'forty-one-year-old', 'middle-aged'),
(42, 'forty-two-year-old', 'middle-aged'),
(43, 'forty-three-year-old', 'middle-aged'),
(44, 'forty-four-year-old', 'middle-aged'),
(45, 'forty-five-year-old', 'middle-aged'),
(46, 'forty-six-year-old', 'middle-aged'),
(47, 'forty-seven-year-old', 'middle-aged'),
(48, 'forty-eight-year-old', 'middle-aged'),
(49, 'forty-nine-year-old', 'middle-aged'),
(50, 'fifty-year-old', 'middle-aged'),
(51, 'fifty-one-year-old', 'middle-aged'),
(52, 'fifty-two-year-old', 'middle-aged'),
(53, 'fifty-three-year-old', 'middle-aged'),
(54, 'fifty-four-year-old', 'middle-aged'),

-- Mature (55-64)
(55, 'fifty-five-year-old', 'mature'),
(56, 'fifty-six-year-old', 'mature'),
(57, 'fifty-seven-year-old', 'mature'),
(58, 'fifty-eight-year-old', 'mature'),
(59, 'fifty-nine-year-old', 'mature'),
(60, 'sixty-year-old', 'mature'),
(61, 'sixty-one-year-old', 'mature'),
(62, 'sixty-two-year-old', 'mature'),
(63, 'sixty-three-year-old', 'mature'),
(64, 'sixty-four-year-old', 'mature'),

-- Senior (65-74)
(65, 'sixty-five-year-old', 'senior'),
(66, 'sixty-six-year-old', 'senior'),
(67, 'sixty-seven-year-old', 'senior'),
(68, 'sixty-eight-year-old', 'senior'),
(69, 'sixty-nine-year-old', 'senior'),
(70, 'seventy-year-old', 'senior'),
(71, 'seventy-one-year-old', 'senior'),
(72, 'seventy-two-year-old', 'senior'),
(73, 'seventy-three-year-old', 'senior'),
(74, 'seventy-four-year-old', 'senior'),

-- Elderly (75-99)
(75, 'seventy-five-year-old', 'elderly'),
(76, 'seventy-six-year-old', 'elderly'),
(77, 'seventy-seven-year-old', 'elderly'),
(78, 'seventy-eight-year-old', 'elderly'),
(79, 'seventy-nine-year-old', 'elderly'),
(80, 'eighty-year-old', 'elderly'),
(81, 'eighty-one-year-old', 'elderly'),
(82, 'eighty-two-year-old', 'elderly'),
(83, 'eighty-three-year-old', 'elderly'),
(84, 'eighty-four-year-old', 'elderly'),
(85, 'eighty-five-year-old', 'elderly'),
(86, 'eighty-six-year-old', 'elderly'),
(87, 'eighty-seven-year-old', 'elderly'),
(88, 'eighty-eight-year-old', 'elderly'),
(89, 'eighty-nine-year-old', 'elderly'),
(90, 'ninety-year-old', 'elderly'),
(91, 'ninety-one-year-old', 'elderly'),
(92, 'ninety-two-year-old', 'elderly'),
(93, 'ninety-three-year-old', 'elderly'),
(94, 'ninety-four-year-old', 'elderly'),
(95, 'ninety-five-year-old', 'elderly'),
(96, 'ninety-six-year-old', 'elderly'),
(97, 'ninety-seven-year-old', 'elderly'),
(98, 'ninety-eight-year-old', 'elderly'),
(99, 'ninety-nine-year-old', 'elderly');

-- Step 3: Update the type definition if you're using TypeScript
-- The DescriptorAge interface should now only have:
--   - age_value (number)
--   - rich_description (string)
--   - developmental_stage (string, optional)
--   - is_active (boolean)
--   - id, created_at, updated_at (standard fields)

-- Add comment for documentation
COMMENT ON TABLE public.descriptors_age IS 'Age descriptors with standardized descriptions. developmental_stage provides optional categorical grouping.';
COMMENT ON COLUMN public.descriptors_age.age_value IS 'Numeric age (0-99)';
COMMENT ON COLUMN public.descriptors_age.rich_description IS 'Text description used in AI prompts (e.g., "six-year-old")';
COMMENT ON COLUMN public.descriptors_age.developmental_stage IS 'Optional categorical stage (infant, toddler, preschool, early childhood, middle childhood, pre-teen, teen, young adult, adult, middle-aged, mature, senior, elderly)';

-- ========================================
-- Verification Query
-- ========================================
-- Run this to verify the streamlined table:
-- SELECT age_value, rich_description, developmental_stage
-- FROM public.descriptors_age
-- WHERE age_value IN (0, 1, 2, 3, 4, 6, 8, 11, 13, 18, 25, 40, 65, 75)
-- ORDER BY age_value;
