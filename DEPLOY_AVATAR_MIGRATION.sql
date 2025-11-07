-- ================================================
-- Avatar Generation System - Deploy to Production
-- ================================================
-- Run this in Supabase SQL Editor to deploy the avatar generation system
-- This is the contents of migration 20251111_avatar_generation_complete.sql

-- 1. Create AI Configuration Table
-- ================================================
CREATE TABLE IF NOT EXISTS public.ai_configs (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    name TEXT NOT NULL UNIQUE,
    purpose TEXT NOT NULL CHECK (purpose IN ('avatar_generation', 'story_generation', 'story_illustration')),
    provider TEXT NOT NULL CHECK (provider IN ('leonardo', 'openai', 'stability', 'midjourney')),
    model_id TEXT NOT NULL,
    model_name TEXT NOT NULL,
    settings JSONB NOT NULL DEFAULT '{}',
    cost_per_generation DECIMAL(10, 4) DEFAULT 0,
    is_active BOOLEAN DEFAULT true,
    is_default BOOLEAN DEFAULT false,
    created_at TIMESTAMPTZ DEFAULT now(),
    updated_at TIMESTAMPTZ DEFAULT now()
);

-- 2. Create Avatar Generation Usage Table
-- ================================================
CREATE TABLE IF NOT EXISTS public.avatar_generation_usage (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    user_id UUID NOT NULL REFERENCES auth.users(id) ON DELETE CASCADE,
    character_profile_id UUID NOT NULL REFERENCES public.character_profiles(id) ON DELETE CASCADE,
    month_year TEXT NOT NULL,
    generation_count INTEGER DEFAULT 1,
    last_generated_at TIMESTAMPTZ DEFAULT now(),
    subscription_tier TEXT NOT NULL,
    ai_config_name TEXT NOT NULL,
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
-- Update existing tiers with regeneration limits
UPDATE public.subscription_tiers
SET avatar_regenerations_per_month = CASE
    WHEN tier_name = 'free' THEN 1
    WHEN tier_name = 'moonlight' THEN 5
    WHEN tier_name = 'starlight' THEN 10
    WHEN tier_name = 'supernova' THEN 999
    ELSE 1
END;

-- 5. Create Generation Costs Table
-- ================================================
CREATE TABLE IF NOT EXISTS public.generation_costs (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    user_id UUID NOT NULL REFERENCES auth.users(id) ON DELETE CASCADE,
    character_profile_id UUID REFERENCES public.character_profiles(id) ON DELETE SET NULL,
    ai_config_id UUID REFERENCES public.ai_configs(id),
    generation_type TEXT NOT NULL CHECK (generation_type IN ('avatar', 'story', 'illustration')),
    credits_used DECIMAL(10, 4) NOT NULL,
    cost_usd DECIMAL(10, 4),
    metadata JSONB DEFAULT '{}',
    created_at TIMESTAMPTZ DEFAULT now()
);

-- 6. Create Indexes
-- ================================================
CREATE INDEX IF NOT EXISTS idx_avatar_generation_usage_user_month
    ON public.avatar_generation_usage(user_id, month_year);

CREATE INDEX IF NOT EXISTS idx_avatar_generation_usage_character
    ON public.avatar_generation_usage(character_profile_id);

CREATE INDEX IF NOT EXISTS idx_avatar_cache_character_current
    ON public.avatar_cache(character_profile_id, is_current);

CREATE INDEX IF NOT EXISTS idx_avatar_cache_status
    ON public.avatar_cache(processing_status);

CREATE INDEX IF NOT EXISTS idx_generation_costs_user_date
    ON public.generation_costs(user_id, created_at DESC);

CREATE INDEX IF NOT EXISTS idx_ai_configs_purpose_active
    ON public.ai_configs(purpose, is_active);

-- 7. Insert Default AI Configuration
-- ================================================
INSERT INTO public.ai_configs (
    name,
    purpose,
    provider,
    model_id,
    model_name,
    settings,
    cost_per_generation,
    is_active,
    is_default
) VALUES (
    'leonardo_diffusion_xl_avatar',
    'avatar_generation',
    'leonardo',
    'e71a1c2f-4f80-4800-934f-2c68979d8cc8',
    'Leonardo Diffusion XL',
    '{
        "width": 512,
        "height": 768,
        "num_images": 1,
        "guidance_scale": 7,
        "num_inference_steps": 30,
        "presetStyle": "LEONARDO",
        "quality": "STANDARD",
        "photoReal": false,
        "alchemy": false
    }'::jsonb,
    1.0,
    true,
    true
) ON CONFLICT (name) DO NOTHING;

-- 8. Create Helper Functions
-- ================================================

-- Function to get remaining regenerations for a character
CREATE OR REPLACE FUNCTION public.get_remaining_regenerations(
    p_user_id UUID,
    p_character_profile_id UUID
)
RETURNS TABLE (
    used INTEGER,
    limit_count INTEGER,
    remaining INTEGER,
    resets_in_days INTEGER
) AS $$
DECLARE
    v_current_month TEXT;
    v_tier_limit INTEGER;
    v_used_count INTEGER;
