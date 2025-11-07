-- ================================================
-- Avatar Generation System - Complete Setup
-- ================================================
-- Adds AI configuration, usage tracking, and monthly regeneration limits

-- 1. Create AI Configuration Table
-- ================================================
CREATE TABLE IF NOT EXISTS public.ai_configs (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    name TEXT NOT NULL UNIQUE, -- e.g., 'leonardo_diffusion_xl_avatar'
    purpose TEXT NOT NULL CHECK (purpose IN ('avatar_generation', 'story_generation', 'story_illustration')),
    provider TEXT NOT NULL CHECK (provider IN ('leonardo', 'openai', 'stability', 'midjourney')),
    model_id TEXT NOT NULL, -- Leonardo model ID or other provider's model identifier
    model_name TEXT NOT NULL, -- Human-readable model name
    settings JSONB NOT NULL DEFAULT '{}', -- Model-specific settings
    cost_per_generation DECIMAL(10, 4) DEFAULT 0, -- Cost in credits or dollars
    is_active BOOLEAN DEFAULT true,
    is_default BOOLEAN DEFAULT false, -- Is this the default config for its purpose?
    created_at TIMESTAMPTZ DEFAULT now(),
    updated_at TIMESTAMPTZ DEFAULT now()
);

-- 2. Create Avatar Generation Usage Table
-- ================================================
CREATE TABLE IF NOT EXISTS public.avatar_generation_usage (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    user_id UUID NOT NULL REFERENCES auth.users(id) ON DELETE CASCADE,
    character_profile_id UUID NOT NULL REFERENCES public.character_profiles(id) ON DELETE CASCADE,
    month_year TEXT NOT NULL, -- Format: '2024-11'
    generation_count INTEGER DEFAULT 1,
    last_generated_at TIMESTAMPTZ DEFAULT now(),
    subscription_tier TEXT NOT NULL, -- Snapshot of tier at generation time
    ai_config_name TEXT NOT NULL, -- Which model/config was used
    created_at TIMESTAMPTZ DEFAULT now(),
    updated_at TIMESTAMPTZ DEFAULT now(),
    UNIQUE(user_id, character_profile_id, month_year)
);

-- 3. Update avatar_cache table
-- ================================================
ALTER TABLE public.avatar_cache
ADD COLUMN IF NOT EXISTS ai_config_id UUID REFERENCES public.ai_configs(id),
ADD COLUMN IF NOT EXISTS ai_config_name TEXT,
ADD COLUMN IF NOT EXISTS generation_attempts INTEGER DEFAULT 1,
ADD COLUMN IF NOT EXISTS processing_status TEXT DEFAULT 'pending'
    CHECK (processing_status IN ('pending', 'processing', 'completed', 'failed')),
ADD COLUMN IF NOT EXISTS error_message TEXT,
ADD COLUMN IF NOT EXISTS leonardo_api_credits_used INTEGER;

-- 4. Update subscription_tiers with regeneration limits
-- ================================================
ALTER TABLE public.subscription_tiers
ADD COLUMN IF NOT EXISTS avatar_regenerations_per_month INTEGER DEFAULT 1;

-- Set regeneration limits per tier
UPDATE public.subscription_tiers
SET avatar_regenerations_per_month = CASE
    WHEN name = 'free' THEN 1
    WHEN name = 'moonlight' THEN 5
    WHEN name = 'starlight' THEN 10
    WHEN name = 'supernova' THEN 999 -- Effectively unlimited
    ELSE 1
END;

-- 5. Update api_cost_logs for better tracking
-- ================================================
ALTER TABLE public.api_cost_logs
ADD COLUMN IF NOT EXISTS ai_config_name TEXT,
ADD COLUMN IF NOT EXISTS character_profile_id UUID REFERENCES public.character_profiles(id);

