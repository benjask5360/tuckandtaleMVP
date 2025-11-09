-- Enhance api_cost_logs to Track All API Operations
-- Adds story-specific fields while maintaining backward compatibility with avatar generation

-- ============================================================================
-- ADD NEW FIELDS TO api_cost_logs
-- ============================================================================

DO $$
BEGIN
  -- Add content_id for linking to generated content (stories, etc.)
  IF NOT EXISTS (
    SELECT 1 FROM information_schema.columns
    WHERE table_name = 'api_cost_logs' AND column_name = 'content_id'
  ) THEN
    ALTER TABLE public.api_cost_logs
    ADD COLUMN content_id uuid REFERENCES public.content(id) ON DELETE SET NULL;
  END IF;

  -- Add processing_status for tracking operation state
  IF NOT EXISTS (
    SELECT 1 FROM information_schema.columns
    WHERE table_name = 'api_cost_logs' AND column_name = 'processing_status'
  ) THEN
    ALTER TABLE public.api_cost_logs
    ADD COLUMN processing_status text DEFAULT 'completed' CHECK (
      processing_status IN ('pending', 'processing', 'completed', 'failed')
    );
  END IF;

  -- Add generation_params for storing input parameters (for regeneration)
  IF NOT EXISTS (
    SELECT 1 FROM information_schema.columns
    WHERE table_name = 'api_cost_logs' AND column_name = 'generation_params'
  ) THEN
    ALTER TABLE public.api_cost_logs
    ADD COLUMN generation_params jsonb DEFAULT '{}';
  END IF;

  -- Add prompt_used for debugging and regeneration
  IF NOT EXISTS (
    SELECT 1 FROM information_schema.columns
    WHERE table_name = 'api_cost_logs' AND column_name = 'prompt_used'
  ) THEN
    ALTER TABLE public.api_cost_logs
    ADD COLUMN prompt_used text;
  END IF;

  -- Add error_message for failed operations
  IF NOT EXISTS (
    SELECT 1 FROM information_schema.columns
    WHERE table_name = 'api_cost_logs' AND column_name = 'error_message'
  ) THEN
    ALTER TABLE public.api_cost_logs
    ADD COLUMN error_message text;
  END IF;

  -- Add completed_at for tracking operation duration
  IF NOT EXISTS (
    SELECT 1 FROM information_schema.columns
    WHERE table_name = 'api_cost_logs' AND column_name = 'completed_at'
  ) THEN
    ALTER TABLE public.api_cost_logs
    ADD COLUMN completed_at timestamptz;
  END IF;

  -- Add started_at for tracking when operation began
  IF NOT EXISTS (
    SELECT 1 FROM information_schema.columns
    WHERE table_name = 'api_cost_logs' AND column_name = 'started_at'
  ) THEN
    ALTER TABLE public.api_cost_logs
    ADD COLUMN started_at timestamptz DEFAULT now();
  END IF;

END $$;

-- ============================================================================
-- ADD INDEXES FOR PERFORMANCE
-- ============================================================================

CREATE INDEX IF NOT EXISTS idx_api_cost_logs_content_id ON public.api_cost_logs(content_id);
CREATE INDEX IF NOT EXISTS idx_api_cost_logs_processing_status ON public.api_cost_logs(processing_status);
CREATE INDEX IF NOT EXISTS idx_api_cost_logs_operation ON public.api_cost_logs(operation);
CREATE INDEX IF NOT EXISTS idx_api_cost_logs_started_at ON public.api_cost_logs(started_at DESC);

-- ============================================================================
-- UPDATE EXISTING RECORDS
-- ============================================================================
-- Set default values for existing records

UPDATE public.api_cost_logs
SET
  processing_status = 'completed',
  started_at = created_at,
  completed_at = created_at
WHERE processing_status IS NULL OR started_at IS NULL;

-- ============================================================================
-- COMMENTS
-- ============================================================================

COMMENT ON COLUMN public.api_cost_logs.content_id IS 'Links to generated content (story, worksheet, etc.)';
COMMENT ON COLUMN public.api_cost_logs.processing_status IS 'Operation status: pending, processing, completed, failed';
COMMENT ON COLUMN public.api_cost_logs.generation_params IS 'Input parameters used for generation (for regeneration)';
COMMENT ON COLUMN public.api_cost_logs.prompt_used IS 'Full prompt sent to AI provider';
COMMENT ON COLUMN public.api_cost_logs.error_message IS 'Error details if operation failed';
COMMENT ON COLUMN public.api_cost_logs.started_at IS 'When the operation started';
COMMENT ON COLUMN public.api_cost_logs.completed_at IS 'When the operation completed or failed';

-- ============================================================================
-- REMOVE story_generation_tracking TABLE (if it exists)
-- ============================================================================
-- We're consolidating everything into api_cost_logs

DROP TABLE IF EXISTS public.story_generation_tracking CASCADE;

-- ============================================================================
-- UPDATE MIGRATION COMPLETE MESSAGE
-- ============================================================================

DO $$
DECLARE
  total_logs integer;
  story_logs integer;
  avatar_logs integer;
BEGIN
  SELECT COUNT(*) INTO total_logs FROM public.api_cost_logs;
  SELECT COUNT(*) INTO story_logs FROM public.api_cost_logs WHERE operation = 'story_generation';
  SELECT COUNT(*) INTO avatar_logs FROM public.api_cost_logs WHERE operation = 'avatar_generation';

  RAISE NOTICE '===========================================';
  RAISE NOTICE 'api_cost_logs enhanced successfully!';
  RAISE NOTICE '===========================================';
  RAISE NOTICE 'Total API logs: %', total_logs;
  RAISE NOTICE '  - Avatar generation: %', avatar_logs;
  RAISE NOTICE '  - Story generation: %', story_logs;
  RAISE NOTICE '';
  RAISE NOTICE 'New fields added:';
  RAISE NOTICE '  - content_id (links to stories/content)';
  RAISE NOTICE '  - processing_status (track operation state)';
  RAISE NOTICE '  - generation_params (for regeneration)';
  RAISE NOTICE '  - prompt_used (for debugging)';
  RAISE NOTICE '  - error_message (capture failures)';
  RAISE NOTICE '  - started_at, completed_at (timing)';
  RAISE NOTICE '';
  RAISE NOTICE 'story_generation_tracking table removed';
  RAISE NOTICE 'All tracking now in api_cost_logs!';
  RAISE NOTICE '===========================================';
END $$;
