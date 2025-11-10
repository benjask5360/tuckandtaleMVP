-- ================================================
-- Add Vignette Panorama AI Configuration
-- ================================================
-- Adds Leonardo Lucid Realism configuration for generating
-- panoramic 9-panel storyboard images (3072x3072 resolution)
-- Each panel will be 1024x1024 when sliced

-- Update ai_configs purpose constraint to include story_vignette_panorama
ALTER TABLE public.ai_configs
DROP CONSTRAINT IF EXISTS ai_configs_purpose_check;

ALTER TABLE public.ai_configs
ADD CONSTRAINT ai_configs_purpose_check
CHECK (purpose IN ('avatar_generation', 'story_fun', 'story_growth', 'story_illustration', 'story_vignette_panorama'));

-- Insert Lucid Realism config for vignette panoramas
INSERT INTO public.ai_configs (
    name,
    purpose,
    provider,
    model_id,
    model_name,
    model_type,
    settings,
    is_default,
    is_active
)
VALUES (
    'leonardo_lucid_realism_vignette_panorama',
    'story_vignette_panorama',
    'leonardo',
    '05ce0082-2d80-4a2d-8653-4d1c85e2418e', -- Lucid Realism model ID
    'Lucid Realism',
    'image',
    '{
        "width": 3072,
        "height": 3072,
        "num_images": 1,
        "num_inference_steps": 40,
        "guidance_scale": 7,
        "scheduler": "LEONARDO",
        "public": false,
        "tiling": false,
        "negative_prompt": "bad anatomy, blurry, low quality, pixelated, distorted, text, captions, watermark, realistic photo, separate images, borders, frames",
        "sd_version": "SDXL_LIGHTNING"
    }'::jsonb,
    true, -- Set as default for vignette panoramas
    true
)
ON CONFLICT (name) DO UPDATE SET
    model_id = EXCLUDED.model_id,
    model_name = EXCLUDED.model_name,
    model_type = EXCLUDED.model_type,
    settings = EXCLUDED.settings,
    is_default = EXCLUDED.is_default,
    is_active = EXCLUDED.is_active,
    updated_at = now();

-- Add comment for documentation
COMMENT ON COLUMN public.ai_configs.purpose IS 'Operation type: avatar_generation, story_fun, story_growth, story_illustration, or story_vignette_panorama';