-- 6. Insert default AI configurations
-- ================================================
INSERT INTO public.ai_configs (name, purpose, provider, model_id, model_name, settings, cost_per_generation, is_default)
VALUES
    (
        'leonardo_diffusion_xl_avatar',
        'avatar_generation',
        'leonardo',
        '1e60896f-3c26-4296-8ecc-53e2afecc132', -- Leonardo Diffusion XL model ID
        'Leonardo Diffusion XL',
        '{
            "width": 512,
            "height": 768,
            "num_images": 1,
            "num_inference_steps": 30,
            "guidance_scale": 7,
            "scheduler": "LEONARDO",
            "public": false,
            "tiling": false,
            "negative_prompt": "bad anatomy, blurry, low quality, pixelated, distorted",
            "sd_version": "SDXL_LIGHTNING"
        }'::jsonb,
        0.5, -- Approximate cost in Leonardo credits
        true -- Set as default for avatar generation
    ),
    (
        'leonardo_anime_xl_avatar',
        'avatar_generation',
        'leonardo',
        '5c232a0f-9257-4224-89c5-0326e3e8b5d6', -- Leonardo Anime XL model ID
        'Leonardo Anime XL',
        '{
            "width": 512,
            "height": 768,
            "num_images": 1,
            "num_inference_steps": 30,
            "guidance_scale": 7,
            "scheduler": "LEONARDO",
            "public": false,
            "tiling": false,
            "negative_prompt": "bad anatomy, blurry, low quality, pixelated, distorted, realistic",
            "sd_version": "SDXL_LIGHTNING"
        }'::jsonb,
        0.5,
        false
    ),
    (
        'leonardo_diffusion_xl_story',
        'story_illustration',
        'leonardo',
        '1e60896f-3c26-4296-8ecc-53e2afecc132',
        'Leonardo Diffusion XL',
        '{
            "width": 1024,
            "height": 768,
            "num_images": 1,
            "num_inference_steps": 30,
            "guidance_scale": 7.5,
            "scheduler": "LEONARDO",
            "public": false,
            "tiling": false,
            "negative_prompt": "bad anatomy, blurry, low quality, pixelated, distorted, text, watermark",
            "sd_version": "SDXL_LIGHTNING"
        }'::jsonb,
        1.0, -- Higher resolution costs more
        true -- Set as default for story illustrations
    )
ON CONFLICT (name) DO NOTHING;

-- 7. Create indexes for performance
-- ================================================
CREATE INDEX IF NOT EXISTS idx_ai_configs_purpose ON public.ai_configs(purpose, is_active);
CREATE INDEX IF NOT EXISTS idx_ai_configs_default ON public.ai_configs(purpose, is_default);
CREATE INDEX IF NOT EXISTS idx_avatar_generation_usage_user ON public.avatar_generation_usage(user_id, character_profile_id, month_year);
CREATE INDEX IF NOT EXISTS idx_avatar_cache_character ON public.avatar_cache(character_profile_id, is_current);
CREATE INDEX IF NOT EXISTS idx_avatar_cache_status ON public.avatar_cache(processing_status);

-- 8. Create function to get remaining regenerations
-- ================================================
CREATE OR REPLACE FUNCTION public.get_remaining_regenerations(
    p_user_id UUID,
    p_character_profile_id UUID
) RETURNS TABLE (
    used INTEGER,
    limit_count INTEGER,
    remaining INTEGER,
    resets_in_days INTEGER
) AS $$
DECLARE
    v_month_year TEXT;
    v_used INTEGER;
    v_tier TEXT;
    v_limit INTEGER;
    v_days_until_reset INTEGER;
BEGIN
    -- Get current month
    v_month_year := TO_CHAR(CURRENT_DATE, 'YYYY-MM');

    -- Get user's current tier
    SELECT st.name INTO v_tier
    FROM public.user_profiles up
    JOIN public.subscription_tiers st ON up.subscription_tier_id = st.id
    WHERE up.id = p_user_id;

    -- Get tier's limit
    SELECT avatar_regenerations_per_month INTO v_limit
    FROM public.subscription_tiers
    WHERE name = v_tier;

    -- Get usage for current month
    SELECT COALESCE(generation_count, 0) INTO v_used
    FROM public.avatar_generation_usage
    WHERE user_id = p_user_id
    AND character_profile_id = p_character_profile_id
    AND month_year = v_month_year;

    -- Calculate days until month reset
    v_days_until_reset := DATE_PART('day',
        DATE_TRUNC('month', CURRENT_DATE) + INTERVAL '1 month' - CURRENT_DATE
    )::INTEGER;

    RETURN QUERY
    SELECT
        COALESCE(v_used, 0),
        COALESCE(v_limit, 1),
        GREATEST(0, COALESCE(v_limit, 1) - COALESCE(v_used, 0)),
        v_days_until_reset;
