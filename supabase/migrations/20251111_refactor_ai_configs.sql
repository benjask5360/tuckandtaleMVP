-- ============================================
-- Refactor ai_configs Table for Clarity
-- 1. Split story_generation into story_fun and story_growth
-- 2. Remove cost_per_generation (redundant with api_prices)
-- 3. Remove story_mode from settings (redundant with explicit purpose)
-- 4. Add model_type column
-- ============================================

-- Step 1: Drop old CHECK constraint FIRST (before updating rows)
ALTER TABLE public.ai_configs DROP CONSTRAINT IF EXISTS ai_configs_purpose_check;

-- Step 2: Add model_type column
ALTER TABLE public.ai_configs
ADD COLUMN IF NOT EXISTS model_type text CHECK (model_type IN ('text', 'audio', 'image'));

COMMENT ON COLUMN public.ai_configs.model_type IS 'Model type: text, audio, or image';

-- Step 3: Update existing story configs with new purpose values and model_type
-- Fun mode config
UPDATE public.ai_configs
SET
  purpose = 'story_fun',
  model_type = 'text',
  settings = settings - 'story_mode'  -- Remove story_mode from settings JSONB
WHERE name = 'gpt4_turbo_story_fun';

-- Growth mode config
UPDATE public.ai_configs
SET
  purpose = 'story_growth',
  model_type = 'text',
  settings = settings - 'story_mode'  -- Remove story_mode from settings JSONB
WHERE name = 'gpt4_story_growth';

-- Update avatar generation config with model_type
UPDATE public.ai_configs
SET model_type = 'image'
WHERE purpose = 'avatar_generation';

-- Step 4: Add new CHECK constraint with updated purpose values
ALTER TABLE public.ai_configs
ADD CONSTRAINT ai_configs_purpose_check
CHECK (purpose IN ('avatar_generation', 'story_fun', 'story_growth', 'story_illustration'));

COMMENT ON COLUMN public.ai_configs.purpose IS 'Operation type: avatar_generation, story_fun, story_growth, or story_illustration';

-- Step 5: Drop cost_per_generation column (redundant with api_prices)
ALTER TABLE public.ai_configs
DROP COLUMN IF EXISTS cost_per_generation;

-- Step 6: Create index on model_type
CREATE INDEX IF NOT EXISTS idx_ai_configs_model_type
ON public.ai_configs(model_type)
WHERE model_type IS NOT NULL;

-- ============================================
-- Summary
-- ============================================

DO $$
DECLARE
  story_fun_count integer;
  story_growth_count integer;
  avatar_count integer;
BEGIN
  SELECT COUNT(*) INTO story_fun_count FROM ai_configs WHERE purpose = 'story_fun';
  SELECT COUNT(*) INTO story_growth_count FROM ai_configs WHERE purpose = 'story_growth';
  SELECT COUNT(*) INTO avatar_count FROM ai_configs WHERE purpose = 'avatar_generation';

  RAISE NOTICE '============================================';
  RAISE NOTICE 'AI Configs Refactor Complete!';
  RAISE NOTICE '============================================';
  RAISE NOTICE 'Purpose values updated:';
  RAISE NOTICE '  ✓ story_fun configs: %', story_fun_count;
  RAISE NOTICE '  ✓ story_growth configs: %', story_growth_count;
  RAISE NOTICE '  ✓ avatar_generation configs: %', avatar_count;
  RAISE NOTICE '';
  RAISE NOTICE 'Columns added:';
  RAISE NOTICE '  ✓ model_type (text/audio/image)';
  RAISE NOTICE '';
  RAISE NOTICE 'Columns removed:';
  RAISE NOTICE '  ✓ cost_per_generation (now calculated from api_prices)';
  RAISE NOTICE '';
  RAISE NOTICE 'Settings cleaned:';
  RAISE NOTICE '  ✓ story_mode removed (now explicit in purpose)';
  RAISE NOTICE '============================================';
END $$;
