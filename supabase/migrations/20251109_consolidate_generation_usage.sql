-- Consolidate All Generation Usage Tracking
-- Replaces story_generation_usage with unified generation_usage table
-- Supports stories, avatars, worksheets, and future generation types

-- ============================================================================
-- 1. CREATE UNIFIED GENERATION_USAGE TABLE
-- ============================================================================

CREATE TABLE IF NOT EXISTS public.generation_usage (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id uuid REFERENCES auth.users(id) ON DELETE CASCADE NOT NULL,

  -- Generation type (extensible for future features)
  generation_type text NOT NULL CHECK (
    generation_type IN ('story', 'avatar', 'worksheet', 'activity', 'coloring_page')
  ),

  -- Time-based tracking
  month_year text NOT NULL, -- Format: 'YYYY-MM' (e.g., '2025-11')
  daily_count integer DEFAULT 0,
  monthly_count integer DEFAULT 0,

  -- Reset tracking
  last_generated_at timestamptz DEFAULT now(),
  last_daily_reset_at date DEFAULT CURRENT_DATE,

  -- Tier snapshot (for analytics)
  subscription_tier text NOT NULL,

  -- Optional type-specific metadata
  metadata jsonb DEFAULT '{}',

  created_at timestamptz DEFAULT now(),
  updated_at timestamptz DEFAULT now(),

  -- Unique constraint: one record per user per month per type
  UNIQUE(user_id, month_year, generation_type)
);

-- Indexes for performance
CREATE INDEX IF NOT EXISTS idx_generation_usage_user ON public.generation_usage(user_id);
CREATE INDEX IF NOT EXISTS idx_generation_usage_type ON public.generation_usage(generation_type);
CREATE INDEX IF NOT EXISTS idx_generation_usage_month ON public.generation_usage(month_year);
CREATE INDEX IF NOT EXISTS idx_generation_usage_user_type ON public.generation_usage(user_id, generation_type);
CREATE INDEX IF NOT EXISTS idx_generation_usage_daily_reset ON public.generation_usage(last_daily_reset_at);

COMMENT ON TABLE public.generation_usage IS 'Unified tracking for all generation types (stories, avatars, etc.) for rate limiting';
COMMENT ON COLUMN public.generation_usage.generation_type IS 'Type of generation: story, avatar, worksheet, activity, coloring_page';
COMMENT ON COLUMN public.generation_usage.metadata IS 'Optional type-specific data (e.g., style preferences, common parameters)';

-- ============================================================================
-- 2. MIGRATE EXISTING DATA
-- ============================================================================
-- Copy data from story_generation_usage to generation_usage

INSERT INTO public.generation_usage (
  user_id,
  generation_type,
  month_year,
  daily_count,
  monthly_count,
  last_generated_at,
  last_daily_reset_at,
  subscription_tier,
  created_at,
  updated_at
)
SELECT
  user_id,
  'story' AS generation_type,
  month_year,
  daily_count,
  monthly_count,
  last_generated_at,
  last_daily_reset_at,
  subscription_tier,
  created_at,
  updated_at
FROM public.story_generation_usage
WHERE EXISTS (SELECT 1 FROM public.story_generation_usage)
ON CONFLICT (user_id, month_year, generation_type) DO NOTHING;

-- Copy data from avatar_generation_usage to generation_usage
-- Note: avatar_generation_usage has per-character tracking, but we're consolidating to per-user
-- We'll aggregate by user and keep the max counts and most recent timestamp

INSERT INTO public.generation_usage (
  user_id,
  generation_type,
  month_year,
  daily_count,
  monthly_count,
  last_generated_at,
  last_daily_reset_at,
  subscription_tier,
  metadata,
  created_at,
  updated_at
)
SELECT
  user_id,
  'avatar' AS generation_type,
  month_year,
  0 AS daily_count, -- No daily tracking for avatars yet, so start at 0
  SUM(generation_count) AS monthly_count, -- Aggregate all avatar generations for the month
  MAX(last_generated_at) AS last_generated_at,
  CURRENT_DATE AS last_daily_reset_at,
  MAX(subscription_tier) AS subscription_tier, -- Use most recent tier
  jsonb_build_object(
    'migrated_from', 'avatar_generation_usage',
    'character_count', COUNT(DISTINCT character_profile_id)
  ) AS metadata,
  MIN(created_at) AS created_at,
  MAX(updated_at) AS updated_at
FROM public.avatar_generation_usage
WHERE EXISTS (SELECT 1 FROM public.avatar_generation_usage)
GROUP BY user_id, month_year
ON CONFLICT (user_id, month_year, generation_type) DO NOTHING;

-- ============================================================================
-- 3. DROP OLD TABLES
-- ============================================================================

DROP TABLE IF EXISTS public.story_generation_usage CASCADE;
DROP TABLE IF EXISTS public.avatar_generation_usage CASCADE;

-- ============================================================================
-- 4. CREATE UNIFIED INCREMENT FUNCTION
-- ============================================================================
-- Generic function that works for any generation type

