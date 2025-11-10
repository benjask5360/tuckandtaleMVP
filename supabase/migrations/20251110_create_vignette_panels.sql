-- Create vignette_panels table for storing individual panels from panoramic story images
CREATE TABLE IF NOT EXISTS vignette_panels (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  story_id uuid NOT NULL REFERENCES content(id) ON DELETE CASCADE,
  panel_number integer NOT NULL CHECK (panel_number >= 1 AND panel_number <= 9),
  image_url text NOT NULL,
  storage_path text NOT NULL,
  created_at timestamptz DEFAULT now(),

  -- Ensure unique panel numbers per story
  UNIQUE(story_id, panel_number)
);

-- Create index for efficient story lookups
CREATE INDEX idx_vignette_panels_story_id ON vignette_panels(story_id);

-- Create index for ordering panels
CREATE INDEX idx_vignette_panels_story_panel ON vignette_panels(story_id, panel_number);

-- Add RLS policies
ALTER TABLE vignette_panels ENABLE ROW LEVEL SECURITY;

-- Users can view their own vignette panels
CREATE POLICY "Users can view their own vignette panels"
  ON vignette_panels
  FOR SELECT
  USING (
    EXISTS (
      SELECT 1 FROM content
      WHERE content.id = vignette_panels.story_id
      AND content.user_id = auth.uid()
    )
  );

-- Users can insert vignette panels for their own stories
CREATE POLICY "Users can insert vignette panels for their own stories"
  ON vignette_panels
  FOR INSERT
  WITH CHECK (
    EXISTS (
      SELECT 1 FROM content
      WHERE content.id = vignette_panels.story_id
      AND content.user_id = auth.uid()
    )
  );

-- Users can delete their own vignette panels
CREATE POLICY "Users can delete their own vignette panels"
  ON vignette_panels
  FOR DELETE
  USING (
    EXISTS (
      SELECT 1 FROM content
      WHERE content.id = vignette_panels.story_id
      AND content.user_id = auth.uid()
    )
  );
