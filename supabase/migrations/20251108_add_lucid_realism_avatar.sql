-- ================================================
-- Add Lucid Realism Avatar Configuration
-- ================================================
-- Adds Leonardo Lucid Realism model for avatar generation
-- with 512x768 portrait dimensions (safe, proven size)
-- Sets as new default for avatar_generation purpose

-- Update existing default to non-default
UPDATE public.ai_configs
SET is_default = false, updated_at = now()
WHERE purpose = 'avatar_generation'
  AND is_default = true
  AND provider = 'leonardo';

-- Insert new Lucid Realism config as default
INSERT INTO public.ai_configs (
    name,
    purpose,
    provider,
    model_id,
    model_name,
    settings,
    cost_per_generation,
    is_default,
    is_active
)
VALUES (
    'leonardo_lucid_realism_avatar',
    'avatar_generation',
    'leonardo',
    '05ce0082-2d80-4a2d-8653-4d1c85e2418e',
    'Lucid Realism',
    '{
        "width": 512,
        "height": 768,
        "num_inference_steps": 30,
        "guidance_scale": 7
    }'::jsonb,
    0.6,
    true,
    true
)
ON CONFLICT (name) DO UPDATE SET
    model_id = EXCLUDED.model_id,
    model_name = EXCLUDED.model_name,
    settings = EXCLUDED.settings,
    cost_per_generation = EXCLUDED.cost_per_generation,
    is_default = EXCLUDED.is_default,
    is_active = EXCLUDED.is_active,
    updated_at = now();
