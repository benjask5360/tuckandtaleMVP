-- Seed AI Configurations for Story Generation
-- Creates OpenAI configs for both "Just for Fun" and "Help My Child Grow" modes

-- ============================================================================
-- AI CONFIGS FOR STORY GENERATION
-- ============================================================================

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
VALUES
  -- Fun Mode: GPT-4 Turbo (faster, more creative)
  (
    'gpt4_turbo_story_fun',
    'story_generation',
    'openai',
    'gpt-4-turbo-preview',
    'GPT-4 Turbo (Fun Stories)',
    jsonb_build_object(
      'max_tokens', 2000,
      'temperature', 0.8,        -- Higher creativity
      'top_p', 1.0,
      'frequency_penalty', 0.3,  -- Encourage varied language
      'presence_penalty', 0.3,   -- Encourage new topics
      'story_mode', 'fun'        -- Used to identify this config
    ),
    0.04,  -- Cost per generation (adjust as needed)
    true,  -- Default for story_generation
    true
  ),

  -- Growth Mode: GPT-4 (more advanced reasoning for educational content)
  (
    'gpt4_story_growth',
    'story_generation',
    'openai',
    'gpt-4',
    'GPT-4 (Growth Stories)',
    jsonb_build_object(
      'max_tokens', 2500,        -- Slightly longer for teaching moments
      'temperature', 0.7,        -- Balanced creativity and consistency
      'top_p', 0.95,
      'frequency_penalty', 0.2,
      'presence_penalty', 0.2,
      'story_mode', 'growth'     -- Used to identify this config
    ),
    0.06,  -- Slightly higher cost for GPT-4
    false,
    true
  )

ON CONFLICT (name) DO UPDATE
SET
  purpose = EXCLUDED.purpose,
  provider = EXCLUDED.provider,
  model_id = EXCLUDED.model_id,
  model_name = EXCLUDED.model_name,
  settings = EXCLUDED.settings,
  cost_per_generation = EXCLUDED.cost_per_generation,
  is_default = EXCLUDED.is_default,
  is_active = EXCLUDED.is_active,
  updated_at = now();

-- ============================================================================
-- DISPLAY SEEDED CONFIGS
-- ============================================================================

DO $$
DECLARE
  story_config_count integer;
BEGIN
  SELECT COUNT(*) INTO story_config_count
  FROM public.ai_configs
  WHERE purpose = 'story_generation' AND is_active = true;

  RAISE NOTICE 'AI configs for story generation seeded successfully:';
  RAISE NOTICE '  - Active story generation configs: %', story_config_count;
END $$;
