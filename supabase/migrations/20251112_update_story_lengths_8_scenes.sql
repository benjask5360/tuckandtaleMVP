-- Update story length parameters to always have exactly 8 scenes/paragraphs
-- Only the word count varies by length

UPDATE story_parameters
SET metadata = jsonb_build_object(
    'paragraph_count_min', 8,
    'paragraph_count_max', 8,
    'word_count_min', 400,
    'word_count_max', 480,
    'estimated_reading_minutes', 3
)
WHERE type = 'length' AND name = 'short';

UPDATE story_parameters
SET metadata = jsonb_build_object(
    'paragraph_count_min', 8,
    'paragraph_count_max', 8,
    'word_count_min', 640,
    'word_count_max', 800,
    'estimated_reading_minutes', 5
)
WHERE type = 'length' AND name = 'medium';

UPDATE story_parameters
SET metadata = jsonb_build_object(
    'paragraph_count_min', 8,
    'paragraph_count_max', 8,
    'word_count_min', 960,
    'word_count_max', 1200,
    'estimated_reading_minutes', 8
)
WHERE type = 'length' AND name = 'long';