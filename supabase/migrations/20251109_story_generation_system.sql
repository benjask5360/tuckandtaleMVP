-- Story Generation System Migration
-- Creates tables for story generation, parameters, tracking, and usage limits

-- ============================================================================
-- 1. UNIFIED STORY PARAMETERS TABLE
-- ============================================================================
-- Single table for all configurable story options (genres, tones, lengths, growth topics)
-- Fully no-code editable - admins can add/modify parameters without code changes

CREATE TABLE IF NOT EXISTS public.story_parameters (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  type text NOT NULL CHECK (type IN ('genre', 'tone', 'length', 'growth_topic')),

  -- Core fields
  name text NOT NULL, -- Internal key (e.g., 'short', 'adventure')
  display_name text NOT NULL, -- UI label (e.g., 'Short Story', 'Adventure')
  description text, -- Helper text for users

  -- Type-specific metadata (JSONB for flexibility)
  -- Examples:
  --   length: { "paragraph_count_min": 3, "paragraph_count_max": 4, "word_count_min": 250, "word_count_max": 350 }
  --   growth_topic: { "category": "Emotions", "prompt_guidance": "Focus on identifying and expressing feelings" }
  metadata jsonb DEFAULT '{}',

  -- Admin controls
  is_active boolean DEFAULT true,
  display_order integer DEFAULT 0,

  created_at timestamptz DEFAULT now(),
  updated_at timestamptz DEFAULT now(),

  UNIQUE(type, name)
);

-- Indexes for efficient querying
CREATE INDEX IF NOT EXISTS idx_story_parameters_type ON public.story_parameters(type) WHERE is_active = true;
CREATE INDEX IF NOT EXISTS idx_story_parameters_type_order ON public.story_parameters(type, display_order);

COMMENT ON TABLE public.story_parameters IS 'Unified table for all story generation parameters - fully no-code editable';
COMMENT ON COLUMN public.story_parameters.metadata IS 'Type-specific data: length configs, growth topic guidance, etc.';

-- ============================================================================
-- 2. STORY GENERATION TRACKING
-- ============================================================================
-- NOTE: Story generation tracking has been consolidated into api_cost_logs table
-- See migration 20251109_enhance_api_cost_logs.sql for the enhanced tracking structure
-- This keeps all API costs and tracking in one unified table

-- ============================================================================
-- 3. STORY GENERATION USAGE TABLE
-- ============================================================================
-- Tracks daily and monthly generation counts for rate limiting

CREATE TABLE IF NOT EXISTS public.story_generation_usage (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id uuid REFERENCES auth.users(id) ON DELETE CASCADE NOT NULL,

  -- Time-based tracking
  month_year text NOT NULL, -- Format: 'YYYY-MM' (e.g., '2025-11')
  daily_count integer DEFAULT 0,
  monthly_count integer DEFAULT 0,

  -- Reset tracking
  last_generated_at timestamptz DEFAULT now(),
  last_daily_reset_at date DEFAULT CURRENT_DATE,

  -- Tier snapshot (for analytics)
  subscription_tier text NOT NULL,

  created_at timestamptz DEFAULT now(),
  updated_at timestamptz DEFAULT now(),

  UNIQUE(user_id, month_year)
);

-- Indexes
CREATE INDEX IF NOT EXISTS idx_story_usage_user ON public.story_generation_usage(user_id);
CREATE INDEX IF NOT EXISTS idx_story_usage_month ON public.story_generation_usage(month_year);
CREATE INDEX IF NOT EXISTS idx_story_usage_daily_reset ON public.story_generation_usage(last_daily_reset_at);

COMMENT ON TABLE public.story_generation_usage IS 'Tracks user story generation counts for rate limiting';

-- ============================================================================
-- 4. STORIES VIEW
-- ============================================================================
-- Convenient view for querying stories (filters content table)

CREATE OR REPLACE VIEW public.stories AS
  SELECT * FROM public.content
  WHERE content_type = 'story'
    AND deleted_at IS NULL;

COMMENT ON VIEW public.stories IS 'View of content table filtered to active stories only';