BEGIN
    -- Get current month in YYYY-MM format
    v_current_month := TO_CHAR(CURRENT_DATE, 'YYYY-MM');

    -- Get user's tier limit
    SELECT st.avatar_regenerations_per_month
    INTO v_tier_limit
    FROM public.user_profiles up
    JOIN public.subscription_tiers st ON up.subscription_tier_id = st.id
    WHERE up.id = p_user_id;

    -- Default to free tier if not found
    IF v_tier_limit IS NULL THEN
        v_tier_limit := 1;
    END IF;

    -- Get usage for current month
    SELECT COALESCE(generation_count, 0)
    INTO v_used_count
    FROM public.avatar_generation_usage
    WHERE user_id = p_user_id
      AND character_profile_id = p_character_profile_id
      AND month_year = v_current_month;

    -- Default to 0 if no usage found
    v_used_count := COALESCE(v_used_count, 0);

    -- Calculate days until reset (first day of next month)
    RETURN QUERY SELECT
        v_used_count::INTEGER as used,
        v_tier_limit::INTEGER as limit_count,
        GREATEST(0, v_tier_limit - v_used_count)::INTEGER as remaining,
        (DATE_TRUNC('month', CURRENT_DATE) + INTERVAL '1 month' - CURRENT_DATE)::INTEGER as resets_in_days;
END;
$$ LANGUAGE plpgsql SECURITY DEFINER;

-- Function to increment avatar generation count
CREATE OR REPLACE FUNCTION public.increment_avatar_generation(
    p_user_id UUID,
    p_character_profile_id UUID,
    p_ai_config_name TEXT
)
RETURNS BOOLEAN AS $$
DECLARE
    v_current_month TEXT;
    v_tier_name TEXT;
BEGIN
    -- Get current month
    v_current_month := TO_CHAR(CURRENT_DATE, 'YYYY-MM');

    -- Get user's tier name
    SELECT st.name
    INTO v_tier_name
    FROM public.user_profiles up
    JOIN public.subscription_tiers st ON up.subscription_tier_id = st.id
    WHERE up.id = p_user_id;

    -- Default to free tier
    v_tier_name := COALESCE(v_tier_name, 'free');

    -- Insert or update usage record
    INSERT INTO public.avatar_generation_usage (
        user_id,
        character_profile_id,
        month_year,
        generation_count,
        last_generated_at,
        subscription_tier,
        ai_config_name
    ) VALUES (
        p_user_id,
        p_character_profile_id,
        v_current_month,
        1,
        NOW(),
        v_tier_name,
        p_ai_config_name
    )
    ON CONFLICT (user_id, character_profile_id, month_year)
    DO UPDATE SET
        generation_count = avatar_generation_usage.generation_count + 1,
        last_generated_at = NOW(),
        ai_config_name = p_ai_config_name,
        updated_at = NOW();

    RETURN TRUE;
END;
$$ LANGUAGE plpgsql SECURITY DEFINER;

-- 9. Enable RLS
-- ================================================
ALTER TABLE public.ai_configs ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.avatar_generation_usage ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.generation_costs ENABLE ROW LEVEL SECURITY;

-- 10. Create RLS Policies
-- ================================================

-- AI Configs - Read only for authenticated users
CREATE POLICY "Users can view active AI configs"
    ON public.ai_configs FOR SELECT
    TO authenticated
    USING (is_active = true);

-- Avatar Generation Usage - Users can view their own usage
CREATE POLICY "Users can view their own avatar generation usage"
    ON public.avatar_generation_usage FOR SELECT
    TO authenticated
    USING (user_id = auth.uid());

CREATE POLICY "System can insert avatar generation usage"
    ON public.avatar_generation_usage FOR INSERT
    TO authenticated
    WITH CHECK (user_id = auth.uid());

CREATE POLICY "System can update avatar generation usage"
    ON public.avatar_generation_usage FOR UPDATE
    TO authenticated
    USING (user_id = auth.uid());

-- Generation Costs - Users can view their own costs
CREATE POLICY "Users can view their own generation costs"
    ON public.generation_costs FOR SELECT
    TO authenticated
    USING (user_id = auth.uid());

CREATE POLICY "System can insert generation costs"
    ON public.generation_costs FOR INSERT
    TO authenticated
    WITH CHECK (user_id = auth.uid());

-- Grant execute permissions on functions
GRANT EXECUTE ON FUNCTION public.get_remaining_regenerations(UUID, UUID) TO authenticated;
GRANT EXECUTE ON FUNCTION public.increment_avatar_generation(UUID, UUID, TEXT) TO authenticated;

-- 11. Add to migration history
-- ================================================
INSERT INTO supabase_migrations.schema_migrations (version, statements, name)
VALUES (
    '20251111',
    ARRAY['Avatar generation system with Leonardo AI integration'],
    '20251111_avatar_generation_complete'
) ON CONFLICT (version) DO NOTHING;

-- Done!
SELECT 'Avatar generation system deployed successfully!' as status;