CREATE OR REPLACE FUNCTION public.increment_generation_usage(
  p_user_id uuid,
  p_generation_type text,
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
  -- Validate generation_type
  IF p_generation_type NOT IN ('story', 'avatar', 'worksheet', 'activity', 'coloring_page') THEN
    RAISE EXCEPTION 'Invalid generation_type: %', p_generation_type;
  END IF;

  -- Try to get existing record
  SELECT * INTO v_existing_record
  FROM public.generation_usage
  WHERE user_id = p_user_id
    AND month_year = p_month_year
    AND generation_type = p_generation_type
  FOR UPDATE; -- Lock for update

  IF FOUND THEN
    -- Check if we need to reset daily count
    IF v_existing_record.last_daily_reset_at < v_today THEN
      -- New day - reset daily count
      UPDATE public.generation_usage
      SET
        daily_count = 1,
        monthly_count = monthly_count + 1,
        last_daily_reset_at = v_today,
        last_generated_at = now(),
        updated_at = now()
      WHERE user_id = p_user_id
        AND month_year = p_month_year
        AND generation_type = p_generation_type;
    ELSE
      -- Same day - increment both
      UPDATE public.generation_usage
      SET
        daily_count = daily_count + 1,
        monthly_count = monthly_count + 1,
        last_generated_at = now(),
        updated_at = now()
      WHERE user_id = p_user_id
        AND month_year = p_month_year
        AND generation_type = p_generation_type;
    END IF;
  ELSE
    -- Create new record
    INSERT INTO public.generation_usage (
      user_id,
      generation_type,
      month_year,
      daily_count,
      monthly_count,
      last_daily_reset_at,
      subscription_tier
    ) VALUES (
      p_user_id,
      p_generation_type,
      p_month_year,
      1,
      1,
      v_today,
      p_subscription_tier
    );
  END IF;
END;
$$;

COMMENT ON FUNCTION public.increment_generation_usage IS 'Atomically increments generation usage for any type with automatic daily reset';

-- ============================================================================
-- 5. DROP OLD FUNCTION
-- ============================================================================

DROP FUNCTION IF EXISTS public.increment_story_usage(uuid, text, text);

-- ============================================================================
-- 6. ROW LEVEL SECURITY (RLS)
-- ============================================================================

ALTER TABLE public.generation_usage ENABLE ROW LEVEL SECURITY;

-- Users can view their own usage
CREATE POLICY "Users can view their own generation usage"
  ON public.generation_usage
  FOR SELECT
  TO authenticated
  USING (user_id = auth.uid());

-- Users can insert their own usage
CREATE POLICY "Users can insert their own generation usage"
  ON public.generation_usage
  FOR INSERT
  TO authenticated
  WITH CHECK (user_id = auth.uid());

-- Users can update their own usage
CREATE POLICY "Users can update their own generation usage"
  ON public.generation_usage
  FOR UPDATE
  TO authenticated
  USING (user_id = auth.uid())
  WITH CHECK (user_id = auth.uid());

-- ============================================================================
-- 7. UPDATE SUBSCRIPTION TIERS TABLE
-- ============================================================================
-- Add avatar generation limits (stories already have limits)

DO $$
BEGIN
  -- Add avatar limit columns if they don't exist
  IF NOT EXISTS (
    SELECT 1 FROM information_schema.columns
    WHERE table_name = 'subscription_tiers' AND column_name = 'avatars_per_day'
  ) THEN
    ALTER TABLE public.subscription_tiers
    ADD COLUMN avatars_per_day integer,
    ADD COLUMN avatars_per_month integer;
  END IF;
END $$;

COMMENT ON COLUMN public.subscription_tiers.avatars_per_day IS 'Daily avatar generation limit (NULL = unlimited)';
COMMENT ON COLUMN public.subscription_tiers.avatars_per_month IS 'Monthly avatar generation limit (NULL = unlimited)';

-- ============================================================================
-- MIGRATION COMPLETE
-- ============================================================================

DO $$
DECLARE
  total_usage integer;
  story_usage integer;
  avatar_usage integer;
  users_tracked integer;
BEGIN
  SELECT COUNT(*) INTO total_usage FROM public.generation_usage;
  SELECT COUNT(*) INTO story_usage FROM public.generation_usage WHERE generation_type = 'story';
  SELECT COUNT(*) INTO avatar_usage FROM public.generation_usage WHERE generation_type = 'avatar';
  SELECT COUNT(DISTINCT user_id) INTO users_tracked FROM public.generation_usage;

  RAISE NOTICE '===========================================';
  RAISE NOTICE 'Generation usage consolidated successfully!';
  RAISE NOTICE '===========================================';
  RAISE NOTICE 'Total usage records: %', total_usage;
  RAISE NOTICE '  - Story generation: %', story_usage;
  RAISE NOTICE '  - Avatar generation: %', avatar_usage;
  RAISE NOTICE 'Users tracked: %', users_tracked;
  RAISE NOTICE '';
  RAISE NOTICE 'Supported generation types:';
  RAISE NOTICE '  - story (tracked)';
  RAISE NOTICE '  - avatar (ready)';
  RAISE NOTICE '  - worksheet (ready)';
  RAISE NOTICE '  - activity (ready)';
  RAISE NOTICE '  - coloring_page (ready)';
  RAISE NOTICE '';
  RAISE NOTICE 'Old tables removed:';
  RAISE NOTICE '  ✓ story_generation_usage';
  RAISE NOTICE '  ✓ avatar_generation_usage';
  RAISE NOTICE '';
  RAISE NOTICE 'New function: increment_generation_usage()';
  RAISE NOTICE 'Old function removed: increment_story_usage()';
  RAISE NOTICE '===========================================';

END $$;
