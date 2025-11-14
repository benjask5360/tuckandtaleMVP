


SET statement_timeout = 0;
SET lock_timeout = 0;
SET idle_in_transaction_session_timeout = 0;
SET client_encoding = 'UTF8';
SET standard_conforming_strings = on;
SELECT pg_catalog.set_config('search_path', '', false);
SET check_function_bodies = false;
SET xmloption = content;
SET client_min_messages = warning;
SET row_security = off;


CREATE SCHEMA IF NOT EXISTS "public";


ALTER SCHEMA "public" OWNER TO "pg_database_owner";


COMMENT ON SCHEMA "public" IS 'standard public schema';



CREATE OR REPLACE FUNCTION "public"."delete_user_completely"("user_id" "uuid") RETURNS "void"
    LANGUAGE "plpgsql" SECURITY DEFINER
    AS $_$
BEGIN
    -- Delete in correct order to avoid trigger conflicts
    DELETE FROM content_characters WHERE character_profile_id IN (SELECT id FROM character_profiles WHERE user_id = $1);
    DELETE FROM avatar_cache WHERE created_by_user_id = $1;
    DELETE FROM character_profiles WHERE user_id = $1;
    DELETE FROM content WHERE user_id = $1;
    DELETE FROM generation_usage WHERE user_id = $1;
    DELETE FROM api_cost_logs WHERE user_id = $1;
    DELETE FROM user_profiles WHERE id = $1;
    DELETE FROM auth.users WHERE id = $1;
END;
$_$;


ALTER FUNCTION "public"."delete_user_completely"("user_id" "uuid") OWNER TO "postgres";


CREATE OR REPLACE FUNCTION "public"."delete_user_safely"("p_user_id" "uuid") RETURNS boolean
    LANGUAGE "plpgsql" SECURITY DEFINER
    AS $$
DECLARE
  v_character record;