-- ============================================================================
-- 5. DATABASE FUNCTION: INCREMENT STORY USAGE
-- ============================================================================
-- Atomic increment of usage counters (prevents race conditions)

CREATE OR REPLACE FUNCTION public.increment_story_usage(
  p_user_id uuid,
  p_month_year text,
  p_subscription_tier text DEFAULT 'free'
)
RETURNS void
LANGUAGE plpgsql
SECURITY DEFINER
AS $$
DECLARE
  v_today date := CURRENT_DATE;
  v_existing_record record;
BEGIN
  -- Try to get existing record
  SELECT * INTO v_existing_record
  FROM public.story_generation_usage
  WHERE user_id = p_user_id AND month_year = p_month_year
  FOR UPDATE; -- Lock for update

  IF FOUND THEN
    -- Check if we need to reset daily count
    IF v_existing_record.last_daily_reset_at < v_today THEN
      -- New day - reset daily count
      UPDATE public.story_generation_usage
      SET
        daily_count = 1,
        monthly_count = monthly_count + 1,
        last_daily_reset_at = v_today,
        last_generated_at = now(),
        updated_at = now()
      WHERE user_id = p_user_id AND month_year = p_month_year;
    ELSE
      -- Same day - increment both
      UPDATE public.story_generation_usage
      SET
        daily_count = daily_count + 1,
        monthly_count = monthly_count + 1,
        last_generated_at = now(),
        updated_at = now()
      WHERE user_id = p_user_id AND month_year = p_month_year;
    END IF;
  ELSE
    -- Create new record
    INSERT INTO public.story_generation_usage (
      user_id,
      month_year,
      daily_count,
      monthly_count,
      last_daily_reset_at,
      subscription_tier
    ) VALUES (
      p_user_id,
      p_month_year,
      1,
      1,
      v_today,
      p_subscription_tier
    );
  END IF;
END;
$$;

COMMENT ON FUNCTION public.increment_story_usage IS 'Atomically increments story generation usage with automatic daily reset';

-- ============================================================================
-- 6. UPDATE SUBSCRIPTION TIERS TABLE
-- ============================================================================
-- Add story generation limits to existing subscription tiers

DO $$
BEGIN
  -- Add columns if they don't exist
  IF NOT EXISTS (
    SELECT 1 FROM information_schema.columns
    WHERE table_name = 'subscription_tiers' AND column_name = 'stories_per_day'
  ) THEN
    ALTER TABLE public.subscription_tiers
    ADD COLUMN stories_per_day integer,
    ADD COLUMN stories_per_month integer;
  END IF;
END $$;

COMMENT ON COLUMN public.subscription_tiers.stories_per_day IS 'Daily story generation limit (NULL = unlimited)';
COMMENT ON COLUMN public.subscription_tiers.stories_per_month IS 'Monthly story generation limit (NULL = unlimited)';

-- ============================================================================
-- 7. ROW LEVEL SECURITY (RLS) POLICIES
-- ============================================================================

-- Enable RLS on new tables
ALTER TABLE public.story_parameters ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.story_generation_usage ENABLE ROW LEVEL SECURITY;

-- story_parameters: Read-only for all authenticated users
-- Note: For MVP, parameters are viewable by all. Admin editing can be done via Supabase dashboard.
CREATE POLICY "Story parameters are viewable by authenticated users"
  ON public.story_parameters
  FOR SELECT
  TO authenticated
  USING (is_active = true);

-- story_generation_usage: Users can only see/modify their own usage
CREATE POLICY "Users can view their own story generation usage"
  ON public.story_generation_usage
  FOR SELECT
  TO authenticated
  USING (user_id = auth.uid());

CREATE POLICY "Users can insert their own story generation usage"
  ON public.story_generation_usage
  FOR INSERT
  TO authenticated
  WITH CHECK (user_id = auth.uid());

CREATE POLICY "Users can update their own story generation usage"
  ON public.story_generation_usage
  FOR UPDATE
  TO authenticated
  USING (user_id = auth.uid())
  WITH CHECK (user_id = auth.uid());

-- ============================================================================
-- MIGRATION COMPLETE
-- ============================================================================
