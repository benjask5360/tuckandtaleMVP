-- Add Missing Columns to api_cost_logs
-- Adds ai_config_name and character_profile_id that were referenced in code but not in the original migration

-- Add ai_config_name column
DO $$
BEGIN
  IF NOT EXISTS (
    SELECT 1 FROM information_schema.columns
    WHERE table_name = 'api_cost_logs' AND column_name = 'ai_config_name'
  ) THEN
    ALTER TABLE public.api_cost_logs
    ADD COLUMN ai_config_name text;

    COMMENT ON COLUMN public.api_cost_logs.ai_config_name IS 'Name of the AI config used for this generation (e.g., leonardo_lucid_realism_avatar)';
  END IF;
END $$;

-- Add character_profile_id column (if it doesn't exist)
DO $$
BEGIN
  IF NOT EXISTS (
    SELECT 1 FROM information_schema.columns
    WHERE table_name = 'api_cost_logs' AND column_name = 'character_profile_id'
  ) THEN
    ALTER TABLE public.api_cost_logs
    ADD COLUMN character_profile_id uuid REFERENCES public.character_profiles(id) ON DELETE SET NULL;

    COMMENT ON COLUMN public.api_cost_logs.character_profile_id IS 'Character profile this generation is for (null for story generations or preview avatars)';
  END IF;
END $$;

-- Add index for character_profile_id queries
DO $$
BEGIN
  IF NOT EXISTS (
    SELECT 1 FROM pg_indexes
    WHERE tablename = 'api_cost_logs' AND indexname = 'idx_api_cost_logs_character_profile_id'
  ) THEN
    CREATE INDEX idx_api_cost_logs_character_profile_id
    ON public.api_cost_logs(character_profile_id)
    WHERE character_profile_id IS NOT NULL;
  END IF;
END $$;

-- Add index for ai_config_name queries
DO $$
BEGIN
  IF NOT EXISTS (
    SELECT 1 FROM pg_indexes
    WHERE tablename = 'api_cost_logs' AND indexname = 'idx_api_cost_logs_ai_config_name'
  ) THEN
    CREATE INDEX idx_api_cost_logs_ai_config_name
    ON public.api_cost_logs(ai_config_name)
    WHERE ai_config_name IS NOT NULL;
  END IF;
END $$;

-- Log completion
DO $$
BEGIN
  RAISE NOTICE '============================================';
  RAISE NOTICE 'Missing columns added to api_cost_logs!';
  RAISE NOTICE '============================================';
  RAISE NOTICE 'Added columns:';
  RAISE NOTICE '  ✓ ai_config_name (text)';
  RAISE NOTICE '  ✓ character_profile_id (uuid, FK)';
  RAISE NOTICE '';
  RAISE NOTICE 'Added indexes:';
  RAISE NOTICE '  ✓ idx_api_cost_logs_character_profile_id';
  RAISE NOTICE '  ✓ idx_api_cost_logs_ai_config_name';
  RAISE NOTICE '============================================';
END $$;