BEGIN
  -- Step 1: Break circular FK by clearing avatar_cache_id references
  UPDATE public.character_profiles
  SET avatar_cache_id = NULL
  WHERE user_id = p_user_id
    AND avatar_cache_id IS NOT NULL;

  -- Step 2: Now delete the user - cascades will handle the rest
  DELETE FROM auth.users WHERE id = p_user_id;

  -- Step 3: Clean up any orphaned avatar_cache entries (shouldn't exist, but just in case)
  DELETE FROM public.avatar_cache
  WHERE character_profile_id IS NULL
    AND created_at < (NOW() - INTERVAL '1 hour');

  RETURN TRUE;
EXCEPTION
  WHEN OTHERS THEN
    RAISE WARNING 'Error deleting user %: %', p_user_id, SQLERRM;
    RETURN FALSE;
END;
$$;


ALTER FUNCTION "public"."delete_user_safely"("p_user_id" "uuid") OWNER TO "postgres";


COMMENT ON FUNCTION "public"."delete_user_safely"("p_user_id" "uuid") IS 'Safely deletes a user by first breaking circular FK dependencies, then cascading delete';



CREATE OR REPLACE FUNCTION "public"."force_delete_user"("p_user_id" "uuid") RETURNS boolean
    LANGUAGE "plpgsql" SECURITY DEFINER
    SET "search_path" TO 'public', 'auth', 'storage'
    AS $$
DECLARE
  v_count integer;
BEGIN
  -- Log what we're about to delete
  RAISE NOTICE '===========================================';
  RAISE NOTICE 'Force deleting user: %', p_user_id;
  RAISE NOTICE '===========================================';

  -- 1. Clear any circular references in character_profiles
  UPDATE public.character_profiles
  SET avatar_cache_id = NULL
  WHERE user_id = p_user_id;
  GET DIAGNOSTICS v_count = ROW_COUNT;
  IF v_count > 0 THEN
    RAISE NOTICE 'Cleared % avatar_cache references', v_count;
  END IF;

  -- 2. Delete from avatar_cache (both character and created_by references)
  DELETE FROM public.avatar_cache
  WHERE character_profile_id IN (
    SELECT id FROM public.character_profiles WHERE user_id = p_user_id
  ) OR created_by_user_id = p_user_id;
  GET DIAGNOSTICS v_count = ROW_COUNT;
  IF v_count > 0 THEN
    RAISE NOTICE 'Deleted % avatar_cache records', v_count;
  END IF;

  -- 3. Delete content_characters junction records
  DELETE FROM public.content_characters
  WHERE content_id IN (
    SELECT id FROM public.content WHERE user_id = p_user_id
  ) OR character_profile_id IN (
    SELECT id FROM public.character_profiles WHERE user_id = p_user_id
  );
  GET DIAGNOSTICS v_count = ROW_COUNT;
  IF v_count > 0 THEN
    RAISE NOTICE 'Deleted % content_characters records', v_count;
  END IF;

  -- 4. Try to delete storage objects if they exist (may not have permission)
  BEGIN
    DELETE FROM storage.objects WHERE owner = p_user_id;
    GET DIAGNOSTICS v_count = ROW_COUNT;
    IF v_count > 0 THEN
      RAISE NOTICE 'Deleted % storage objects', v_count;
    END IF;
  EXCEPTION
    WHEN insufficient_privilege THEN
      RAISE NOTICE 'Skipped storage.objects (no permission)';
    WHEN undefined_table THEN
      NULL; -- Table doesn't exist, that's fine
    WHEN OTHERS THEN
      RAISE NOTICE 'Could not delete from storage.objects: %', SQLERRM;
  END;

  -- 5. Now delete from auth.users (everything else will CASCADE)
  DELETE FROM auth.users WHERE id = p_user_id;
  GET DIAGNOSTICS v_count = ROW_COUNT;

  IF v_count > 0 THEN
    RAISE NOTICE '===========================================';
    RAISE NOTICE '✅ Successfully deleted user and all related data';
    RAISE NOTICE '===========================================';
    RETURN TRUE;
  ELSE
    RAISE NOTICE '⚠️  User not found: %', p_user_id;
    RETURN FALSE;
  END IF;

EXCEPTION
  WHEN OTHERS THEN
    RAISE WARNING 'Error deleting user %: %', p_user_id, SQLERRM;
    RAISE WARNING 'Error detail: %', SQLSTATE;
    RETURN FALSE;
END;
$$;


ALTER FUNCTION "public"."force_delete_user"("p_user_id" "uuid") OWNER TO "postgres";


COMMENT ON FUNCTION "public"."force_delete_user"("p_user_id" "uuid") IS 'Forcefully deletes a user and all related data, handling circular dependencies';



CREATE OR REPLACE FUNCTION "public"."get_gender_descriptor_for_age"("p_gender" "text", "p_age" integer) RETURNS "text"
    LANGUAGE "plpgsql" STABLE
    AS $$
DECLARE
  v_rich_description TEXT;
BEGIN
  SELECT rich_description INTO v_rich_description
  FROM public.descriptors_gender
  WHERE simple_term = p_gender
    AND p_age >= min_age
    AND p_age <= max_age
    AND is_active = true
  LIMIT 1;

  RETURN COALESCE(v_rich_description, p_gender);
END;
$$;


ALTER FUNCTION "public"."get_gender_descriptor_for_age"("p_gender" "text", "p_age" integer) OWNER TO "postgres";


CREATE OR REPLACE FUNCTION "public"."get_remaining_regenerations"("p_user_id" "uuid", "p_character_profile_id" "uuid") RETURNS TABLE("used" integer, "limit_count" integer, "remaining" integer, "resets_in_days" integer)
    LANGUAGE "plpgsql" SECURITY DEFINER
    AS $$
DECLARE
  v_month_year text;
  v_monthly_limit integer;
  v_used integer;
  v_days_until_reset integer;
BEGIN
  -- Get current month-year
  v_month_year := TO_CHAR(CURRENT_DATE, 'YYYY-MM');

  -- Get user's monthly limit from subscription tier
  SELECT st.avatars_per_month INTO v_monthly_limit
  FROM public.user_profiles up
  JOIN public.subscription_tiers st ON up.subscription_tier_id = st.id
  WHERE up.id = p_user_id;

  -- Default to 1 if not found or NULL (unlimited becomes NULL)
  IF v_monthly_limit IS NULL THEN
    -- Check if this is truly unlimited or just missing data
    IF EXISTS (
      SELECT 1 FROM public.user_profiles up
      JOIN public.subscription_tiers st ON up.subscription_tier_id = st.id
      WHERE up.id = p_user_id AND st.tier_name = 'supernova'
    ) THEN
      v_monthly_limit := 999; -- Effectively unlimited
    ELSE
      v_monthly_limit := 1; -- Default free tier
    END IF;
  END IF;

  -- Get current usage from unified table
  SELECT COALESCE(monthly_count, 0) INTO v_used
  FROM public.generation_usage
  WHERE user_id = p_user_id
    AND generation_type = 'avatar'
    AND month_year = v_month_year;

  IF v_used IS NULL THEN
    v_used := 0;
  END IF;

  -- Calculate days until next month
  v_days_until_reset := DATE_PART('day',
    DATE_TRUNC('month', CURRENT_DATE) + INTERVAL '1 month' - CURRENT_DATE
  )::integer;

  -- Return results
  RETURN QUERY SELECT
    v_used,
    v_monthly_limit,
    GREATEST(0, v_monthly_limit - v_used) as remaining,
    v_days_until_reset;
END;
$$;


ALTER FUNCTION "public"."get_remaining_regenerations"("p_user_id" "uuid", "p_character_profile_id" "uuid") OWNER TO "postgres";


COMMENT ON FUNCTION "public"."get_remaining_regenerations"("p_user_id" "uuid", "p_character_profile_id" "uuid") IS 'Gets remaining avatar regenerations from unified generation_usage table';



CREATE OR REPLACE FUNCTION "public"."handle_new_user"() RETURNS "trigger"
    LANGUAGE "plpgsql" SECURITY DEFINER
    AS $$
DECLARE
  free_tier_id uuid;
BEGIN
  -- Get the free tier ID
  SELECT id INTO free_tier_id
  FROM public.subscription_tiers
  WHERE tier_name = 'free'
  LIMIT 1;

  -- Create user profile with free tier assigned
  INSERT INTO public.user_profiles (
    id,
    email,
    full_name,
    subscription_tier_id,
    subscription_status,
    created_at,
    updated_at
  ) VALUES (
    new.id,
    new.email,
    COALESCE(new.raw_user_meta_data->>'full_name', ''),
    free_tier_id,
    'free',
    now(),
    now()
  );

  RETURN new;
END;
$$;


ALTER FUNCTION "public"."handle_new_user"() OWNER TO "postgres";


CREATE OR REPLACE FUNCTION "public"."handle_updated_at"() RETURNS "trigger"
    LANGUAGE "plpgsql"
    AS $$
BEGIN
  NEW.updated_at = now();
  RETURN NEW;
END;
$$;


ALTER FUNCTION "public"."handle_updated_at"() OWNER TO "postgres";


CREATE OR REPLACE FUNCTION "public"."increment_avatar_generation"("p_user_id" "uuid", "p_character_profile_id" "uuid", "p_ai_config_name" "text") RETURNS boolean
    LANGUAGE "plpgsql" SECURITY DEFINER
    AS $$
DECLARE
  v_month_year text;
  v_subscription_tier text;
BEGIN
  -- Get current month-year
  v_month_year := TO_CHAR(CURRENT_DATE, 'YYYY-MM');

  -- Get user's subscription tier
  SELECT st.tier_name INTO v_subscription_tier
  FROM public.user_profiles up
  JOIN public.subscription_tiers st ON up.subscription_tier_id = st.id
  WHERE up.id = p_user_id;

  IF v_subscription_tier IS NULL THEN
    v_subscription_tier := 'free';
  END IF;

  -- Call unified increment function
  PERFORM public.increment_generation_usage(
    p_user_id,
    'avatar',
    v_month_year,
    v_subscription_tier
  );

  RETURN true;
EXCEPTION
  WHEN OTHERS THEN
    RAISE WARNING 'Error incrementing avatar usage: %', SQLERRM;
    RETURN false;
END;
$$;


ALTER FUNCTION "public"."increment_avatar_generation"("p_user_id" "uuid", "p_character_profile_id" "uuid", "p_ai_config_name" "text") OWNER TO "postgres";


COMMENT ON FUNCTION "public"."increment_avatar_generation"("p_user_id" "uuid", "p_character_profile_id" "uuid", "p_ai_config_name" "text") IS 'Increments avatar generation count using unified generation_usage table';



CREATE OR REPLACE FUNCTION "public"."increment_generation_usage"("p_user_id" "uuid", "p_generation_type" "text", "p_month_year" "text", "p_subscription_tier" "text" DEFAULT 'free'::"text") RETURNS "void"
    LANGUAGE "plpgsql" SECURITY DEFINER
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


ALTER FUNCTION "public"."increment_generation_usage"("p_user_id" "uuid", "p_generation_type" "text", "p_month_year" "text", "p_subscription_tier" "text") OWNER TO "postgres";


COMMENT ON FUNCTION "public"."increment_generation_usage"("p_user_id" "uuid", "p_generation_type" "text", "p_month_year" "text", "p_subscription_tier" "text") IS 'Atomically increments generation usage for any type with automatic daily reset';



CREATE OR REPLACE FUNCTION "public"."update_api_prices_updated_at"() RETURNS "trigger"
    LANGUAGE "plpgsql"
    AS $$
BEGIN
  NEW.updated_at = now();
  RETURN NEW;
END;
$$;


ALTER FUNCTION "public"."update_api_prices_updated_at"() OWNER TO "postgres";


CREATE OR REPLACE FUNCTION "public"."update_updated_at_column"() RETURNS "trigger"
    LANGUAGE "plpgsql"
    AS $$
BEGIN
    NEW.updated_at = now();
    RETURN NEW;
END;
$$;


ALTER FUNCTION "public"."update_updated_at_column"() OWNER TO "postgres";

SET default_tablespace = '';

SET default_table_access_method = "heap";


CREATE TABLE IF NOT EXISTS "public"."ai_configs" (
    "id" "uuid" DEFAULT "gen_random_uuid"() NOT NULL,
    "name" "text" NOT NULL,
    "purpose" "text" NOT NULL,
    "provider" "text" NOT NULL,
    "model_id" "text" NOT NULL,
    "model_name" "text" NOT NULL,
    "settings" "jsonb" DEFAULT '{}'::"jsonb" NOT NULL,
    "is_active" boolean DEFAULT true,
    "is_default" boolean DEFAULT false,
    "created_at" timestamp with time zone DEFAULT "now"(),
    "updated_at" timestamp with time zone DEFAULT "now"(),
    "model_type" "text",
    CONSTRAINT "ai_configs_model_type_check" CHECK (("model_type" = ANY (ARRAY['text'::"text", 'audio'::"text", 'image'::"text"]))),
    CONSTRAINT "ai_configs_provider_check" CHECK (("provider" = ANY (ARRAY['leonardo'::"text", 'openai'::"text", 'stability'::"text", 'midjourney'::"text", 'google'::"text"]))),
    CONSTRAINT "ai_configs_purpose_check" CHECK (("purpose" = ANY (ARRAY['avatar_generation'::"text", 'story_fun'::"text", 'story_growth'::"text", 'story_illustration'::"text", 'story_vignette_panorama'::"text", 'story_vignette_narratives'::"text", 'story_vignette_scenes'::"text"])))
);


ALTER TABLE "public"."ai_configs" OWNER TO "postgres";


COMMENT ON COLUMN "public"."ai_configs"."purpose" IS 'Operation type: avatar_generation, story_fun, story_growth, story_illustration, or story_vignette_panorama';



COMMENT ON COLUMN "public"."ai_configs"."model_type" IS 'Model type: text, audio, or image';



CREATE TABLE IF NOT EXISTS "public"."api_cost_logs" (
    "id" "uuid" DEFAULT "gen_random_uuid"() NOT NULL,
    "user_id" "uuid",
    "provider" "text" NOT NULL,
    "operation" "text" NOT NULL,
    "model_used" "text",
    "prompt_tokens" integer,
    "completion_tokens" integer,
    "total_tokens" integer,
    "estimated_cost" numeric(10,6),
    "metadata" "jsonb" DEFAULT '{}'::"jsonb",
    "created_at" timestamp with time zone DEFAULT "now"(),
    "content_id" "uuid",
    "processing_status" "text" DEFAULT 'completed'::"text",
    "generation_params" "jsonb" DEFAULT '{}'::"jsonb",
    "prompt_used" "text",
    "error_message" "text",
    "completed_at" timestamp with time zone,
    "started_at" timestamp with time zone DEFAULT "now"(),
    "ai_config_name" "text",
    "character_profile_id" "uuid",
    "actual_cost" numeric(10,4),
    "actual_cost_usd" numeric(10,6),
    CONSTRAINT "api_cost_logs_processing_status_check" CHECK (("processing_status" = ANY (ARRAY['pending'::"text", 'processing'::"text", 'completed'::"text", 'failed'::"text"])))
);


ALTER TABLE "public"."api_cost_logs" OWNER TO "postgres";


COMMENT ON COLUMN "public"."api_cost_logs"."prompt_tokens" IS 'Input tokens used (OpenAI) - priced at $2.50/1M';



COMMENT ON COLUMN "public"."api_cost_logs"."completion_tokens" IS 'Output tokens used (OpenAI) - priced at $10.00/1M';



COMMENT ON COLUMN "public"."api_cost_logs"."total_tokens" IS 'Total tokens/credits used (sum or provider-specific)';



COMMENT ON COLUMN "public"."api_cost_logs"."estimated_cost" IS 'Estimated cost from our ai_configs.cost_per_generation. Used as fallback when actual_cost is not available.';



COMMENT ON COLUMN "public"."api_cost_logs"."content_id" IS 'Links to generated content (story, worksheet, etc.)';



COMMENT ON COLUMN "public"."api_cost_logs"."processing_status" IS 'Operation status: pending, processing, completed, failed';



COMMENT ON COLUMN "public"."api_cost_logs"."generation_params" IS 'Input parameters used for generation (for regeneration)';



COMMENT ON COLUMN "public"."api_cost_logs"."prompt_used" IS 'Full prompt sent to AI provider';



COMMENT ON COLUMN "public"."api_cost_logs"."error_message" IS 'Error details if operation failed';



COMMENT ON COLUMN "public"."api_cost_logs"."completed_at" IS 'When the operation completed or failed';



COMMENT ON COLUMN "public"."api_cost_logs"."started_at" IS 'When the operation started';



COMMENT ON COLUMN "public"."api_cost_logs"."ai_config_name" IS 'Name of the AI config used for this generation (e.g., leonardo_lucid_realism_avatar)';



COMMENT ON COLUMN "public"."api_cost_logs"."character_profile_id" IS 'Character profile this generation is for (null for story generations or preview avatars)';



COMMENT ON COLUMN "public"."api_cost_logs"."actual_cost" IS 'Actual cost reported by the API provider (e.g., Leonardo apiCreditCost). NULL if provider does not report cost.';



COMMENT ON COLUMN "public"."api_cost_logs"."actual_cost_usd" IS 'Actual cost in USD calculated from actual_cost * api_prices.cost_per_unit';



CREATE TABLE IF NOT EXISTS "public"."api_prices" (
    "id" "uuid" DEFAULT "gen_random_uuid"() NOT NULL,
    "provider" "text" NOT NULL,
    "cost_per_unit" numeric(10,6),
    "unit_type" "text" NOT NULL,
    "notes" "text",
    "created_at" timestamp with time zone DEFAULT "now"(),
    "updated_at" timestamp with time zone DEFAULT "now"(),
    "input_cost_per_unit" numeric(10,10),
    "output_cost_per_unit" numeric(10,10),
    "model_id" "text",
    "model_type" "text",
    CONSTRAINT "api_prices_model_type_check" CHECK (("model_type" = ANY (ARRAY['text'::"text", 'audio'::"text", 'image'::"text"]))),
    CONSTRAINT "api_prices_provider_check" CHECK (("provider" = ANY (ARRAY['leonardo'::"text", 'openai'::"text", 'anthropic'::"text", 'google'::"text"]))),
    CONSTRAINT "api_prices_unit_type_check" CHECK (("unit_type" = ANY (ARRAY['credit'::"text", 'token'::"text"])))
);


ALTER TABLE "public"."api_prices" OWNER TO "postgres";


COMMENT ON TABLE "public"."api_prices" IS 'Stores real USD cost per unit for each API provider (e.g., Leonardo $0.00196/credit)';



COMMENT ON COLUMN "public"."api_prices"."cost_per_unit" IS 'Single cost per unit (for Leonardo credits)';



COMMENT ON COLUMN "public"."api_prices"."unit_type" IS 'Type of unit being charged: credit (Leonardo) or token (OpenAI/Anthropic)';



COMMENT ON COLUMN "public"."api_prices"."input_cost_per_unit" IS 'Cost per input token (for OpenAI/Anthropic models)';



COMMENT ON COLUMN "public"."api_prices"."output_cost_per_unit" IS 'Cost per output token (for OpenAI/Anthropic models)';



COMMENT ON COLUMN "public"."api_prices"."model_id" IS 'Model identifier (e.g., gpt-4o, gpt-4o-mini). NULL for provider-level pricing (Leonardo)';



COMMENT ON COLUMN "public"."api_prices"."model_type" IS 'Model type: text, audio, or image';



CREATE TABLE IF NOT EXISTS "public"."avatar_cache" (
    "id" "uuid" DEFAULT "gen_random_uuid"() NOT NULL,
    "character_profile_id" "uuid",
    "leonardo_generation_id" "text" NOT NULL,
    "leonardo_model_id" "text",
    "storage_path" "text",
    "image_url" "text",
    "image_hash" "text",
    "style" "text",
    "is_current" boolean DEFAULT false,
    "prompt_used" "text",
    "generation_metadata" "jsonb" DEFAULT '{}'::"jsonb",
    "created_at" timestamp with time zone DEFAULT "now"(),
    "ai_config_id" "uuid",
    "ai_config_name" "text",
    "generation_attempts" integer DEFAULT 1,
    "processing_status" "text" DEFAULT 'pending'::"text",
    "error_message" "text",
    "leonardo_api_credits_used" integer,
    "created_by_user_id" "uuid",
    CONSTRAINT "avatar_cache_processing_status_check" CHECK (("processing_status" = ANY (ARRAY['pending'::"text", 'processing'::"text", 'completed'::"text", 'failed'::"text"])))
);


ALTER TABLE "public"."avatar_cache" OWNER TO "postgres";


COMMENT ON TABLE "public"."avatar_cache" IS 'Stores generated avatars. Preview avatars have NULL character_profile_id until linked. RLS policies allow first-time avatar saves.';



COMMENT ON COLUMN "public"."avatar_cache"."character_profile_id" IS 'Character ID. NULL for preview avatars that haven''t been linked to a character yet.';



CREATE TABLE IF NOT EXISTS "public"."character_profiles" (
    "id" "uuid" DEFAULT "gen_random_uuid"() NOT NULL,
    "user_id" "uuid" NOT NULL,
    "character_type" "text" NOT NULL,
    "name" "text" NOT NULL,
    "attributes" "jsonb" DEFAULT '{}'::"jsonb",
    "appearance_description" "text",
    "avatar_cache_id" "uuid",
    "is_primary" boolean DEFAULT false,
    "created_at" timestamp with time zone DEFAULT "now"(),
    "updated_at" timestamp with time zone DEFAULT "now"(),
    "deleted_at" timestamp with time zone,
    CONSTRAINT "character_profiles_character_type_check" CHECK (("character_type" = ANY (ARRAY['child'::"text", 'storybook_character'::"text", 'pet'::"text", 'magical_creature'::"text"])))
);


ALTER TABLE "public"."character_profiles" OWNER TO "postgres";


COMMENT ON COLUMN "public"."character_profiles"."avatar_cache_id" IS 'Foreign key to avatar_cache table - references the current active avatar for this character';



CREATE TABLE IF NOT EXISTS "public"."content" (
    "id" "uuid" DEFAULT "gen_random_uuid"() NOT NULL,
    "user_id" "uuid",
    "content_type" "text" NOT NULL,
    "title" "text" NOT NULL,
    "body" "text" NOT NULL,
    "theme" "text",
    "age_appropriate_for" integer[],
    "duration_minutes" integer,
    "parent_content_id" "uuid",
    "generation_prompt" "text",
    "generation_metadata" "jsonb" DEFAULT '{}'::"jsonb",
    "is_favorite" boolean DEFAULT false,
    "read_count" integer DEFAULT 0,
    "last_accessed_at" timestamp with time zone,
    "created_at" timestamp with time zone DEFAULT "now"(),
    "updated_at" timestamp with time zone DEFAULT "now"(),
    "deleted_at" timestamp with time zone,
    "vignette_helper_prompt" "text",
    "vignette_prompt" "text",
    "source_story_id" "uuid",
    "panel_count" integer DEFAULT 9,
    "panoramic_image_url" "text",
    "vignette_story_prompt" "text",
    "story_illustration_prompt" "text",
    "include_illustrations" boolean DEFAULT false,
    "story_illustrations" "jsonb",
    CONSTRAINT "content_content_type_check" CHECK (("content_type" = ANY (ARRAY['story'::"text", 'illustration'::"text", 'avatar'::"text", 'vignette_story'::"text"]))),
    CONSTRAINT "content_panel_count_check" CHECK ((("panel_count" IS NULL) OR (("panel_count" >= 1) AND ("panel_count" <= 16))))
);


ALTER TABLE "public"."content" OWNER TO "postgres";


COMMENT ON COLUMN "public"."content"."content_type" IS 'Content type: story, illustration, avatar, or vignette_story';



COMMENT ON COLUMN "public"."content"."generation_prompt" IS 'Future: OpenAI prompt for generating final narrative story from sliced images (Call #3)';



COMMENT ON COLUMN "public"."content"."vignette_helper_prompt" IS 'OpenAI prompt for generating visual scene descriptions for Leonardo (Call #1)';



COMMENT ON COLUMN "public"."content"."vignette_prompt" IS 'Leonardo.ai prompt for generating panoramic storyboard image (Call #2)';



COMMENT ON COLUMN "public"."content"."source_story_id" IS '[EXPERIMENTAL] Optional link to source story for text-to-vignette conversions (soft foreign key with ON DELETE SET NULL)';



COMMENT ON COLUMN "public"."content"."panel_count" IS '[EXPERIMENTAL] Number of panels in vignette grid layout (default: 9 for 3x3, supports 1-16 for future flexibility)';



COMMENT ON COLUMN "public"."content"."panoramic_image_url" IS 'URL to the full panoramic image from Leonardo.ai (before slicing)';



COMMENT ON COLUMN "public"."content"."vignette_story_prompt" IS 'Complete OpenAI Vision API prompt (system + user) for generating panel narratives from panoramic image (Call #3)';



COMMENT ON COLUMN "public"."content"."story_illustration_prompt" IS 'OpenAI-generated prompt for creating story illustrations. Contains a 3x3 grid description with character introductions and 8 scene descriptions in Disney Pixar style.';



COMMENT ON COLUMN "public"."content"."include_illustrations" IS 'Flag indicating whether illustration prompt generation was requested for this story.';



COMMENT ON COLUMN "public"."content"."story_illustrations" IS 'Array of illustration objects for stories. Each object contains type (grid_3x3, scene_0-8), URL, generation timestamp, and metadata.';



CREATE TABLE IF NOT EXISTS "public"."content_characters" (
    "id" "uuid" DEFAULT "gen_random_uuid"() NOT NULL,
    "content_id" "uuid" NOT NULL,
    "character_profile_id" "uuid",
    "role" "text",
    "character_name_in_content" "text",
    "created_at" timestamp with time zone DEFAULT "now"()
);


ALTER TABLE "public"."content_characters" OWNER TO "postgres";


CREATE TABLE IF NOT EXISTS "public"."content_illustrations" (
    "id" "uuid" DEFAULT "gen_random_uuid"() NOT NULL,
    "content_id" "uuid" NOT NULL,
    "storage_path" "text" NOT NULL,
    "image_url" "text" NOT NULL,
    "image_hash" "text",
    "leonardo_generation_id" "text",
    "illustration_type" "text" NOT NULL,
    "sequence_order" integer DEFAULT 0 NOT NULL,
    "prompt_used" "text" NOT NULL,
    "style" "text",
    "generation_metadata" "jsonb" DEFAULT '{}'::"jsonb",
    "created_at" timestamp with time zone DEFAULT "now"(),
    CONSTRAINT "content_illustrations_illustration_type_check" CHECK (("illustration_type" = ANY (ARRAY['storybook_cover'::"text", 'storybook_illustration'::"text", 'character_portrait'::"text", 'background'::"text"])))
);


ALTER TABLE "public"."content_illustrations" OWNER TO "postgres";


CREATE TABLE IF NOT EXISTS "public"."descriptor_mappings" (
    "id" "uuid" DEFAULT "gen_random_uuid"() NOT NULL,
    "profile_type" "text" NOT NULL,
    "descriptor_table" "text" NOT NULL,
    "is_required" boolean DEFAULT false,
    "created_at" timestamp with time zone DEFAULT "now"(),
    CONSTRAINT "descriptor_mappings_descriptor_table_check" CHECK (("descriptor_table" = ANY (ARRAY['descriptors_attribute'::"text", 'descriptors_age'::"text", 'descriptors_gender'::"text", 'descriptors_pet'::"text", 'descriptors_magical'::"text"]))),
    CONSTRAINT "descriptor_mappings_profile_type_check" CHECK (("profile_type" = ANY (ARRAY['child'::"text", 'storybook_character'::"text", 'pet'::"text", 'magical_creature'::"text"])))
);


ALTER TABLE "public"."descriptor_mappings" OWNER TO "postgres";


COMMENT ON TABLE "public"."descriptor_mappings" IS 'Links profile types to applicable descriptor tables';



CREATE TABLE IF NOT EXISTS "public"."descriptors_age" (
    "id" "uuid" DEFAULT "gen_random_uuid"() NOT NULL,
    "age_value" integer NOT NULL,
    "rich_description" "text" NOT NULL,
    "developmental_stage" "text",
    "is_active" boolean DEFAULT true,
    "created_at" timestamp with time zone DEFAULT "now"(),
    "updated_at" timestamp with time zone DEFAULT "now"()
);


ALTER TABLE "public"."descriptors_age" OWNER TO "postgres";


COMMENT ON TABLE "public"."descriptors_age" IS 'Age descriptors with standardized descriptions. developmental_stage provides optional categorical grouping.';



COMMENT ON COLUMN "public"."descriptors_age"."age_value" IS 'Numeric age (0-99)';



COMMENT ON COLUMN "public"."descriptors_age"."rich_description" IS 'Text description used in AI prompts (e.g., "six-year-old")';



COMMENT ON COLUMN "public"."descriptors_age"."developmental_stage" IS 'Optional categorical stage (infant, toddler, preschool, early childhood, middle childhood, pre-teen, teen, young adult, adult, middle-aged, mature, senior, elderly)';



CREATE TABLE IF NOT EXISTS "public"."descriptors_attribute" (
    "id" "uuid" DEFAULT "gen_random_uuid"() NOT NULL,
    "attribute_type" "text" NOT NULL,
    "simple_term" "text" NOT NULL,
    "rich_description" "text" NOT NULL,
    "hex_color" "text",
    "sort_order" integer DEFAULT 0,
    "is_active" boolean DEFAULT true,
    "created_at" timestamp with time zone DEFAULT "now"(),
    "updated_at" timestamp with time zone DEFAULT "now"(),
    CONSTRAINT "descriptors_attribute_attribute_type_check" CHECK (("attribute_type" = ANY (ARRAY['hair'::"text", 'eyes'::"text", 'skin'::"text", 'body'::"text", 'hair_length'::"text", 'hair_type'::"text", 'glasses'::"text", 'pet_color'::"text", 'magical_color'::"text"])))
);


ALTER TABLE "public"."descriptors_attribute" OWNER TO "postgres";


COMMENT ON TABLE "public"."descriptors_attribute" IS 'Physical attribute descriptors (hair, eyes, skin, body) with simple to rich text mappings';



COMMENT ON COLUMN "public"."descriptors_attribute"."attribute_type" IS 'Type of physical attribute. Includes: hair (human hair color), eyes, skin, body, hair_length, glasses, pet_color (fur/feathers/scales for animals)';



CREATE TABLE IF NOT EXISTS "public"."descriptors_gender" (
    "id" "uuid" DEFAULT "gen_random_uuid"() NOT NULL,
    "simple_term" "text" NOT NULL,
    "rich_description" "text" NOT NULL,
    "pronouns" "text",
    "is_active" boolean DEFAULT true,
    "created_at" timestamp with time zone DEFAULT "now"(),
    "updated_at" timestamp with time zone DEFAULT "now"(),
    "min_age" integer,
    "max_age" integer,
    "age_stage" "text",
    CONSTRAINT "check_valid_age_range" CHECK (("min_age" <= "max_age"))
);


ALTER TABLE "public"."descriptors_gender" OWNER TO "postgres";


COMMENT ON TABLE "public"."descriptors_gender" IS 'Gender presentation descriptors';



CREATE TABLE IF NOT EXISTS "public"."descriptors_magical" (
    "id" "uuid" DEFAULT "gen_random_uuid"() NOT NULL,
    "creature_type" "text" NOT NULL,
    "simple_term" "text" NOT NULL,
    "rich_description" "text" NOT NULL,
    "special_features" "jsonb",
    "rarity" "text",
    "is_active" boolean DEFAULT true,
    "created_at" timestamp with time zone DEFAULT "now"(),
    "updated_at" timestamp with time zone DEFAULT "now"(),
    CONSTRAINT "descriptors_magical_rarity_check" CHECK (("rarity" = ANY (ARRAY['common'::"text", 'uncommon'::"text", 'rare'::"text", 'legendary'::"text"])))
);


ALTER TABLE "public"."descriptors_magical" OWNER TO "postgres";


COMMENT ON TABLE "public"."descriptors_magical" IS 'Magical and fantasy creature descriptors';



CREATE TABLE IF NOT EXISTS "public"."descriptors_pet" (
    "id" "uuid" DEFAULT "gen_random_uuid"() NOT NULL,
    "species" "text" NOT NULL,
    "breed" "text",
    "simple_term" "text" NOT NULL,
    "rich_description" "text" NOT NULL,
    "size_category" "text",
    "temperament" "jsonb",
    "is_active" boolean DEFAULT true,
    "created_at" timestamp with time zone DEFAULT "now"(),
    "updated_at" timestamp with time zone DEFAULT "now"(),
    CONSTRAINT "descriptors_pet_size_category_check" CHECK (("size_category" = ANY (ARRAY['tiny'::"text", 'small'::"text", 'medium'::"text", 'large'::"text", 'giant'::"text"])))
);


ALTER TABLE "public"."descriptors_pet" OWNER TO "postgres";


COMMENT ON TABLE "public"."descriptors_pet" IS 'Pet-specific descriptors including species and breeds';



CREATE TABLE IF NOT EXISTS "public"."generation_usage" (
    "id" "uuid" DEFAULT "gen_random_uuid"() NOT NULL,
    "user_id" "uuid" NOT NULL,
    "generation_type" "text" NOT NULL,
    "month_year" "text" NOT NULL,
    "daily_count" integer DEFAULT 0,
    "monthly_count" integer DEFAULT 0,
    "last_generated_at" timestamp with time zone DEFAULT "now"(),
    "last_daily_reset_at" "date" DEFAULT CURRENT_DATE,
    "subscription_tier" "text" NOT NULL,
    "metadata" "jsonb" DEFAULT '{}'::"jsonb",
    "created_at" timestamp with time zone DEFAULT "now"(),
    "updated_at" timestamp with time zone DEFAULT "now"(),
    CONSTRAINT "generation_usage_generation_type_check" CHECK (("generation_type" = ANY (ARRAY['story'::"text", 'avatar'::"text", 'worksheet'::"text", 'activity'::"text", 'coloring_page'::"text"])))
);


ALTER TABLE "public"."generation_usage" OWNER TO "postgres";


COMMENT ON TABLE "public"."generation_usage" IS 'Unified tracking for all generation types (stories, avatars, etc.) for rate limiting';



COMMENT ON COLUMN "public"."generation_usage"."generation_type" IS 'Type of generation: story, avatar, worksheet, activity, coloring_page';



COMMENT ON COLUMN "public"."generation_usage"."metadata" IS 'Optional type-specific data (e.g., style preferences, common parameters)';



CREATE OR REPLACE VIEW "public"."stories" AS
 SELECT "id",
    "user_id",
    "content_type",
    "title",
    "body",
    "theme",
    "age_appropriate_for",
    "duration_minutes",
    "parent_content_id",
    "generation_prompt",
    "generation_metadata",
    "is_favorite",
    "read_count",
    "last_accessed_at",
    "created_at",
    "updated_at",
    "deleted_at",
    "vignette_helper_prompt",
    "vignette_prompt",
    "source_story_id",
    "panel_count",
    "panoramic_image_url",
    "vignette_story_prompt",
    "story_illustration_prompt",
    "include_illustrations",
    "story_illustrations"
   FROM "public"."content" "c"
  WHERE (("content_type" = 'story'::"text") AND ("deleted_at" IS NULL));


ALTER VIEW "public"."stories" OWNER TO "postgres";


COMMENT ON VIEW "public"."stories" IS 'View for accessing story content with illustrations. Filters out deleted stories and includes story_illustrations JSONB field for scene images.';



CREATE TABLE IF NOT EXISTS "public"."story_parameters" (
    "id" "uuid" DEFAULT "gen_random_uuid"() NOT NULL,
    "type" "text" NOT NULL,
    "name" "text" NOT NULL,
    "display_name" "text" NOT NULL,
    "description" "text",
    "metadata" "jsonb" DEFAULT '{}'::"jsonb",
    "is_active" boolean DEFAULT true,
    "display_order" integer DEFAULT 0,
    "created_at" timestamp with time zone DEFAULT "now"(),
    "updated_at" timestamp with time zone DEFAULT "now"(),
    CONSTRAINT "story_parameters_type_check" CHECK (("type" = ANY (ARRAY['genre'::"text", 'tone'::"text", 'length'::"text", 'growth_topic'::"text", 'growth_category'::"text", 'moral_lesson'::"text"])))
);


ALTER TABLE "public"."story_parameters" OWNER TO "postgres";


COMMENT ON TABLE "public"."story_parameters" IS 'Unified table for all story generation parameters - fully no-code editable';



COMMENT ON COLUMN "public"."story_parameters"."metadata" IS 'Type-specific data: length configs, growth topic guidance, etc.';



CREATE TABLE IF NOT EXISTS "public"."subscription_tiers" (
    "id" "uuid" DEFAULT "gen_random_uuid"() NOT NULL,
    "tier_name" "text" NOT NULL,
    "display_name" "text" NOT NULL,
    "price_monthly" numeric(10,2) DEFAULT 0,
    "price_yearly" numeric(10,2),
    "stories_per_day" integer,
    "stories_per_month" integer,
    "avatar_regenerations_per_month" integer DEFAULT 5,
    "features" "jsonb" DEFAULT '{}'::"jsonb",
    "display_order" integer DEFAULT 0 NOT NULL,
    "is_active" boolean DEFAULT true,
    "created_at" timestamp with time zone DEFAULT "now"(),
    "updated_at" timestamp with time zone DEFAULT "now"(),
    "max_child_profiles" integer,
    "max_other_characters" integer,
    "avatars_per_day" integer,
    "avatars_per_month" integer
);


ALTER TABLE "public"."subscription_tiers" OWNER TO "postgres";


COMMENT ON COLUMN "public"."subscription_tiers"."stories_per_day" IS 'Daily story generation limit (NULL = unlimited)';



COMMENT ON COLUMN "public"."subscription_tiers"."stories_per_month" IS 'Monthly story generation limit (NULL = unlimited)';



COMMENT ON COLUMN "public"."subscription_tiers"."max_child_profiles" IS 'Maximum number of child profiles allowed for this tier. NULL means unlimited.';



COMMENT ON COLUMN "public"."subscription_tiers"."max_other_characters" IS 'Maximum number of other characters (pets, storybook, magical) allowed for this tier. NULL means unlimited.';



COMMENT ON COLUMN "public"."subscription_tiers"."avatars_per_day" IS 'Daily avatar generation limit (NULL = unlimited)';



COMMENT ON COLUMN "public"."subscription_tiers"."avatars_per_month" IS 'Monthly avatar generation limit (NULL = unlimited)';



CREATE TABLE IF NOT EXISTS "public"."user_profiles" (
    "id" "uuid" NOT NULL,
    "email" "text" NOT NULL,
    "full_name" "text",
    "subscription_tier_id" "uuid",
    "stripe_customer_id" "text",
    "stripe_subscription_id" "text",
    "subscription_status" "text" DEFAULT 'free'::"text",
    "subscription_starts_at" timestamp with time zone,
    "subscription_ends_at" timestamp with time zone,
    "generations_used_today" integer DEFAULT 0,
    "generations_used_this_month" integer DEFAULT 0,
    "daily_limit_reset_at" timestamp with time zone DEFAULT ("date_trunc"('day'::"text", ("now"() AT TIME ZONE 'UTC'::"text")) + '1 day'::interval),
    "monthly_limit_reset_at" timestamp with time zone DEFAULT ("date_trunc"('month'::"text", ("now"() AT TIME ZONE 'UTC'::"text")) + '1 mon'::interval),
    "created_at" timestamp with time zone DEFAULT "now"(),
    "updated_at" timestamp with time zone DEFAULT "now"(),
    "user_type" "text" DEFAULT 'parent'::"text",
    CONSTRAINT "user_profiles_subscription_status_check" CHECK (("subscription_status" = ANY (ARRAY['free'::"text", 'active'::"text", 'cancelled'::"text", 'past_due'::"text", 'trialing'::"text"]))),
    CONSTRAINT "user_type_check" CHECK (("user_type" = ANY (ARRAY['parent'::"text", 'admin'::"text"])))
);


ALTER TABLE "public"."user_profiles" OWNER TO "postgres";


COMMENT ON COLUMN "public"."user_profiles"."user_type" IS 'User type: parent (regular users) or admin (team members)';



CREATE TABLE IF NOT EXISTS "public"."vignette_panels" (
    "id" "uuid" DEFAULT "gen_random_uuid"() NOT NULL,
    "story_id" "uuid" NOT NULL,
    "panel_number" integer NOT NULL,
    "image_url" "text" NOT NULL,
    "storage_path" "text" NOT NULL,
    "created_at" timestamp with time zone DEFAULT "now"(),
    "panel_text" "text",
    "panel_order" integer,
    "is_cover" boolean DEFAULT false,
    CONSTRAINT "vignette_panels_panel_number_check" CHECK ((("panel_number" >= 1) AND ("panel_number" <= 9))),
    CONSTRAINT "vignette_panels_panel_order_check" CHECK ((("panel_order" >= 1) AND ("panel_order" <= 8)))
);


ALTER TABLE "public"."vignette_panels" OWNER TO "postgres";


COMMENT ON TABLE "public"."vignette_panels" IS '[EXPERIMENTAL] Vignette story panel storage with AI-generated narratives. Schema may change during development. Created: 2025-11-10 | Last Updated: 2025-11-13';



COMMENT ON COLUMN "public"."vignette_panels"."story_id" IS 'Foreign key to content table (CASCADE delete when story is deleted)';



COMMENT ON COLUMN "public"."vignette_panels"."panel_number" IS 'Panel position in grid (1-9 for 3x3 layout, left-to-right, top-to-bottom)';



COMMENT ON COLUMN "public"."vignette_panels"."image_url" IS 'Public URL for panel image (512x512 cropped from panoramic)';



COMMENT ON COLUMN "public"."vignette_panels"."storage_path" IS 'Storage path in Supabase Storage illustrations bucket';



COMMENT ON COLUMN "public"."vignette_panels"."panel_text" IS '[EXPERIMENTAL] AI-generated narrative text for this panel (from OpenAI Vision API GPT-4o)';



COMMENT ON COLUMN "public"."vignette_panels"."panel_order" IS '[EXPERIMENTAL] Reading order position (1-8) for story panels (excludes cover panel, determined by Vision API)';



COMMENT ON COLUMN "public"."vignette_panels"."is_cover" IS '[EXPERIMENTAL] Designates this panel as the storybook cover (no narrative text, displayed first)';



ALTER TABLE ONLY "public"."ai_configs"
    ADD CONSTRAINT "ai_configs_name_key" UNIQUE ("name");



ALTER TABLE ONLY "public"."ai_configs"
    ADD CONSTRAINT "ai_configs_pkey" PRIMARY KEY ("id");



ALTER TABLE ONLY "public"."api_cost_logs"
    ADD CONSTRAINT "api_cost_logs_pkey" PRIMARY KEY ("id");



ALTER TABLE ONLY "public"."api_prices"
    ADD CONSTRAINT "api_prices_pkey" PRIMARY KEY ("id");



ALTER TABLE ONLY "public"."avatar_cache"
    ADD CONSTRAINT "avatar_cache_pkey" PRIMARY KEY ("id");



ALTER TABLE ONLY "public"."character_profiles"
    ADD CONSTRAINT "character_profiles_pkey" PRIMARY KEY ("id");



ALTER TABLE ONLY "public"."content_characters"
    ADD CONSTRAINT "content_characters_content_id_character_profile_id_key" UNIQUE ("content_id", "character_profile_id");



ALTER TABLE ONLY "public"."content_characters"
    ADD CONSTRAINT "content_characters_pkey" PRIMARY KEY ("id");



ALTER TABLE ONLY "public"."content_illustrations"
    ADD CONSTRAINT "content_illustrations_content_id_sequence_order_key" UNIQUE ("content_id", "sequence_order");



ALTER TABLE ONLY "public"."content_illustrations"
    ADD CONSTRAINT "content_illustrations_pkey" PRIMARY KEY ("id");



ALTER TABLE ONLY "public"."content"
    ADD CONSTRAINT "content_pkey" PRIMARY KEY ("id");



ALTER TABLE ONLY "public"."descriptor_mappings"
    ADD CONSTRAINT "descriptor_mappings_pkey" PRIMARY KEY ("id");



ALTER TABLE ONLY "public"."descriptor_mappings"
    ADD CONSTRAINT "descriptor_mappings_profile_type_descriptor_table_key" UNIQUE ("profile_type", "descriptor_table");



ALTER TABLE ONLY "public"."descriptors_age"
    ADD CONSTRAINT "descriptors_age_age_value_key" UNIQUE ("age_value");



ALTER TABLE ONLY "public"."descriptors_age"
    ADD CONSTRAINT "descriptors_age_pkey" PRIMARY KEY ("id");



ALTER TABLE ONLY "public"."descriptors_attribute"
    ADD CONSTRAINT "descriptors_attribute_attribute_type_simple_term_key" UNIQUE ("attribute_type", "simple_term");



ALTER TABLE ONLY "public"."descriptors_attribute"
    ADD CONSTRAINT "descriptors_attribute_pkey" PRIMARY KEY ("id");



ALTER TABLE ONLY "public"."descriptors_gender"
    ADD CONSTRAINT "descriptors_gender_pkey" PRIMARY KEY ("id");



ALTER TABLE ONLY "public"."descriptors_magical"
    ADD CONSTRAINT "descriptors_magical_creature_type_simple_term_key" UNIQUE ("creature_type", "simple_term");



ALTER TABLE ONLY "public"."descriptors_magical"
    ADD CONSTRAINT "descriptors_magical_pkey" PRIMARY KEY ("id");



ALTER TABLE ONLY "public"."descriptors_pet"
    ADD CONSTRAINT "descriptors_pet_pkey" PRIMARY KEY ("id");



ALTER TABLE ONLY "public"."descriptors_pet"
    ADD CONSTRAINT "descriptors_pet_species_breed_key" UNIQUE ("species", "breed");



ALTER TABLE ONLY "public"."generation_usage"
    ADD CONSTRAINT "generation_usage_pkey" PRIMARY KEY ("id");



ALTER TABLE ONLY "public"."generation_usage"
    ADD CONSTRAINT "generation_usage_user_id_month_year_generation_type_key" UNIQUE ("user_id", "month_year", "generation_type");



ALTER TABLE ONLY "public"."story_parameters"
    ADD CONSTRAINT "story_parameters_pkey" PRIMARY KEY ("id");



ALTER TABLE ONLY "public"."story_parameters"
    ADD CONSTRAINT "story_parameters_type_name_key" UNIQUE ("type", "name");



ALTER TABLE ONLY "public"."subscription_tiers"
    ADD CONSTRAINT "subscription_tiers_pkey" PRIMARY KEY ("id");



ALTER TABLE ONLY "public"."subscription_tiers"
    ADD CONSTRAINT "subscription_tiers_tier_name_key" UNIQUE ("tier_name");



ALTER TABLE ONLY "public"."user_profiles"
    ADD CONSTRAINT "user_profiles_pkey" PRIMARY KEY ("id");



ALTER TABLE ONLY "public"."user_profiles"
    ADD CONSTRAINT "user_profiles_stripe_customer_id_key" UNIQUE ("stripe_customer_id");



ALTER TABLE ONLY "public"."user_profiles"
    ADD CONSTRAINT "user_profiles_stripe_subscription_id_key" UNIQUE ("stripe_subscription_id");



ALTER TABLE ONLY "public"."vignette_panels"
    ADD CONSTRAINT "vignette_panels_pkey" PRIMARY KEY ("id");



ALTER TABLE ONLY "public"."vignette_panels"
    ADD CONSTRAINT "vignette_panels_story_id_panel_number_key" UNIQUE ("story_id", "panel_number");



CREATE UNIQUE INDEX "api_prices_provider_model_key" ON "public"."api_prices" USING "btree" ("provider", COALESCE("model_id", ''::"text"));



CREATE INDEX "idx_ai_configs_model_type" ON "public"."ai_configs" USING "btree" ("model_type") WHERE ("model_type" IS NOT NULL);



CREATE INDEX "idx_ai_configs_purpose_active" ON "public"."ai_configs" USING "btree" ("purpose", "is_active");



CREATE INDEX "idx_api_cost_logs_actual_cost" ON "public"."api_cost_logs" USING "btree" ("actual_cost") WHERE ("actual_cost" IS NOT NULL);



CREATE INDEX "idx_api_cost_logs_actual_cost_usd" ON "public"."api_cost_logs" USING "btree" ("actual_cost_usd") WHERE ("actual_cost_usd" IS NOT NULL);



CREATE INDEX "idx_api_cost_logs_ai_config_name" ON "public"."api_cost_logs" USING "btree" ("ai_config_name") WHERE ("ai_config_name" IS NOT NULL);



CREATE INDEX "idx_api_cost_logs_character_profile_id" ON "public"."api_cost_logs" USING "btree" ("character_profile_id") WHERE ("character_profile_id" IS NOT NULL);



CREATE INDEX "idx_api_cost_logs_content_id" ON "public"."api_cost_logs" USING "btree" ("content_id");



CREATE INDEX "idx_api_cost_logs_created_at" ON "public"."api_cost_logs" USING "btree" ("created_at" DESC);



CREATE INDEX "idx_api_cost_logs_operation" ON "public"."api_cost_logs" USING "btree" ("operation");



CREATE INDEX "idx_api_cost_logs_processing_status" ON "public"."api_cost_logs" USING "btree" ("processing_status");



CREATE INDEX "idx_api_cost_logs_provider" ON "public"."api_cost_logs" USING "btree" ("provider");



CREATE INDEX "idx_api_cost_logs_started_at" ON "public"."api_cost_logs" USING "btree" ("started_at" DESC);



CREATE INDEX "idx_api_cost_logs_tokens" ON "public"."api_cost_logs" USING "btree" ("prompt_tokens", "completion_tokens") WHERE ("prompt_tokens" IS NOT NULL);



CREATE INDEX "idx_api_cost_logs_user_id" ON "public"."api_cost_logs" USING "btree" ("user_id");



CREATE INDEX "idx_api_prices_model_type" ON "public"."api_prices" USING "btree" ("model_type") WHERE ("model_type" IS NOT NULL);



CREATE INDEX "idx_api_prices_provider" ON "public"."api_prices" USING "btree" ("provider");



CREATE INDEX "idx_avatar_cache_character_current" ON "public"."avatar_cache" USING "btree" ("character_profile_id", "is_current");



CREATE INDEX "idx_avatar_cache_character_id" ON "public"."avatar_cache" USING "btree" ("character_profile_id");



CREATE INDEX "idx_avatar_cache_created_by_user" ON "public"."avatar_cache" USING "btree" ("created_by_user_id") WHERE ("character_profile_id" IS NULL);



CREATE INDEX "idx_avatar_cache_current" ON "public"."avatar_cache" USING "btree" ("character_profile_id", "style") WHERE ("is_current" = true);



CREATE INDEX "idx_avatar_cache_hash" ON "public"."avatar_cache" USING "btree" ("image_hash");



CREATE INDEX "idx_avatar_cache_leonardo_id" ON "public"."avatar_cache" USING "btree" ("leonardo_generation_id");



CREATE INDEX "idx_avatar_cache_status" ON "public"."avatar_cache" USING "btree" ("processing_status");



CREATE INDEX "idx_avatar_cache_style" ON "public"."avatar_cache" USING "btree" ("style");



CREATE INDEX "idx_character_profiles_deleted_at" ON "public"."character_profiles" USING "btree" ("deleted_at");



CREATE INDEX "idx_character_profiles_type" ON "public"."character_profiles" USING "btree" ("character_type") WHERE ("deleted_at" IS NULL);



CREATE INDEX "idx_character_profiles_user_id" ON "public"."character_profiles" USING "btree" ("user_id") WHERE ("deleted_at" IS NULL);



CREATE INDEX "idx_content_characters_character_id" ON "public"."content_characters" USING "btree" ("character_profile_id");



CREATE INDEX "idx_content_characters_content_id" ON "public"."content_characters" USING "btree" ("content_id");



CREATE INDEX "idx_content_created_at" ON "public"."content" USING "btree" ("created_at" DESC) WHERE ("deleted_at" IS NULL);



CREATE INDEX "idx_content_deleted_at" ON "public"."content" USING "btree" ("deleted_at");



CREATE INDEX "idx_content_illustrations_content_id" ON "public"."content_illustrations" USING "btree" ("content_id");



CREATE INDEX "idx_content_illustrations_hash" ON "public"."content_illustrations" USING "btree" ("image_hash");



CREATE INDEX "idx_content_illustrations_type" ON "public"."content_illustrations" USING "btree" ("illustration_type");



CREATE INDEX "idx_content_parent_id" ON "public"."content" USING "btree" ("parent_content_id") WHERE ("deleted_at" IS NULL);



CREATE INDEX "idx_content_source_story_id" ON "public"."content" USING "btree" ("source_story_id") WHERE ("source_story_id" IS NOT NULL);



CREATE INDEX "idx_content_story_illustrations_type" ON "public"."content" USING "gin" ("story_illustrations");



CREATE INDEX "idx_content_type" ON "public"."content" USING "btree" ("content_type") WHERE ("deleted_at" IS NULL);



CREATE INDEX "idx_content_user_id" ON "public"."content" USING "btree" ("user_id") WHERE ("deleted_at" IS NULL);



CREATE INDEX "idx_descriptor_mappings_profile" ON "public"."descriptor_mappings" USING "btree" ("profile_type");



CREATE INDEX "idx_descriptors_age_value" ON "public"."descriptors_age" USING "btree" ("age_value");



CREATE INDEX "idx_descriptors_attribute_active" ON "public"."descriptors_attribute" USING "btree" ("is_active");



CREATE INDEX "idx_descriptors_attribute_type" ON "public"."descriptors_attribute" USING "btree" ("attribute_type");



CREATE INDEX "idx_descriptors_gender_age_range" ON "public"."descriptors_gender" USING "btree" ("simple_term", "min_age", "max_age");



CREATE INDEX "idx_descriptors_magical_creature" ON "public"."descriptors_magical" USING "btree" ("creature_type");



CREATE INDEX "idx_descriptors_pet_species" ON "public"."descriptors_pet" USING "btree" ("species");



CREATE INDEX "idx_generation_usage_daily_reset" ON "public"."generation_usage" USING "btree" ("last_daily_reset_at");



CREATE INDEX "idx_generation_usage_month" ON "public"."generation_usage" USING "btree" ("month_year");



CREATE INDEX "idx_generation_usage_type" ON "public"."generation_usage" USING "btree" ("generation_type");



CREATE INDEX "idx_generation_usage_user" ON "public"."generation_usage" USING "btree" ("user_id");



CREATE INDEX "idx_generation_usage_user_type" ON "public"."generation_usage" USING "btree" ("user_id", "generation_type");



CREATE INDEX "idx_story_parameters_type" ON "public"."story_parameters" USING "btree" ("type") WHERE ("is_active" = true);



CREATE INDEX "idx_story_parameters_type_order" ON "public"."story_parameters" USING "btree" ("type", "display_order");



CREATE INDEX "idx_user_profiles_stripe_customer_id" ON "public"."user_profiles" USING "btree" ("stripe_customer_id");



CREATE INDEX "idx_user_profiles_subscription_tier_id" ON "public"."user_profiles" USING "btree" ("subscription_tier_id");



CREATE INDEX "idx_vignette_panels_story_id" ON "public"."vignette_panels" USING "btree" ("story_id");



CREATE INDEX "idx_vignette_panels_story_panel" ON "public"."vignette_panels" USING "btree" ("story_id", "panel_number");



CREATE UNIQUE INDEX "vignette_panels_one_cover_idx" ON "public"."vignette_panels" USING "btree" ("story_id", "is_cover") WHERE ("is_cover" = true);



CREATE UNIQUE INDEX "vignette_panels_story_order_idx" ON "public"."vignette_panels" USING "btree" ("story_id", "panel_order") WHERE ("panel_order" IS NOT NULL);



CREATE OR REPLACE TRIGGER "api_prices_updated_at" BEFORE UPDATE ON "public"."api_prices" FOR EACH ROW EXECUTE FUNCTION "public"."update_api_prices_updated_at"();



CREATE OR REPLACE TRIGGER "handle_updated_at" BEFORE UPDATE ON "public"."character_profiles" FOR EACH ROW EXECUTE FUNCTION "public"."handle_updated_at"();



CREATE OR REPLACE TRIGGER "handle_updated_at" BEFORE UPDATE ON "public"."content" FOR EACH ROW EXECUTE FUNCTION "public"."handle_updated_at"();



CREATE OR REPLACE TRIGGER "handle_updated_at" BEFORE UPDATE ON "public"."subscription_tiers" FOR EACH ROW EXECUTE FUNCTION "public"."handle_updated_at"();



CREATE OR REPLACE TRIGGER "handle_updated_at" BEFORE UPDATE ON "public"."user_profiles" FOR EACH ROW EXECUTE FUNCTION "public"."handle_updated_at"();



CREATE OR REPLACE TRIGGER "update_descriptors_age_updated_at" BEFORE UPDATE ON "public"."descriptors_age" FOR EACH ROW EXECUTE FUNCTION "public"."update_updated_at_column"();



CREATE OR REPLACE TRIGGER "update_descriptors_attribute_updated_at" BEFORE UPDATE ON "public"."descriptors_attribute" FOR EACH ROW EXECUTE FUNCTION "public"."update_updated_at_column"();



CREATE OR REPLACE TRIGGER "update_descriptors_gender_updated_at" BEFORE UPDATE ON "public"."descriptors_gender" FOR EACH ROW EXECUTE FUNCTION "public"."update_updated_at_column"();



CREATE OR REPLACE TRIGGER "update_descriptors_magical_updated_at" BEFORE UPDATE ON "public"."descriptors_magical" FOR EACH ROW EXECUTE FUNCTION "public"."update_updated_at_column"();



CREATE OR REPLACE TRIGGER "update_descriptors_pet_updated_at" BEFORE UPDATE ON "public"."descriptors_pet" FOR EACH ROW EXECUTE FUNCTION "public"."update_updated_at_column"();



ALTER TABLE ONLY "public"."api_cost_logs"
    ADD CONSTRAINT "api_cost_logs_character_profile_id_fkey" FOREIGN KEY ("character_profile_id") REFERENCES "public"."character_profiles"("id") ON DELETE SET NULL;



ALTER TABLE ONLY "public"."api_cost_logs"
    ADD CONSTRAINT "api_cost_logs_content_id_fkey" FOREIGN KEY ("content_id") REFERENCES "public"."content"("id") ON DELETE SET NULL;



ALTER TABLE ONLY "public"."api_cost_logs"
    ADD CONSTRAINT "api_cost_logs_user_id_fkey" FOREIGN KEY ("user_id") REFERENCES "auth"."users"("id") ON DELETE CASCADE;



ALTER TABLE ONLY "public"."avatar_cache"
    ADD CONSTRAINT "avatar_cache_ai_config_id_fkey" FOREIGN KEY ("ai_config_id") REFERENCES "public"."ai_configs"("id") ON DELETE CASCADE;



ALTER TABLE ONLY "public"."avatar_cache"
    ADD CONSTRAINT "avatar_cache_character_profile_id_fkey" FOREIGN KEY ("character_profile_id") REFERENCES "public"."character_profiles"("id") ON DELETE CASCADE;



ALTER TABLE ONLY "public"."avatar_cache"
    ADD CONSTRAINT "avatar_cache_created_by_user_id_fkey" FOREIGN KEY ("created_by_user_id") REFERENCES "auth"."users"("id") ON DELETE CASCADE;



ALTER TABLE ONLY "public"."character_profiles"
    ADD CONSTRAINT "character_profiles_avatar_cache_id_fkey" FOREIGN KEY ("avatar_cache_id") REFERENCES "public"."avatar_cache"("id") ON DELETE SET NULL;



ALTER TABLE ONLY "public"."character_profiles"
    ADD CONSTRAINT "character_profiles_user_id_fkey" FOREIGN KEY ("user_id") REFERENCES "auth"."users"("id") ON DELETE CASCADE;



ALTER TABLE ONLY "public"."content_characters"
    ADD CONSTRAINT "content_characters_character_profile_id_fkey" FOREIGN KEY ("character_profile_id") REFERENCES "public"."character_profiles"("id") ON DELETE CASCADE;



COMMENT ON CONSTRAINT "content_characters_character_profile_id_fkey" ON "public"."content_characters" IS 'CASCADE delete: When character profile is deleted, remove junction records';



ALTER TABLE ONLY "public"."content_characters"
    ADD CONSTRAINT "content_characters_content_id_fkey" FOREIGN KEY ("content_id") REFERENCES "public"."content"("id") ON DELETE CASCADE;



ALTER TABLE ONLY "public"."content_illustrations"
    ADD CONSTRAINT "content_illustrations_content_id_fkey" FOREIGN KEY ("content_id") REFERENCES "public"."content"("id") ON DELETE CASCADE;



ALTER TABLE ONLY "public"."content"
    ADD CONSTRAINT "content_parent_content_id_fkey" FOREIGN KEY ("parent_content_id") REFERENCES "public"."content"("id") ON DELETE SET NULL;



ALTER TABLE ONLY "public"."content"
    ADD CONSTRAINT "content_source_story_id_fkey" FOREIGN KEY ("source_story_id") REFERENCES "public"."content"("id") ON DELETE SET NULL;



ALTER TABLE ONLY "public"."content"
    ADD CONSTRAINT "content_user_id_fkey" FOREIGN KEY ("user_id") REFERENCES "auth"."users"("id") ON DELETE CASCADE;



COMMENT ON CONSTRAINT "content_user_id_fkey" ON "public"."content" IS 'CASCADE delete: When user is deleted, all their content (stories, etc.) are also deleted';



ALTER TABLE ONLY "public"."generation_usage"
    ADD CONSTRAINT "generation_usage_user_id_fkey" FOREIGN KEY ("user_id") REFERENCES "auth"."users"("id") ON DELETE CASCADE;



ALTER TABLE ONLY "public"."user_profiles"
    ADD CONSTRAINT "user_profiles_id_fkey" FOREIGN KEY ("id") REFERENCES "auth"."users"("id") ON DELETE CASCADE;



ALTER TABLE ONLY "public"."user_profiles"
    ADD CONSTRAINT "user_profiles_subscription_tier_id_fkey" FOREIGN KEY ("subscription_tier_id") REFERENCES "public"."subscription_tiers"("id");



ALTER TABLE ONLY "public"."vignette_panels"
    ADD CONSTRAINT "vignette_panels_story_id_fkey" FOREIGN KEY ("story_id") REFERENCES "public"."content"("id") ON DELETE CASCADE;



CREATE POLICY "Admin users can manage age descriptors" ON "public"."descriptors_age" TO "authenticated" USING ((EXISTS ( SELECT 1
   FROM "public"."user_profiles"
  WHERE (("user_profiles"."id" = "auth"."uid"()) AND ("user_profiles"."user_type" = 'admin'::"text")))));



CREATE POLICY "Admin users can manage attribute descriptors" ON "public"."descriptors_attribute" TO "authenticated" USING ((EXISTS ( SELECT 1
   FROM "public"."user_profiles"
  WHERE (("user_profiles"."id" = "auth"."uid"()) AND ("user_profiles"."user_type" = 'admin'::"text")))));



CREATE POLICY "Admin users can manage descriptor mappings" ON "public"."descriptor_mappings" TO "authenticated" USING ((EXISTS ( SELECT 1
   FROM "public"."user_profiles"
  WHERE (("user_profiles"."id" = "auth"."uid"()) AND ("user_profiles"."user_type" = 'admin'::"text")))));



CREATE POLICY "Admin users can manage gender descriptors" ON "public"."descriptors_gender" TO "authenticated" USING ((EXISTS ( SELECT 1
   FROM "public"."user_profiles"
  WHERE (("user_profiles"."id" = "auth"."uid"()) AND ("user_profiles"."user_type" = 'admin'::"text")))));



CREATE POLICY "Admin users can manage magical descriptors" ON "public"."descriptors_magical" TO "authenticated" USING ((EXISTS ( SELECT 1
   FROM "public"."user_profiles"
  WHERE (("user_profiles"."id" = "auth"."uid"()) AND ("user_profiles"."user_type" = 'admin'::"text")))));



CREATE POLICY "Admin users can manage pet descriptors" ON "public"."descriptors_pet" TO "authenticated" USING ((EXISTS ( SELECT 1
   FROM "public"."user_profiles"
  WHERE (("user_profiles"."id" = "auth"."uid"()) AND ("user_profiles"."user_type" = 'admin'::"text")))));



CREATE POLICY "Allow authenticated users to read api_prices" ON "public"."api_prices" FOR SELECT TO "authenticated" USING (true);



CREATE POLICY "Authenticated users can read active age descriptors" ON "public"."descriptors_age" FOR SELECT TO "authenticated" USING (("is_active" = true));



CREATE POLICY "Authenticated users can read active attribute descriptors" ON "public"."descriptors_attribute" FOR SELECT TO "authenticated" USING (("is_active" = true));



CREATE POLICY "Authenticated users can read active gender descriptors" ON "public"."descriptors_gender" FOR SELECT TO "authenticated" USING (("is_active" = true));



CREATE POLICY "Authenticated users can read active magical descriptors" ON "public"."descriptors_magical" FOR SELECT TO "authenticated" USING (("is_active" = true));



CREATE POLICY "Authenticated users can read active pet descriptors" ON "public"."descriptors_pet" FOR SELECT TO "authenticated" USING (("is_active" = true));



CREATE POLICY "Authenticated users can read descriptor mappings" ON "public"."descriptor_mappings" FOR SELECT TO "authenticated" USING (true);



CREATE POLICY "Only service role can modify api_prices" ON "public"."api_prices" TO "service_role" USING (true) WITH CHECK (true);



CREATE POLICY "Story parameters are viewable by authenticated users" ON "public"."story_parameters" FOR SELECT TO "authenticated" USING (("is_active" = true));



CREATE POLICY "System can insert API costs" ON "public"."api_cost_logs" FOR INSERT WITH CHECK (true);



CREATE POLICY "Users can create own characters" ON "public"."character_profiles" FOR INSERT WITH CHECK (("auth"."uid"() = "user_id"));



CREATE POLICY "Users can create own content" ON "public"."content" FOR INSERT WITH CHECK (("auth"."uid"() = "user_id"));



CREATE POLICY "Users can delete avatar cache" ON "public"."avatar_cache" FOR DELETE USING (((EXISTS ( SELECT 1
   FROM "public"."character_profiles"
  WHERE (("character_profiles"."id" = "avatar_cache"."character_profile_id") AND ("character_profiles"."user_id" = "auth"."uid"())))) OR ("created_by_user_id" = "auth"."uid"())));



CREATE POLICY "Users can delete their own vignette panels" ON "public"."vignette_panels" FOR DELETE USING ((EXISTS ( SELECT 1
   FROM "public"."content"
  WHERE (("content"."id" = "vignette_panels"."story_id") AND ("content"."user_id" = "auth"."uid"())))));



CREATE POLICY "Users can insert avatar cache" ON "public"."avatar_cache" FOR INSERT WITH CHECK (("created_by_user_id" = "auth"."uid"()));



CREATE POLICY "Users can insert their own generation usage" ON "public"."generation_usage" FOR INSERT TO "authenticated" WITH CHECK (("user_id" = "auth"."uid"()));



CREATE POLICY "Users can insert vignette panels for their own stories" ON "public"."vignette_panels" FOR INSERT WITH CHECK ((EXISTS ( SELECT 1
   FROM "public"."content"
  WHERE (("content"."id" = "vignette_panels"."story_id") AND ("content"."user_id" = "auth"."uid"())))));



CREATE POLICY "Users can manage content characters" ON "public"."content_characters" USING ((EXISTS ( SELECT 1
   FROM "public"."content"
  WHERE (("content"."id" = "content_characters"."content_id") AND ("content"."user_id" = "auth"."uid"())))));



CREATE POLICY "Users can manage content illustrations" ON "public"."content_illustrations" USING ((EXISTS ( SELECT 1
   FROM "public"."content"
  WHERE (("content"."id" = "content_illustrations"."content_id") AND ("content"."user_id" = "auth"."uid"())))));



CREATE POLICY "Users can soft delete own characters" ON "public"."character_profiles" FOR DELETE USING (("auth"."uid"() = "user_id"));



CREATE POLICY "Users can soft delete own content" ON "public"."content" FOR DELETE USING (("auth"."uid"() = "user_id"));



CREATE POLICY "Users can update avatar cache" ON "public"."avatar_cache" FOR UPDATE USING (((EXISTS ( SELECT 1
   FROM "public"."character_profiles"
  WHERE (("character_profiles"."id" = "avatar_cache"."character_profile_id") AND ("character_profiles"."user_id" = "auth"."uid"())))) OR ("created_by_user_id" = "auth"."uid"()))) WITH CHECK ((("created_by_user_id" = "auth"."uid"()) OR (EXISTS ( SELECT 1
   FROM "public"."character_profiles"
  WHERE (("character_profiles"."id" = "avatar_cache"."character_profile_id") AND ("character_profiles"."user_id" = "auth"."uid"()))))));



CREATE POLICY "Users can update own characters" ON "public"."character_profiles" FOR UPDATE USING (("auth"."uid"() = "user_id"));



CREATE POLICY "Users can update own content" ON "public"."content" FOR UPDATE USING (("auth"."uid"() = "user_id"));



CREATE POLICY "Users can update own profile" ON "public"."user_profiles" FOR UPDATE USING (("auth"."uid"() = "id"));



CREATE POLICY "Users can update their own generation usage" ON "public"."generation_usage" FOR UPDATE TO "authenticated" USING (("user_id" = "auth"."uid"())) WITH CHECK (("user_id" = "auth"."uid"()));



CREATE POLICY "Users can view active AI configs" ON "public"."ai_configs" FOR SELECT TO "authenticated" USING (("is_active" = true));



CREATE POLICY "Users can view avatar cache" ON "public"."avatar_cache" FOR SELECT USING (((EXISTS ( SELECT 1
   FROM "public"."character_profiles"
  WHERE (("character_profiles"."id" = "avatar_cache"."character_profile_id") AND ("character_profiles"."user_id" = "auth"."uid"())))) OR ("created_by_user_id" = "auth"."uid"())));



CREATE POLICY "Users can view content characters" ON "public"."content_characters" FOR SELECT USING ((EXISTS ( SELECT 1
   FROM "public"."content"
  WHERE (("content"."id" = "content_characters"."content_id") AND ("content"."user_id" = "auth"."uid"())))));



CREATE POLICY "Users can view content illustrations" ON "public"."content_illustrations" FOR SELECT USING ((EXISTS ( SELECT 1
   FROM "public"."content"
  WHERE (("content"."id" = "content_illustrations"."content_id") AND ("content"."user_id" = "auth"."uid"())))));



CREATE POLICY "Users can view own API costs" ON "public"."api_cost_logs" FOR SELECT USING (("auth"."uid"() = "user_id"));



CREATE POLICY "Users can view own characters" ON "public"."character_profiles" FOR SELECT USING (("auth"."uid"() = "user_id"));



CREATE POLICY "Users can view own content" ON "public"."content" FOR SELECT USING (("auth"."uid"() = "user_id"));



CREATE POLICY "Users can view own profile" ON "public"."user_profiles" FOR SELECT USING (("auth"."uid"() = "id"));



CREATE POLICY "Users can view their own generation usage" ON "public"."generation_usage" FOR SELECT TO "authenticated" USING (("user_id" = "auth"."uid"()));



CREATE POLICY "Users can view their own vignette panels" ON "public"."vignette_panels" FOR SELECT USING ((EXISTS ( SELECT 1
   FROM "public"."content"
  WHERE (("content"."id" = "vignette_panels"."story_id") AND ("content"."user_id" = "auth"."uid"())))));



ALTER TABLE "public"."ai_configs" ENABLE ROW LEVEL SECURITY;


ALTER TABLE "public"."api_cost_logs" ENABLE ROW LEVEL SECURITY;


ALTER TABLE "public"."api_prices" ENABLE ROW LEVEL SECURITY;


ALTER TABLE "public"."avatar_cache" ENABLE ROW LEVEL SECURITY;


ALTER TABLE "public"."character_profiles" ENABLE ROW LEVEL SECURITY;


ALTER TABLE "public"."content" ENABLE ROW LEVEL SECURITY;


ALTER TABLE "public"."content_characters" ENABLE ROW LEVEL SECURITY;


ALTER TABLE "public"."content_illustrations" ENABLE ROW LEVEL SECURITY;


ALTER TABLE "public"."descriptor_mappings" ENABLE ROW LEVEL SECURITY;


ALTER TABLE "public"."descriptors_age" ENABLE ROW LEVEL SECURITY;


ALTER TABLE "public"."descriptors_attribute" ENABLE ROW LEVEL SECURITY;


ALTER TABLE "public"."descriptors_gender" ENABLE ROW LEVEL SECURITY;


ALTER TABLE "public"."descriptors_magical" ENABLE ROW LEVEL SECURITY;


ALTER TABLE "public"."descriptors_pet" ENABLE ROW LEVEL SECURITY;


ALTER TABLE "public"."generation_usage" ENABLE ROW LEVEL SECURITY;


ALTER TABLE "public"."story_parameters" ENABLE ROW LEVEL SECURITY;


ALTER TABLE "public"."user_profiles" ENABLE ROW LEVEL SECURITY;


ALTER TABLE "public"."vignette_panels" ENABLE ROW LEVEL SECURITY;


GRANT USAGE ON SCHEMA "public" TO "postgres";
GRANT USAGE ON SCHEMA "public" TO "anon";
GRANT USAGE ON SCHEMA "public" TO "authenticated";
GRANT USAGE ON SCHEMA "public" TO "service_role";



GRANT ALL ON FUNCTION "public"."delete_user_completely"("user_id" "uuid") TO "anon";
GRANT ALL ON FUNCTION "public"."delete_user_completely"("user_id" "uuid") TO "authenticated";
GRANT ALL ON FUNCTION "public"."delete_user_completely"("user_id" "uuid") TO "service_role";



GRANT ALL ON FUNCTION "public"."delete_user_safely"("p_user_id" "uuid") TO "anon";
GRANT ALL ON FUNCTION "public"."delete_user_safely"("p_user_id" "uuid") TO "authenticated";
GRANT ALL ON FUNCTION "public"."delete_user_safely"("p_user_id" "uuid") TO "service_role";



GRANT ALL ON FUNCTION "public"."force_delete_user"("p_user_id" "uuid") TO "anon";
GRANT ALL ON FUNCTION "public"."force_delete_user"("p_user_id" "uuid") TO "authenticated";
GRANT ALL ON FUNCTION "public"."force_delete_user"("p_user_id" "uuid") TO "service_role";



GRANT ALL ON FUNCTION "public"."get_gender_descriptor_for_age"("p_gender" "text", "p_age" integer) TO "anon";
GRANT ALL ON FUNCTION "public"."get_gender_descriptor_for_age"("p_gender" "text", "p_age" integer) TO "authenticated";
GRANT ALL ON FUNCTION "public"."get_gender_descriptor_for_age"("p_gender" "text", "p_age" integer) TO "service_role";



GRANT ALL ON FUNCTION "public"."get_remaining_regenerations"("p_user_id" "uuid", "p_character_profile_id" "uuid") TO "anon";
GRANT ALL ON FUNCTION "public"."get_remaining_regenerations"("p_user_id" "uuid", "p_character_profile_id" "uuid") TO "authenticated";
GRANT ALL ON FUNCTION "public"."get_remaining_regenerations"("p_user_id" "uuid", "p_character_profile_id" "uuid") TO "service_role";



GRANT ALL ON FUNCTION "public"."handle_new_user"() TO "anon";
GRANT ALL ON FUNCTION "public"."handle_new_user"() TO "authenticated";
GRANT ALL ON FUNCTION "public"."handle_new_user"() TO "service_role";



GRANT ALL ON FUNCTION "public"."handle_updated_at"() TO "anon";
GRANT ALL ON FUNCTION "public"."handle_updated_at"() TO "authenticated";
GRANT ALL ON FUNCTION "public"."handle_updated_at"() TO "service_role";



GRANT ALL ON FUNCTION "public"."increment_avatar_generation"("p_user_id" "uuid", "p_character_profile_id" "uuid", "p_ai_config_name" "text") TO "anon";
GRANT ALL ON FUNCTION "public"."increment_avatar_generation"("p_user_id" "uuid", "p_character_profile_id" "uuid", "p_ai_config_name" "text") TO "authenticated";
GRANT ALL ON FUNCTION "public"."increment_avatar_generation"("p_user_id" "uuid", "p_character_profile_id" "uuid", "p_ai_config_name" "text") TO "service_role";



GRANT ALL ON FUNCTION "public"."increment_generation_usage"("p_user_id" "uuid", "p_generation_type" "text", "p_month_year" "text", "p_subscription_tier" "text") TO "anon";
GRANT ALL ON FUNCTION "public"."increment_generation_usage"("p_user_id" "uuid", "p_generation_type" "text", "p_month_year" "text", "p_subscription_tier" "text") TO "authenticated";
GRANT ALL ON FUNCTION "public"."increment_generation_usage"("p_user_id" "uuid", "p_generation_type" "text", "p_month_year" "text", "p_subscription_tier" "text") TO "service_role";



GRANT ALL ON FUNCTION "public"."update_api_prices_updated_at"() TO "anon";
GRANT ALL ON FUNCTION "public"."update_api_prices_updated_at"() TO "authenticated";
GRANT ALL ON FUNCTION "public"."update_api_prices_updated_at"() TO "service_role";



GRANT ALL ON FUNCTION "public"."update_updated_at_column"() TO "anon";
GRANT ALL ON FUNCTION "public"."update_updated_at_column"() TO "authenticated";
GRANT ALL ON FUNCTION "public"."update_updated_at_column"() TO "service_role";



GRANT ALL ON TABLE "public"."ai_configs" TO "anon";
GRANT ALL ON TABLE "public"."ai_configs" TO "authenticated";
GRANT ALL ON TABLE "public"."ai_configs" TO "service_role";



GRANT ALL ON TABLE "public"."api_cost_logs" TO "anon";
GRANT ALL ON TABLE "public"."api_cost_logs" TO "authenticated";
GRANT ALL ON TABLE "public"."api_cost_logs" TO "service_role";



GRANT ALL ON TABLE "public"."api_prices" TO "anon";
GRANT ALL ON TABLE "public"."api_prices" TO "authenticated";
GRANT ALL ON TABLE "public"."api_prices" TO "service_role";



GRANT ALL ON TABLE "public"."avatar_cache" TO "anon";
GRANT ALL ON TABLE "public"."avatar_cache" TO "authenticated";
GRANT ALL ON TABLE "public"."avatar_cache" TO "service_role";



GRANT ALL ON TABLE "public"."character_profiles" TO "anon";
GRANT ALL ON TABLE "public"."character_profiles" TO "authenticated";
GRANT ALL ON TABLE "public"."character_profiles" TO "service_role";



GRANT ALL ON TABLE "public"."content" TO "anon";
GRANT ALL ON TABLE "public"."content" TO "authenticated";
GRANT ALL ON TABLE "public"."content" TO "service_role";



GRANT ALL ON TABLE "public"."content_characters" TO "anon";
GRANT ALL ON TABLE "public"."content_characters" TO "authenticated";
GRANT ALL ON TABLE "public"."content_characters" TO "service_role";



GRANT ALL ON TABLE "public"."content_illustrations" TO "anon";
GRANT ALL ON TABLE "public"."content_illustrations" TO "authenticated";
GRANT ALL ON TABLE "public"."content_illustrations" TO "service_role";



GRANT ALL ON TABLE "public"."descriptor_mappings" TO "anon";
GRANT ALL ON TABLE "public"."descriptor_mappings" TO "authenticated";
GRANT ALL ON TABLE "public"."descriptor_mappings" TO "service_role";



GRANT ALL ON TABLE "public"."descriptors_age" TO "anon";
GRANT ALL ON TABLE "public"."descriptors_age" TO "authenticated";
GRANT ALL ON TABLE "public"."descriptors_age" TO "service_role";



GRANT ALL ON TABLE "public"."descriptors_attribute" TO "anon";
GRANT ALL ON TABLE "public"."descriptors_attribute" TO "authenticated";
GRANT ALL ON TABLE "public"."descriptors_attribute" TO "service_role";



GRANT ALL ON TABLE "public"."descriptors_gender" TO "anon";
GRANT ALL ON TABLE "public"."descriptors_gender" TO "authenticated";
GRANT ALL ON TABLE "public"."descriptors_gender" TO "service_role";



GRANT ALL ON TABLE "public"."descriptors_magical" TO "anon";
GRANT ALL ON TABLE "public"."descriptors_magical" TO "authenticated";
GRANT ALL ON TABLE "public"."descriptors_magical" TO "service_role";



GRANT ALL ON TABLE "public"."descriptors_pet" TO "anon";
GRANT ALL ON TABLE "public"."descriptors_pet" TO "authenticated";
GRANT ALL ON TABLE "public"."descriptors_pet" TO "service_role";



GRANT ALL ON TABLE "public"."generation_usage" TO "anon";
GRANT ALL ON TABLE "public"."generation_usage" TO "authenticated";
GRANT ALL ON TABLE "public"."generation_usage" TO "service_role";



GRANT ALL ON TABLE "public"."stories" TO "anon";
GRANT ALL ON TABLE "public"."stories" TO "authenticated";
GRANT ALL ON TABLE "public"."stories" TO "service_role";



GRANT ALL ON TABLE "public"."story_parameters" TO "anon";
GRANT ALL ON TABLE "public"."story_parameters" TO "authenticated";
GRANT ALL ON TABLE "public"."story_parameters" TO "service_role";



GRANT ALL ON TABLE "public"."subscription_tiers" TO "anon";
GRANT ALL ON TABLE "public"."subscription_tiers" TO "authenticated";
GRANT ALL ON TABLE "public"."subscription_tiers" TO "service_role";



GRANT ALL ON TABLE "public"."user_profiles" TO "anon";
GRANT ALL ON TABLE "public"."user_profiles" TO "authenticated";
GRANT ALL ON TABLE "public"."user_profiles" TO "service_role";



GRANT ALL ON TABLE "public"."vignette_panels" TO "anon";
GRANT ALL ON TABLE "public"."vignette_panels" TO "authenticated";
GRANT ALL ON TABLE "public"."vignette_panels" TO "service_role";



ALTER DEFAULT PRIVILEGES FOR ROLE "postgres" IN SCHEMA "public" GRANT ALL ON SEQUENCES TO "postgres";
ALTER DEFAULT PRIVILEGES FOR ROLE "postgres" IN SCHEMA "public" GRANT ALL ON SEQUENCES TO "anon";
ALTER DEFAULT PRIVILEGES FOR ROLE "postgres" IN SCHEMA "public" GRANT ALL ON SEQUENCES TO "authenticated";
ALTER DEFAULT PRIVILEGES FOR ROLE "postgres" IN SCHEMA "public" GRANT ALL ON SEQUENCES TO "service_role";






ALTER DEFAULT PRIVILEGES FOR ROLE "postgres" IN SCHEMA "public" GRANT ALL ON FUNCTIONS TO "postgres";
ALTER DEFAULT PRIVILEGES FOR ROLE "postgres" IN SCHEMA "public" GRANT ALL ON FUNCTIONS TO "anon";
ALTER DEFAULT PRIVILEGES FOR ROLE "postgres" IN SCHEMA "public" GRANT ALL ON FUNCTIONS TO "authenticated";
ALTER DEFAULT PRIVILEGES FOR ROLE "postgres" IN SCHEMA "public" GRANT ALL ON FUNCTIONS TO "service_role";






ALTER DEFAULT PRIVILEGES FOR ROLE "postgres" IN SCHEMA "public" GRANT ALL ON TABLES TO "postgres";
ALTER DEFAULT PRIVILEGES FOR ROLE "postgres" IN SCHEMA "public" GRANT ALL ON TABLES TO "anon";
ALTER DEFAULT PRIVILEGES FOR ROLE "postgres" IN SCHEMA "public" GRANT ALL ON TABLES TO "authenticated";
ALTER DEFAULT PRIVILEGES FOR ROLE "postgres" IN SCHEMA "public" GRANT ALL ON TABLES TO "service_role";







