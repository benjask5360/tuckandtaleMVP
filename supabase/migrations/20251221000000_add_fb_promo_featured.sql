-- Add column to track stories featured on FB promo landing page
ALTER TABLE content
ADD COLUMN IF NOT EXISTS featured_on_fb_promo BOOLEAN DEFAULT FALSE;

-- Create index for faster queries
CREATE INDEX IF NOT EXISTS idx_content_fb_promo_featured
ON content(featured_on_fb_promo)
WHERE featured_on_fb_promo = TRUE;

-- Add comment for documentation
COMMENT ON COLUMN content.featured_on_fb_promo IS 'Whether this story is featured on the /bedtime-fb-promo landing page carousel';