END;
$$ LANGUAGE plpgsql STABLE;

-- 9. Create function to increment usage
-- ================================================
CREATE OR REPLACE FUNCTION public.increment_avatar_generation(
    p_user_id UUID,
    p_character_profile_id UUID,
    p_ai_config_name TEXT
) RETURNS BOOLEAN AS $$
DECLARE
    v_month_year TEXT;
    v_tier TEXT;
    v_current_count INTEGER;
    v_limit INTEGER;
BEGIN
    -- Get current month
    v_month_year := TO_CHAR(CURRENT_DATE, 'YYYY-MM');

    -- Get user's current tier
    SELECT st.name INTO v_tier
    FROM public.user_profiles up
    JOIN public.subscription_tiers st ON up.subscription_tier_id = st.id
    WHERE up.id = p_user_id;

    -- Get tier's limit
    SELECT avatar_regenerations_per_month INTO v_limit
    FROM public.subscription_tiers
    WHERE name = v_tier;

    -- Insert or update usage
    INSERT INTO public.avatar_generation_usage (
        user_id,
        character_profile_id,
        month_year,
        generation_count,
        subscription_tier,
        ai_config_name,
        last_generated_at
    ) VALUES (
        p_user_id,
        p_character_profile_id,
        v_month_year,
        1,
        v_tier,
        p_ai_config_name,
        NOW()
    )
    ON CONFLICT (user_id, character_profile_id, month_year)
    DO UPDATE SET
        generation_count = avatar_generation_usage.generation_count + 1,
        last_generated_at = NOW(),
        ai_config_name = p_ai_config_name,
        updated_at = NOW()
    RETURNING generation_count INTO v_current_count;

    -- Return true if within limits
    RETURN v_current_count <= v_limit;
END;
$$ LANGUAGE plpgsql;

-- 10. Row Level Security Policies
-- ================================================

-- AI Configs - Public read, admin write
ALTER TABLE public.ai_configs ENABLE ROW LEVEL SECURITY;

CREATE POLICY "AI configs are viewable by all authenticated users"
    ON public.ai_configs FOR SELECT
    TO authenticated
    USING (is_active = true);

CREATE POLICY "AI configs are manageable by admins"
    ON public.ai_configs FOR ALL
    TO authenticated
    USING (
        EXISTS (
            SELECT 1 FROM public.user_profiles
            WHERE user_profiles.id = auth.uid()
            AND user_profiles.user_type = 'admin'
        )
    );

-- Avatar Generation Usage - Users can see/modify their own
ALTER TABLE public.avatar_generation_usage ENABLE ROW LEVEL SECURITY;

CREATE POLICY "Users can view their own avatar generation usage"
    ON public.avatar_generation_usage FOR SELECT
    TO authenticated
    USING (user_id = auth.uid());

CREATE POLICY "Users can update their own avatar generation usage"
    ON public.avatar_generation_usage FOR ALL
    TO authenticated
    USING (user_id = auth.uid());

-- Grant function permissions
GRANT EXECUTE ON FUNCTION public.get_remaining_regenerations(UUID, UUID) TO authenticated;
GRANT EXECUTE ON FUNCTION public.increment_avatar_generation(UUID, UUID, TEXT) TO authenticated;

-- Create updated_at trigger for new tables
CREATE TRIGGER handle_ai_configs_updated_at BEFORE UPDATE ON public.ai_configs
    FOR EACH ROW EXECUTE FUNCTION public.handle_updated_at();

CREATE TRIGGER handle_avatar_generation_usage_updated_at BEFORE UPDATE ON public.avatar_generation_usage
    FOR EACH ROW EXECUTE FUNCTION public.handle_updated_at();