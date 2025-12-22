-- Add display order column for FB promo carousel
ALTER TABLE content
ADD COLUMN IF NOT EXISTS fb_promo_display_order INTEGER DEFAULT 0;

-- Create index for sorting
CREATE INDEX IF NOT EXISTS idx_content_fb_promo_display_order
ON content(fb_promo_display_order)
WHERE featured_on_fb_promo = TRUE;

-- Add comment for documentation
COMMENT ON COLUMN content.fb_promo_display_order IS 'Sort order for stories on /bedtime-fb-promo carousel (lower numbers appear first)';
