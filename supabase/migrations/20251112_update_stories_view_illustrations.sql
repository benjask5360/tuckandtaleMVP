-- Update stories view to include story_illustrations field
-- This allows the Story Viewer to display scene illustrations

-- Drop existing view
DROP VIEW IF EXISTS stories CASCADE;

-- Recreate the stories view with story_illustrations included
CREATE OR REPLACE VIEW stories AS
SELECT c.*
FROM content c
WHERE c.content_type = 'story'
  AND c.deleted_at IS NULL;

-- Grant permissions on the view
GRANT SELECT ON stories TO authenticated;
GRANT SELECT ON stories TO anon;

-- Add comment to document the view
COMMENT ON VIEW stories IS 'View for accessing story content with illustrations. Filters out deleted stories and includes story_illustrations JSONB field for scene images.';