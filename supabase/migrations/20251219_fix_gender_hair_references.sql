-- Remove hair color references from gender rich descriptions
-- Hair color should come from the separate hair descriptor selection to avoid contradictions

-- Update male gender descriptions for ages 55+
UPDATE descriptors_gender
SET rich_description = 'mature man with weathered features'
WHERE simple_term = 'male'
  AND age_min = 55
  AND age_max = 64;

UPDATE descriptors_gender
SET rich_description = 'older man with gentle wrinkles and kind eyes'
WHERE simple_term = 'male'
  AND age_min = 65
  AND age_max = 69;

UPDATE descriptors_gender
SET rich_description = 'older man with laugh lines and experienced features'
WHERE simple_term = 'male'
  AND age_min = 70
  AND age_max = 74;

UPDATE descriptors_gender
SET rich_description = 'elderly man with deep smile lines, age spots, and wise kindly features'
WHERE simple_term = 'male'
  AND age_min = 75
  AND age_max = 84;

UPDATE descriptors_gender
SET rich_description = 'very elderly man with pronounced wrinkles and gentle aged features'
WHERE simple_term = 'male'
  AND age_min = 85
  AND age_max = 99;

-- Update female gender descriptions for ages 55+
UPDATE descriptors_gender
SET rich_description = 'mature woman with elegant aging'
WHERE simple_term = 'female'
  AND age_min = 55
  AND age_max = 64;

UPDATE descriptors_gender
SET rich_description = 'older woman with soft wrinkles and warm features'
WHERE simple_term = 'female'
  AND age_min = 65
  AND age_max = 69;

UPDATE descriptors_gender
SET rich_description = 'older woman with smile lines and graceful aging'
WHERE simple_term = 'female'
  AND age_min = 70
  AND age_max = 74;

UPDATE descriptors_gender
SET rich_description = 'elderly woman with gentle wrinkles, soft skin, and warm wise features'
WHERE simple_term = 'female'
  AND age_min = 75
  AND age_max = 84;

UPDATE descriptors_gender
SET rich_description = 'very elderly woman with delicate aged skin and serene features'
WHERE simple_term = 'female'
  AND age_min = 85
  AND age_max = 99;

-- Update non-binary descriptions for ages 55+ (if they exist with hair references)
UPDATE descriptors_gender
SET rich_description = 'mature person with weathered features'
WHERE simple_term = 'non_binary'
  AND age_min = 55
  AND age_max = 64
  AND rich_description LIKE '%hair%';

UPDATE descriptors_gender
SET rich_description = 'older person with gentle wrinkles and kind eyes'
WHERE simple_term = 'non_binary'
  AND age_min = 65
  AND age_max = 69
  AND rich_description LIKE '%hair%';

UPDATE descriptors_gender
SET rich_description = 'older person with laugh lines and experienced features'
WHERE simple_term = 'non_binary'
  AND age_min = 70
  AND age_max = 74
  AND rich_description LIKE '%hair%';

UPDATE descriptors_gender
SET rich_description = 'elderly person with deep smile lines and wise features'
WHERE simple_term = 'non_binary'
  AND age_min = 75
  AND age_max = 84
  AND rich_description LIKE '%hair%';

UPDATE descriptors_gender
SET rich_description = 'very elderly person with pronounced wrinkles and gentle aged features'
WHERE simple_term = 'non_binary'
  AND age_min = 85
  AND age_max = 99
  AND rich_description LIKE '%hair%';