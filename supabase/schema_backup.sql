


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


CREATE SCHEMA IF NOT EXISTS "auth";


ALTER SCHEMA "auth" OWNER TO "supabase_admin";


CREATE SCHEMA IF NOT EXISTS "public";


ALTER SCHEMA "public" OWNER TO "pg_database_owner";


COMMENT ON SCHEMA "public" IS 'standard public schema';



CREATE SCHEMA IF NOT EXISTS "storage";


ALTER SCHEMA "storage" OWNER TO "supabase_admin";


CREATE TYPE "auth"."aal_level" AS ENUM (
    'aal1',
    'aal2',
    'aal3'
);


ALTER TYPE "auth"."aal_level" OWNER TO "supabase_auth_admin";


CREATE TYPE "auth"."code_challenge_method" AS ENUM (
    's256',
    'plain'
);


ALTER TYPE "auth"."code_challenge_method" OWNER TO "supabase_auth_admin";


CREATE TYPE "auth"."factor_status" AS ENUM (
    'unverified',
    'verified'
);


ALTER TYPE "auth"."factor_status" OWNER TO "supabase_auth_admin";


CREATE TYPE "auth"."factor_type" AS ENUM (
    'totp',
    'webauthn',
    'phone'
);


ALTER TYPE "auth"."factor_type" OWNER TO "supabase_auth_admin";


CREATE TYPE "auth"."oauth_authorization_status" AS ENUM (
    'pending',
    'approved',
    'denied',
    'expired'
);


ALTER TYPE "auth"."oauth_authorization_status" OWNER TO "supabase_auth_admin";


CREATE TYPE "auth"."oauth_client_type" AS ENUM (
    'public',
    'confidential'
);


ALTER TYPE "auth"."oauth_client_type" OWNER TO "supabase_auth_admin";


CREATE TYPE "auth"."oauth_registration_type" AS ENUM (
    'dynamic',
    'manual'
);


ALTER TYPE "auth"."oauth_registration_type" OWNER TO "supabase_auth_admin";


CREATE TYPE "auth"."oauth_response_type" AS ENUM (
    'code'
);


ALTER TYPE "auth"."oauth_response_type" OWNER TO "supabase_auth_admin";


CREATE TYPE "auth"."one_time_token_type" AS ENUM (
    'confirmation_token',
    'reauthentication_token',
    'recovery_token',
    'email_change_token_new',
    'email_change_token_current',
    'phone_change_token'
);


ALTER TYPE "auth"."one_time_token_type" OWNER TO "supabase_auth_admin";


CREATE TYPE "storage"."buckettype" AS ENUM (
    'STANDARD',
    'ANALYTICS'
);


ALTER TYPE "storage"."buckettype" OWNER TO "supabase_storage_admin";


CREATE OR REPLACE FUNCTION "auth"."email"() RETURNS "text"
    LANGUAGE "sql" STABLE
    AS $$
  select 
  coalesce(
    nullif(current_setting('request.jwt.claim.email', true), ''),
    (nullif(current_setting('request.jwt.claims', true), '')::jsonb ->> 'email')
  )::text
$$;


ALTER FUNCTION "auth"."email"() OWNER TO "supabase_auth_admin";


COMMENT ON FUNCTION "auth"."email"() IS 'Deprecated. Use auth.jwt() -> ''email'' instead.';



CREATE OR REPLACE FUNCTION "auth"."jwt"() RETURNS "jsonb"
    LANGUAGE "sql" STABLE
    AS $$
  select 
    coalesce(
        nullif(current_setting('request.jwt.claim', true), ''),
        nullif(current_setting('request.jwt.claims', true), '')
    )::jsonb
$$;


ALTER FUNCTION "auth"."jwt"() OWNER TO "supabase_auth_admin";


CREATE OR REPLACE FUNCTION "auth"."role"() RETURNS "text"
    LANGUAGE "sql" STABLE
    AS $$
  select 
  coalesce(
    nullif(current_setting('request.jwt.claim.role', true), ''),
    (nullif(current_setting('request.jwt.claims', true), '')::jsonb ->> 'role')
  )::text
$$;


ALTER FUNCTION "auth"."role"() OWNER TO "supabase_auth_admin";


COMMENT ON FUNCTION "auth"."role"() IS 'Deprecated. Use auth.jwt() -> ''role'' instead.';



CREATE OR REPLACE FUNCTION "auth"."uid"() RETURNS "uuid"
    LANGUAGE "sql" STABLE
    AS $$
  select 
  coalesce(
    nullif(current_setting('request.jwt.claim.sub', true), ''),
    (nullif(current_setting('request.jwt.claims', true), '')::jsonb ->> 'sub')
  )::uuid
$$;


ALTER FUNCTION "auth"."uid"() OWNER TO "supabase_auth_admin";


COMMENT ON FUNCTION "auth"."uid"() IS 'Deprecated. Use auth.jwt() -> ''sub'' instead.';



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
BEGIN
  INSERT INTO public.user_profiles (
    id,
    email,
    full_name,
    created_at,
    updated_at
  ) VALUES (
    new.id,
    new.email,
    COALESCE(new.raw_user_meta_data->>'full_name', ''),
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


CREATE OR REPLACE FUNCTION "storage"."add_prefixes"("_bucket_id" "text", "_name" "text") RETURNS "void"
    LANGUAGE "plpgsql" SECURITY DEFINER
    AS $$
DECLARE
    prefixes text[];
BEGIN
    prefixes := "storage"."get_prefixes"("_name");

    IF array_length(prefixes, 1) > 0 THEN
        INSERT INTO storage.prefixes (name, bucket_id)
        SELECT UNNEST(prefixes) as name, "_bucket_id" ON CONFLICT DO NOTHING;
    END IF;
END;
$$;


ALTER FUNCTION "storage"."add_prefixes"("_bucket_id" "text", "_name" "text") OWNER TO "supabase_storage_admin";


CREATE OR REPLACE FUNCTION "storage"."can_insert_object"("bucketid" "text", "name" "text", "owner" "uuid", "metadata" "jsonb") RETURNS "void"
    LANGUAGE "plpgsql"
    AS $$
BEGIN
  INSERT INTO "storage"."objects" ("bucket_id", "name", "owner", "metadata") VALUES (bucketid, name, owner, metadata);
  -- hack to rollback the successful insert
  RAISE sqlstate 'PT200' using
  message = 'ROLLBACK',
  detail = 'rollback successful insert';
END
$$;


ALTER FUNCTION "storage"."can_insert_object"("bucketid" "text", "name" "text", "owner" "uuid", "metadata" "jsonb") OWNER TO "supabase_storage_admin";


CREATE OR REPLACE FUNCTION "storage"."delete_leaf_prefixes"("bucket_ids" "text"[], "names" "text"[]) RETURNS "void"
    LANGUAGE "plpgsql" SECURITY DEFINER
    AS $$
DECLARE
    v_rows_deleted integer;
BEGIN
    LOOP
        WITH candidates AS (
            SELECT DISTINCT
                t.bucket_id,
                unnest(storage.get_prefixes(t.name)) AS name
            FROM unnest(bucket_ids, names) AS t(bucket_id, name)
        ),
        uniq AS (
             SELECT
                 bucket_id,
                 name,
                 storage.get_level(name) AS level
             FROM candidates
             WHERE name <> ''
             GROUP BY bucket_id, name
        ),
        leaf AS (
             SELECT
                 p.bucket_id,
                 p.name,
                 p.level
             FROM storage.prefixes AS p
                  JOIN uniq AS u
                       ON u.bucket_id = p.bucket_id
                           AND u.name = p.name
                           AND u.level = p.level
             WHERE NOT EXISTS (
                 SELECT 1
                 FROM storage.objects AS o
                 WHERE o.bucket_id = p.bucket_id
                   AND o.level = p.level + 1
                   AND o.name COLLATE "C" LIKE p.name || '/%'
             )
             AND NOT EXISTS (
                 SELECT 1
                 FROM storage.prefixes AS c
                 WHERE c.bucket_id = p.bucket_id
                   AND c.level = p.level + 1
                   AND c.name COLLATE "C" LIKE p.name || '/%'
             )
        )
        DELETE
        FROM storage.prefixes AS p
            USING leaf AS l
        WHERE p.bucket_id = l.bucket_id
          AND p.name = l.name
          AND p.level = l.level;

        GET DIAGNOSTICS v_rows_deleted = ROW_COUNT;
        EXIT WHEN v_rows_deleted = 0;
    END LOOP;
END;
$$;


ALTER FUNCTION "storage"."delete_leaf_prefixes"("bucket_ids" "text"[], "names" "text"[]) OWNER TO "supabase_storage_admin";


CREATE OR REPLACE FUNCTION "storage"."delete_prefix"("_bucket_id" "text", "_name" "text") RETURNS boolean
    LANGUAGE "plpgsql" SECURITY DEFINER
    AS $$
BEGIN
    -- Check if we can delete the prefix
    IF EXISTS(
        SELECT FROM "storage"."prefixes"
        WHERE "prefixes"."bucket_id" = "_bucket_id"
          AND level = "storage"."get_level"("_name") + 1
          AND "prefixes"."name" COLLATE "C" LIKE "_name" || '/%'
        LIMIT 1
    )
    OR EXISTS(
        SELECT FROM "storage"."objects"
        WHERE "objects"."bucket_id" = "_bucket_id"
          AND "storage"."get_level"("objects"."name") = "storage"."get_level"("_name") + 1
          AND "objects"."name" COLLATE "C" LIKE "_name" || '/%'
        LIMIT 1
    ) THEN
    -- There are sub-objects, skip deletion
    RETURN false;
    ELSE
        DELETE FROM "storage"."prefixes"
        WHERE "prefixes"."bucket_id" = "_bucket_id"
          AND level = "storage"."get_level"("_name")
          AND "prefixes"."name" = "_name";
        RETURN true;
    END IF;
END;
$$;


ALTER FUNCTION "storage"."delete_prefix"("_bucket_id" "text", "_name" "text") OWNER TO "supabase_storage_admin";


CREATE OR REPLACE FUNCTION "storage"."delete_prefix_hierarchy_trigger"() RETURNS "trigger"
    LANGUAGE "plpgsql"
    AS $$
DECLARE
    prefix text;
BEGIN
    prefix := "storage"."get_prefix"(OLD."name");

    IF coalesce(prefix, '') != '' THEN
        PERFORM "storage"."delete_prefix"(OLD."bucket_id", prefix);
    END IF;

    RETURN OLD;
END;
$$;


ALTER FUNCTION "storage"."delete_prefix_hierarchy_trigger"() OWNER TO "supabase_storage_admin";


CREATE OR REPLACE FUNCTION "storage"."enforce_bucket_name_length"() RETURNS "trigger"
    LANGUAGE "plpgsql"
    AS $$
begin
    if length(new.name) > 100 then
        raise exception 'bucket name "%" is too long (% characters). Max is 100.', new.name, length(new.name);
    end if;
    return new;
end;
$$;


ALTER FUNCTION "storage"."enforce_bucket_name_length"() OWNER TO "supabase_storage_admin";


CREATE OR REPLACE FUNCTION "storage"."extension"("name" "text") RETURNS "text"
    LANGUAGE "plpgsql" IMMUTABLE
    AS $$
DECLARE
    _parts text[];
    _filename text;
BEGIN
    SELECT string_to_array(name, '/') INTO _parts;
    SELECT _parts[array_length(_parts,1)] INTO _filename;
    RETURN reverse(split_part(reverse(_filename), '.', 1));
END
$$;


ALTER FUNCTION "storage"."extension"("name" "text") OWNER TO "supabase_storage_admin";


CREATE OR REPLACE FUNCTION "storage"."filename"("name" "text") RETURNS "text"
    LANGUAGE "plpgsql"
    AS $$
DECLARE
_parts text[];
BEGIN
	select string_to_array(name, '/') into _parts;
	return _parts[array_length(_parts,1)];
END
$$;


ALTER FUNCTION "storage"."filename"("name" "text") OWNER TO "supabase_storage_admin";


CREATE OR REPLACE FUNCTION "storage"."foldername"("name" "text") RETURNS "text"[]
    LANGUAGE "plpgsql" IMMUTABLE
    AS $$
DECLARE
    _parts text[];
BEGIN
    -- Split on "/" to get path segments
    SELECT string_to_array(name, '/') INTO _parts;
    -- Return everything except the last segment
    RETURN _parts[1 : array_length(_parts,1) - 1];
END
$$;


ALTER FUNCTION "storage"."foldername"("name" "text") OWNER TO "supabase_storage_admin";


CREATE OR REPLACE FUNCTION "storage"."get_level"("name" "text") RETURNS integer
    LANGUAGE "sql" IMMUTABLE STRICT
    AS $$
SELECT array_length(string_to_array("name", '/'), 1);
$$;


ALTER FUNCTION "storage"."get_level"("name" "text") OWNER TO "supabase_storage_admin";


CREATE OR REPLACE FUNCTION "storage"."get_prefix"("name" "text") RETURNS "text"
    LANGUAGE "sql" IMMUTABLE STRICT
    AS $_$
SELECT
    CASE WHEN strpos("name", '/') > 0 THEN
             regexp_replace("name", '[\/]{1}[^\/]+\/?$', '')
         ELSE
             ''
        END;
$_$;


ALTER FUNCTION "storage"."get_prefix"("name" "text") OWNER TO "supabase_storage_admin";


CREATE OR REPLACE FUNCTION "storage"."get_prefixes"("name" "text") RETURNS "text"[]
    LANGUAGE "plpgsql" IMMUTABLE STRICT
    AS $$
DECLARE
    parts text[];
    prefixes text[];
    prefix text;
BEGIN
    -- Split the name into parts by '/'
    parts := string_to_array("name", '/');
    prefixes := '{}';

    -- Construct the prefixes, stopping one level below the last part
    FOR i IN 1..array_length(parts, 1) - 1 LOOP
            prefix := array_to_string(parts[1:i], '/');
            prefixes := array_append(prefixes, prefix);
    END LOOP;

    RETURN prefixes;
END;
$$;


ALTER FUNCTION "storage"."get_prefixes"("name" "text") OWNER TO "supabase_storage_admin";


CREATE OR REPLACE FUNCTION "storage"."get_size_by_bucket"() RETURNS TABLE("size" bigint, "bucket_id" "text")
    LANGUAGE "plpgsql" STABLE
    AS $$
BEGIN
    return query
        select sum((metadata->>'size')::bigint) as size, obj.bucket_id
        from "storage".objects as obj
        group by obj.bucket_id;
END
$$;


ALTER FUNCTION "storage"."get_size_by_bucket"() OWNER TO "supabase_storage_admin";


CREATE OR REPLACE FUNCTION "storage"."list_multipart_uploads_with_delimiter"("bucket_id" "text", "prefix_param" "text", "delimiter_param" "text", "max_keys" integer DEFAULT 100, "next_key_token" "text" DEFAULT ''::"text", "next_upload_token" "text" DEFAULT ''::"text") RETURNS TABLE("key" "text", "id" "text", "created_at" timestamp with time zone)
    LANGUAGE "plpgsql"
    AS $_$
BEGIN
    RETURN QUERY EXECUTE
        'SELECT DISTINCT ON(key COLLATE "C") * from (
            SELECT
                CASE
                    WHEN position($2 IN substring(key from length($1) + 1)) > 0 THEN
                        substring(key from 1 for length($1) + position($2 IN substring(key from length($1) + 1)))
                    ELSE
                        key
                END AS key, id, created_at
            FROM
                storage.s3_multipart_uploads
            WHERE
                bucket_id = $5 AND
                key ILIKE $1 || ''%'' AND
                CASE
                    WHEN $4 != '''' AND $6 = '''' THEN
                        CASE
                            WHEN position($2 IN substring(key from length($1) + 1)) > 0 THEN
                                substring(key from 1 for length($1) + position($2 IN substring(key from length($1) + 1))) COLLATE "C" > $4
                            ELSE
                                key COLLATE "C" > $4
                            END
                    ELSE
                        true
                END AND
                CASE
                    WHEN $6 != '''' THEN
                        id COLLATE "C" > $6
                    ELSE
                        true
                    END
            ORDER BY
                key COLLATE "C" ASC, created_at ASC) as e order by key COLLATE "C" LIMIT $3'
        USING prefix_param, delimiter_param, max_keys, next_key_token, bucket_id, next_upload_token;
END;
$_$;


ALTER FUNCTION "storage"."list_multipart_uploads_with_delimiter"("bucket_id" "text", "prefix_param" "text", "delimiter_param" "text", "max_keys" integer, "next_key_token" "text", "next_upload_token" "text") OWNER TO "supabase_storage_admin";


CREATE OR REPLACE FUNCTION "storage"."list_objects_with_delimiter"("bucket_id" "text", "prefix_param" "text", "delimiter_param" "text", "max_keys" integer DEFAULT 100, "start_after" "text" DEFAULT ''::"text", "next_token" "text" DEFAULT ''::"text") RETURNS TABLE("name" "text", "id" "uuid", "metadata" "jsonb", "updated_at" timestamp with time zone)
    LANGUAGE "plpgsql"
    AS $_$
BEGIN
    RETURN QUERY EXECUTE
        'SELECT DISTINCT ON(name COLLATE "C") * from (
            SELECT
                CASE
                    WHEN position($2 IN substring(name from length($1) + 1)) > 0 THEN
                        substring(name from 1 for length($1) + position($2 IN substring(name from length($1) + 1)))
                    ELSE
                        name
                END AS name, id, metadata, updated_at
            FROM
                storage.objects
            WHERE
                bucket_id = $5 AND
                name ILIKE $1 || ''%'' AND
                CASE
                    WHEN $6 != '''' THEN
                    name COLLATE "C" > $6
                ELSE true END
                AND CASE
                    WHEN $4 != '''' THEN
                        CASE
                            WHEN position($2 IN substring(name from length($1) + 1)) > 0 THEN
                                substring(name from 1 for length($1) + position($2 IN substring(name from length($1) + 1))) COLLATE "C" > $4
                            ELSE
                                name COLLATE "C" > $4
                            END
                    ELSE
                        true
                END
            ORDER BY
                name COLLATE "C" ASC) as e order by name COLLATE "C" LIMIT $3'
        USING prefix_param, delimiter_param, max_keys, next_token, bucket_id, start_after;
END;
$_$;


ALTER FUNCTION "storage"."list_objects_with_delimiter"("bucket_id" "text", "prefix_param" "text", "delimiter_param" "text", "max_keys" integer, "start_after" "text", "next_token" "text") OWNER TO "supabase_storage_admin";


CREATE OR REPLACE FUNCTION "storage"."lock_top_prefixes"("bucket_ids" "text"[], "names" "text"[]) RETURNS "void"
    LANGUAGE "plpgsql" SECURITY DEFINER
    AS $$
DECLARE
    v_bucket text;
    v_top text;
BEGIN
    FOR v_bucket, v_top IN
        SELECT DISTINCT t.bucket_id,
            split_part(t.name, '/', 1) AS top
        FROM unnest(bucket_ids, names) AS t(bucket_id, name)
        WHERE t.name <> ''
        ORDER BY 1, 2
        LOOP
            PERFORM pg_advisory_xact_lock(hashtextextended(v_bucket || '/' || v_top, 0));
        END LOOP;
END;
$$;


ALTER FUNCTION "storage"."lock_top_prefixes"("bucket_ids" "text"[], "names" "text"[]) OWNER TO "supabase_storage_admin";


CREATE OR REPLACE FUNCTION "storage"."objects_delete_cleanup"() RETURNS "trigger"
    LANGUAGE "plpgsql" SECURITY DEFINER
    AS $$
DECLARE
    v_bucket_ids text[];
    v_names      text[];
BEGIN
    IF current_setting('storage.gc.prefixes', true) = '1' THEN
        RETURN NULL;
    END IF;

    PERFORM set_config('storage.gc.prefixes', '1', true);

    SELECT COALESCE(array_agg(d.bucket_id), '{}'),
           COALESCE(array_agg(d.name), '{}')
    INTO v_bucket_ids, v_names
    FROM deleted AS d
    WHERE d.name <> '';

    PERFORM storage.lock_top_prefixes(v_bucket_ids, v_names);
    PERFORM storage.delete_leaf_prefixes(v_bucket_ids, v_names);

    RETURN NULL;
END;
$$;


ALTER FUNCTION "storage"."objects_delete_cleanup"() OWNER TO "supabase_storage_admin";


CREATE OR REPLACE FUNCTION "storage"."objects_insert_prefix_trigger"() RETURNS "trigger"
    LANGUAGE "plpgsql"
    AS $$
BEGIN
    PERFORM "storage"."add_prefixes"(NEW."bucket_id", NEW."name");
    NEW.level := "storage"."get_level"(NEW."name");

    RETURN NEW;
END;
$$;


ALTER FUNCTION "storage"."objects_insert_prefix_trigger"() OWNER TO "supabase_storage_admin";


CREATE OR REPLACE FUNCTION "storage"."objects_update_cleanup"() RETURNS "trigger"
    LANGUAGE "plpgsql" SECURITY DEFINER
    AS $$
DECLARE
    -- NEW - OLD (destinations to create prefixes for)
    v_add_bucket_ids text[];
    v_add_names      text[];

    -- OLD - NEW (sources to prune)
    v_src_bucket_ids text[];
    v_src_names      text[];
BEGIN
    IF TG_OP <> 'UPDATE' THEN
        RETURN NULL;
    END IF;

    -- 1) Compute NEW−OLD (added paths) and OLD−NEW (moved-away paths)
    WITH added AS (
        SELECT n.bucket_id, n.name
        FROM new_rows n
        WHERE n.name <> '' AND position('/' in n.name) > 0
        EXCEPT
        SELECT o.bucket_id, o.name FROM old_rows o WHERE o.name <> ''
    ),
    moved AS (
         SELECT o.bucket_id, o.name
         FROM old_rows o
         WHERE o.name <> ''
         EXCEPT
         SELECT n.bucket_id, n.name FROM new_rows n WHERE n.name <> ''
    )
    SELECT
        -- arrays for ADDED (dest) in stable order
        COALESCE( (SELECT array_agg(a.bucket_id ORDER BY a.bucket_id, a.name) FROM added a), '{}' ),
        COALESCE( (SELECT array_agg(a.name      ORDER BY a.bucket_id, a.name) FROM added a), '{}' ),
        -- arrays for MOVED (src) in stable order
        COALESCE( (SELECT array_agg(m.bucket_id ORDER BY m.bucket_id, m.name) FROM moved m), '{}' ),
        COALESCE( (SELECT array_agg(m.name      ORDER BY m.bucket_id, m.name) FROM moved m), '{}' )
    INTO v_add_bucket_ids, v_add_names, v_src_bucket_ids, v_src_names;

    -- Nothing to do?
    IF (array_length(v_add_bucket_ids, 1) IS NULL) AND (array_length(v_src_bucket_ids, 1) IS NULL) THEN
        RETURN NULL;
    END IF;

    -- 2) Take per-(bucket, top) locks: ALL prefixes in consistent global order to prevent deadlocks
    DECLARE
        v_all_bucket_ids text[];
        v_all_names text[];
    BEGIN
        -- Combine source and destination arrays for consistent lock ordering
        v_all_bucket_ids := COALESCE(v_src_bucket_ids, '{}') || COALESCE(v_add_bucket_ids, '{}');
        v_all_names := COALESCE(v_src_names, '{}') || COALESCE(v_add_names, '{}');

        -- Single lock call ensures consistent global ordering across all transactions
        IF array_length(v_all_bucket_ids, 1) IS NOT NULL THEN
            PERFORM storage.lock_top_prefixes(v_all_bucket_ids, v_all_names);
        END IF;
    END;

    -- 3) Create destination prefixes (NEW−OLD) BEFORE pruning sources
    IF array_length(v_add_bucket_ids, 1) IS NOT NULL THEN
        WITH candidates AS (
            SELECT DISTINCT t.bucket_id, unnest(storage.get_prefixes(t.name)) AS name
            FROM unnest(v_add_bucket_ids, v_add_names) AS t(bucket_id, name)
            WHERE name <> ''
        )
        INSERT INTO storage.prefixes (bucket_id, name)
        SELECT c.bucket_id, c.name
        FROM candidates c
        ON CONFLICT DO NOTHING;
    END IF;

    -- 4) Prune source prefixes bottom-up for OLD−NEW
    IF array_length(v_src_bucket_ids, 1) IS NOT NULL THEN
        -- re-entrancy guard so DELETE on prefixes won't recurse
        IF current_setting('storage.gc.prefixes', true) <> '1' THEN
            PERFORM set_config('storage.gc.prefixes', '1', true);
        END IF;

        PERFORM storage.delete_leaf_prefixes(v_src_bucket_ids, v_src_names);
    END IF;

    RETURN NULL;
END;
$$;


ALTER FUNCTION "storage"."objects_update_cleanup"() OWNER TO "supabase_storage_admin";


CREATE OR REPLACE FUNCTION "storage"."objects_update_level_trigger"() RETURNS "trigger"
    LANGUAGE "plpgsql"
    AS $$
BEGIN
    -- Ensure this is an update operation and the name has changed
    IF TG_OP = 'UPDATE' AND (NEW."name" <> OLD."name" OR NEW."bucket_id" <> OLD."bucket_id") THEN
        -- Set the new level
        NEW."level" := "storage"."get_level"(NEW."name");
    END IF;
    RETURN NEW;
END;
$$;


ALTER FUNCTION "storage"."objects_update_level_trigger"() OWNER TO "supabase_storage_admin";


CREATE OR REPLACE FUNCTION "storage"."objects_update_prefix_trigger"() RETURNS "trigger"
    LANGUAGE "plpgsql"
    AS $$
DECLARE
    old_prefixes TEXT[];
BEGIN
    -- Ensure this is an update operation and the name has changed
    IF TG_OP = 'UPDATE' AND (NEW."name" <> OLD."name" OR NEW."bucket_id" <> OLD."bucket_id") THEN
        -- Retrieve old prefixes
        old_prefixes := "storage"."get_prefixes"(OLD."name");

        -- Remove old prefixes that are only used by this object
        WITH all_prefixes as (
            SELECT unnest(old_prefixes) as prefix
        ),
        can_delete_prefixes as (
             SELECT prefix
             FROM all_prefixes
             WHERE NOT EXISTS (
                 SELECT 1 FROM "storage"."objects"
                 WHERE "bucket_id" = OLD."bucket_id"
                   AND "name" <> OLD."name"
                   AND "name" LIKE (prefix || '%')
             )
         )
        DELETE FROM "storage"."prefixes" WHERE name IN (SELECT prefix FROM can_delete_prefixes);

        -- Add new prefixes
        PERFORM "storage"."add_prefixes"(NEW."bucket_id", NEW."name");
    END IF;
    -- Set the new level
    NEW."level" := "storage"."get_level"(NEW."name");

    RETURN NEW;
END;
$$;


ALTER FUNCTION "storage"."objects_update_prefix_trigger"() OWNER TO "supabase_storage_admin";


CREATE OR REPLACE FUNCTION "storage"."operation"() RETURNS "text"
    LANGUAGE "plpgsql" STABLE
    AS $$
BEGIN
    RETURN current_setting('storage.operation', true);
END;
$$;


ALTER FUNCTION "storage"."operation"() OWNER TO "supabase_storage_admin";


CREATE OR REPLACE FUNCTION "storage"."prefixes_delete_cleanup"() RETURNS "trigger"
    LANGUAGE "plpgsql" SECURITY DEFINER
    AS $$
DECLARE
    v_bucket_ids text[];
    v_names      text[];
BEGIN
    IF current_setting('storage.gc.prefixes', true) = '1' THEN
        RETURN NULL;
    END IF;

    PERFORM set_config('storage.gc.prefixes', '1', true);

    SELECT COALESCE(array_agg(d.bucket_id), '{}'),
           COALESCE(array_agg(d.name), '{}')
    INTO v_bucket_ids, v_names
    FROM deleted AS d
    WHERE d.name <> '';

    PERFORM storage.lock_top_prefixes(v_bucket_ids, v_names);
    PERFORM storage.delete_leaf_prefixes(v_bucket_ids, v_names);

    RETURN NULL;
END;
$$;


ALTER FUNCTION "storage"."prefixes_delete_cleanup"() OWNER TO "supabase_storage_admin";


CREATE OR REPLACE FUNCTION "storage"."prefixes_insert_trigger"() RETURNS "trigger"
    LANGUAGE "plpgsql"
    AS $$
BEGIN
    PERFORM "storage"."add_prefixes"(NEW."bucket_id", NEW."name");
    RETURN NEW;
END;
$$;


ALTER FUNCTION "storage"."prefixes_insert_trigger"() OWNER TO "supabase_storage_admin";


CREATE OR REPLACE FUNCTION "storage"."search"("prefix" "text", "bucketname" "text", "limits" integer DEFAULT 100, "levels" integer DEFAULT 1, "offsets" integer DEFAULT 0, "search" "text" DEFAULT ''::"text", "sortcolumn" "text" DEFAULT 'name'::"text", "sortorder" "text" DEFAULT 'asc'::"text") RETURNS TABLE("name" "text", "id" "uuid", "updated_at" timestamp with time zone, "created_at" timestamp with time zone, "last_accessed_at" timestamp with time zone, "metadata" "jsonb")
    LANGUAGE "plpgsql"
    AS $$
declare
    can_bypass_rls BOOLEAN;
begin
    SELECT rolbypassrls
    INTO can_bypass_rls
    FROM pg_roles
    WHERE rolname = coalesce(nullif(current_setting('role', true), 'none'), current_user);

    IF can_bypass_rls THEN
        RETURN QUERY SELECT * FROM storage.search_v1_optimised(prefix, bucketname, limits, levels, offsets, search, sortcolumn, sortorder);
    ELSE
        RETURN QUERY SELECT * FROM storage.search_legacy_v1(prefix, bucketname, limits, levels, offsets, search, sortcolumn, sortorder);
    END IF;
end;
$$;


ALTER FUNCTION "storage"."search"("prefix" "text", "bucketname" "text", "limits" integer, "levels" integer, "offsets" integer, "search" "text", "sortcolumn" "text", "sortorder" "text") OWNER TO "supabase_storage_admin";


CREATE OR REPLACE FUNCTION "storage"."search_legacy_v1"("prefix" "text", "bucketname" "text", "limits" integer DEFAULT 100, "levels" integer DEFAULT 1, "offsets" integer DEFAULT 0, "search" "text" DEFAULT ''::"text", "sortcolumn" "text" DEFAULT 'name'::"text", "sortorder" "text" DEFAULT 'asc'::"text") RETURNS TABLE("name" "text", "id" "uuid", "updated_at" timestamp with time zone, "created_at" timestamp with time zone, "last_accessed_at" timestamp with time zone, "metadata" "jsonb")
    LANGUAGE "plpgsql" STABLE
    AS $_$
declare
    v_order_by text;
    v_sort_order text;
begin
    case
        when sortcolumn = 'name' then
            v_order_by = 'name';
        when sortcolumn = 'updated_at' then
            v_order_by = 'updated_at';
        when sortcolumn = 'created_at' then
            v_order_by = 'created_at';
        when sortcolumn = 'last_accessed_at' then
            v_order_by = 'last_accessed_at';
        else
            v_order_by = 'name';
        end case;

    case
        when sortorder = 'asc' then
            v_sort_order = 'asc';
        when sortorder = 'desc' then
            v_sort_order = 'desc';
        else
            v_sort_order = 'asc';
        end case;

    v_order_by = v_order_by || ' ' || v_sort_order;

    return query execute
        'with folders as (
           select path_tokens[$1] as folder
           from storage.objects
             where objects.name ilike $2 || $3 || ''%''
               and bucket_id = $4
               and array_length(objects.path_tokens, 1) <> $1
           group by folder
           order by folder ' || v_sort_order || '
     )
     (select folder as "name",
            null as id,
            null as updated_at,
            null as created_at,
            null as last_accessed_at,
            null as metadata from folders)
     union all
     (select path_tokens[$1] as "name",
            id,
            updated_at,
            created_at,
            last_accessed_at,
            metadata
     from storage.objects
     where objects.name ilike $2 || $3 || ''%''
       and bucket_id = $4
       and array_length(objects.path_tokens, 1) = $1
     order by ' || v_order_by || ')
     limit $5
     offset $6' using levels, prefix, search, bucketname, limits, offsets;
end;
$_$;


ALTER FUNCTION "storage"."search_legacy_v1"("prefix" "text", "bucketname" "text", "limits" integer, "levels" integer, "offsets" integer, "search" "text", "sortcolumn" "text", "sortorder" "text") OWNER TO "supabase_storage_admin";


CREATE OR REPLACE FUNCTION "storage"."search_v1_optimised"("prefix" "text", "bucketname" "text", "limits" integer DEFAULT 100, "levels" integer DEFAULT 1, "offsets" integer DEFAULT 0, "search" "text" DEFAULT ''::"text", "sortcolumn" "text" DEFAULT 'name'::"text", "sortorder" "text" DEFAULT 'asc'::"text") RETURNS TABLE("name" "text", "id" "uuid", "updated_at" timestamp with time zone, "created_at" timestamp with time zone, "last_accessed_at" timestamp with time zone, "metadata" "jsonb")
    LANGUAGE "plpgsql" STABLE
    AS $_$
declare
    v_order_by text;
    v_sort_order text;
begin
    case
        when sortcolumn = 'name' then
            v_order_by = 'name';
        when sortcolumn = 'updated_at' then
            v_order_by = 'updated_at';
        when sortcolumn = 'created_at' then
            v_order_by = 'created_at';
        when sortcolumn = 'last_accessed_at' then
            v_order_by = 'last_accessed_at';
        else
            v_order_by = 'name';
        end case;

    case
        when sortorder = 'asc' then
            v_sort_order = 'asc';
        when sortorder = 'desc' then
            v_sort_order = 'desc';
        else
            v_sort_order = 'asc';
        end case;

    v_order_by = v_order_by || ' ' || v_sort_order;

    return query execute
        'with folders as (
           select (string_to_array(name, ''/''))[level] as name
           from storage.prefixes
             where lower(prefixes.name) like lower($2 || $3) || ''%''
               and bucket_id = $4
               and level = $1
           order by name ' || v_sort_order || '
     )
     (select name,
            null as id,
            null as updated_at,
            null as created_at,
            null as last_accessed_at,
            null as metadata from folders)
     union all
     (select path_tokens[level] as "name",
            id,
            updated_at,
            created_at,
            last_accessed_at,
            metadata
     from storage.objects
     where lower(objects.name) like lower($2 || $3) || ''%''
       and bucket_id = $4
       and level = $1
     order by ' || v_order_by || ')
     limit $5
     offset $6' using levels, prefix, search, bucketname, limits, offsets;
end;
$_$;


ALTER FUNCTION "storage"."search_v1_optimised"("prefix" "text", "bucketname" "text", "limits" integer, "levels" integer, "offsets" integer, "search" "text", "sortcolumn" "text", "sortorder" "text") OWNER TO "supabase_storage_admin";


CREATE OR REPLACE FUNCTION "storage"."search_v2"("prefix" "text", "bucket_name" "text", "limits" integer DEFAULT 100, "levels" integer DEFAULT 1, "start_after" "text" DEFAULT ''::"text", "sort_order" "text" DEFAULT 'asc'::"text", "sort_column" "text" DEFAULT 'name'::"text", "sort_column_after" "text" DEFAULT ''::"text") RETURNS TABLE("key" "text", "name" "text", "id" "uuid", "updated_at" timestamp with time zone, "created_at" timestamp with time zone, "last_accessed_at" timestamp with time zone, "metadata" "jsonb")
    LANGUAGE "plpgsql" STABLE
    AS $_$
DECLARE
    sort_col text;
    sort_ord text;
    cursor_op text;
    cursor_expr text;
    sort_expr text;
BEGIN
    -- Validate sort_order
    sort_ord := lower(sort_order);
    IF sort_ord NOT IN ('asc', 'desc') THEN
        sort_ord := 'asc';
    END IF;

    -- Determine cursor comparison operator
    IF sort_ord = 'asc' THEN
        cursor_op := '>';
    ELSE
        cursor_op := '<';
    END IF;
    
    sort_col := lower(sort_column);
    -- Validate sort column  
    IF sort_col IN ('updated_at', 'created_at') THEN
        cursor_expr := format(
            '($5 = '''' OR ROW(date_trunc(''milliseconds'', %I), name COLLATE "C") %s ROW(COALESCE(NULLIF($6, '''')::timestamptz, ''epoch''::timestamptz), $5))',
            sort_col, cursor_op
        );
        sort_expr := format(
            'COALESCE(date_trunc(''milliseconds'', %I), ''epoch''::timestamptz) %s, name COLLATE "C" %s',
            sort_col, sort_ord, sort_ord
        );
    ELSE
        cursor_expr := format('($5 = '''' OR name COLLATE "C" %s $5)', cursor_op);
        sort_expr := format('name COLLATE "C" %s', sort_ord);
    END IF;

    RETURN QUERY EXECUTE format(
        $sql$
        SELECT * FROM (
            (
                SELECT
                    split_part(name, '/', $4) AS key,
                    name,
                    NULL::uuid AS id,
                    updated_at,
                    created_at,
                    NULL::timestamptz AS last_accessed_at,
                    NULL::jsonb AS metadata
                FROM storage.prefixes
                WHERE name COLLATE "C" LIKE $1 || '%%'
                    AND bucket_id = $2
                    AND level = $4
                    AND %s
                ORDER BY %s
                LIMIT $3
            )
            UNION ALL
            (
                SELECT
                    split_part(name, '/', $4) AS key,
                    name,
                    id,
                    updated_at,
                    created_at,
                    last_accessed_at,
                    metadata
                FROM storage.objects
                WHERE name COLLATE "C" LIKE $1 || '%%'
                    AND bucket_id = $2
                    AND level = $4
                    AND %s
                ORDER BY %s
                LIMIT $3
            )
        ) obj
        ORDER BY %s
        LIMIT $3
        $sql$,
        cursor_expr,    -- prefixes WHERE
        sort_expr,      -- prefixes ORDER BY
        cursor_expr,    -- objects WHERE
        sort_expr,      -- objects ORDER BY
        sort_expr       -- final ORDER BY
    )
    USING prefix, bucket_name, limits, levels, start_after, sort_column_after;
END;
$_$;


ALTER FUNCTION "storage"."search_v2"("prefix" "text", "bucket_name" "text", "limits" integer, "levels" integer, "start_after" "text", "sort_order" "text", "sort_column" "text", "sort_column_after" "text") OWNER TO "supabase_storage_admin";


CREATE OR REPLACE FUNCTION "storage"."update_updated_at_column"() RETURNS "trigger"
    LANGUAGE "plpgsql"
    AS $$
BEGIN
    NEW.updated_at = now();
    RETURN NEW; 
END;
$$;


ALTER FUNCTION "storage"."update_updated_at_column"() OWNER TO "supabase_storage_admin";

SET default_tablespace = '';

SET default_table_access_method = "heap";


CREATE TABLE IF NOT EXISTS "auth"."audit_log_entries" (
    "instance_id" "uuid",
    "id" "uuid" NOT NULL,
    "payload" json,
    "created_at" timestamp with time zone,
    "ip_address" character varying(64) DEFAULT ''::character varying NOT NULL
);


ALTER TABLE "auth"."audit_log_entries" OWNER TO "supabase_auth_admin";


COMMENT ON TABLE "auth"."audit_log_entries" IS 'Auth: Audit trail for user actions.';



CREATE TABLE IF NOT EXISTS "auth"."flow_state" (
    "id" "uuid" NOT NULL,
    "user_id" "uuid",
    "auth_code" "text" NOT NULL,
    "code_challenge_method" "auth"."code_challenge_method" NOT NULL,
    "code_challenge" "text" NOT NULL,
    "provider_type" "text" NOT NULL,
    "provider_access_token" "text",
    "provider_refresh_token" "text",
    "created_at" timestamp with time zone,
    "updated_at" timestamp with time zone,
    "authentication_method" "text" NOT NULL,
    "auth_code_issued_at" timestamp with time zone
);


ALTER TABLE "auth"."flow_state" OWNER TO "supabase_auth_admin";


COMMENT ON TABLE "auth"."flow_state" IS 'stores metadata for pkce logins';



CREATE TABLE IF NOT EXISTS "auth"."identities" (
    "provider_id" "text" NOT NULL,
    "user_id" "uuid" NOT NULL,
    "identity_data" "jsonb" NOT NULL,
    "provider" "text" NOT NULL,
    "last_sign_in_at" timestamp with time zone,
    "created_at" timestamp with time zone,
    "updated_at" timestamp with time zone,
    "email" "text" GENERATED ALWAYS AS ("lower"(("identity_data" ->> 'email'::"text"))) STORED,
    "id" "uuid" DEFAULT "gen_random_uuid"() NOT NULL
);


ALTER TABLE "auth"."identities" OWNER TO "supabase_auth_admin";


COMMENT ON TABLE "auth"."identities" IS 'Auth: Stores identities associated to a user.';



COMMENT ON COLUMN "auth"."identities"."email" IS 'Auth: Email is a generated column that references the optional email property in the identity_data';



CREATE TABLE IF NOT EXISTS "auth"."instances" (
    "id" "uuid" NOT NULL,
    "uuid" "uuid",
    "raw_base_config" "text",
    "created_at" timestamp with time zone,
    "updated_at" timestamp with time zone
);


ALTER TABLE "auth"."instances" OWNER TO "supabase_auth_admin";


COMMENT ON TABLE "auth"."instances" IS 'Auth: Manages users across multiple sites.';



CREATE TABLE IF NOT EXISTS "auth"."mfa_amr_claims" (
    "session_id" "uuid" NOT NULL,
    "created_at" timestamp with time zone NOT NULL,
    "updated_at" timestamp with time zone NOT NULL,
    "authentication_method" "text" NOT NULL,
    "id" "uuid" NOT NULL
);


ALTER TABLE "auth"."mfa_amr_claims" OWNER TO "supabase_auth_admin";


COMMENT ON TABLE "auth"."mfa_amr_claims" IS 'auth: stores authenticator method reference claims for multi factor authentication';



CREATE TABLE IF NOT EXISTS "auth"."mfa_challenges" (
    "id" "uuid" NOT NULL,
    "factor_id" "uuid" NOT NULL,
    "created_at" timestamp with time zone NOT NULL,
    "verified_at" timestamp with time zone,
    "ip_address" "inet" NOT NULL,
    "otp_code" "text",
    "web_authn_session_data" "jsonb"
);


ALTER TABLE "auth"."mfa_challenges" OWNER TO "supabase_auth_admin";


COMMENT ON TABLE "auth"."mfa_challenges" IS 'auth: stores metadata about challenge requests made';



CREATE TABLE IF NOT EXISTS "auth"."mfa_factors" (
    "id" "uuid" NOT NULL,
    "user_id" "uuid" NOT NULL,
    "friendly_name" "text",
    "factor_type" "auth"."factor_type" NOT NULL,
    "status" "auth"."factor_status" NOT NULL,
    "created_at" timestamp with time zone NOT NULL,
    "updated_at" timestamp with time zone NOT NULL,
    "secret" "text",
    "phone" "text",
    "last_challenged_at" timestamp with time zone,
    "web_authn_credential" "jsonb",
    "web_authn_aaguid" "uuid",
    "last_webauthn_challenge_data" "jsonb"
);


ALTER TABLE "auth"."mfa_factors" OWNER TO "supabase_auth_admin";


COMMENT ON TABLE "auth"."mfa_factors" IS 'auth: stores metadata about factors';



COMMENT ON COLUMN "auth"."mfa_factors"."last_webauthn_challenge_data" IS 'Stores the latest WebAuthn challenge data including attestation/assertion for customer verification';



CREATE TABLE IF NOT EXISTS "auth"."oauth_authorizations" (
    "id" "uuid" NOT NULL,
    "authorization_id" "text" NOT NULL,
    "client_id" "uuid" NOT NULL,
    "user_id" "uuid",
    "redirect_uri" "text" NOT NULL,
    "scope" "text" NOT NULL,
    "state" "text",
    "resource" "text",
    "code_challenge" "text",
    "code_challenge_method" "auth"."code_challenge_method",
    "response_type" "auth"."oauth_response_type" DEFAULT 'code'::"auth"."oauth_response_type" NOT NULL,
    "status" "auth"."oauth_authorization_status" DEFAULT 'pending'::"auth"."oauth_authorization_status" NOT NULL,
    "authorization_code" "text",
    "created_at" timestamp with time zone DEFAULT "now"() NOT NULL,
    "expires_at" timestamp with time zone DEFAULT ("now"() + '00:03:00'::interval) NOT NULL,
    "approved_at" timestamp with time zone,
    CONSTRAINT "oauth_authorizations_authorization_code_length" CHECK (("char_length"("authorization_code") <= 255)),
    CONSTRAINT "oauth_authorizations_code_challenge_length" CHECK (("char_length"("code_challenge") <= 128)),
    CONSTRAINT "oauth_authorizations_expires_at_future" CHECK (("expires_at" > "created_at")),
    CONSTRAINT "oauth_authorizations_redirect_uri_length" CHECK (("char_length"("redirect_uri") <= 2048)),
    CONSTRAINT "oauth_authorizations_resource_length" CHECK (("char_length"("resource") <= 2048)),
    CONSTRAINT "oauth_authorizations_scope_length" CHECK (("char_length"("scope") <= 4096)),
    CONSTRAINT "oauth_authorizations_state_length" CHECK (("char_length"("state") <= 4096))
);


ALTER TABLE "auth"."oauth_authorizations" OWNER TO "supabase_auth_admin";


CREATE TABLE IF NOT EXISTS "auth"."oauth_clients" (
    "id" "uuid" NOT NULL,
    "client_secret_hash" "text",
    "registration_type" "auth"."oauth_registration_type" NOT NULL,
    "redirect_uris" "text" NOT NULL,
    "grant_types" "text" NOT NULL,
    "client_name" "text",
    "client_uri" "text",
    "logo_uri" "text",
    "created_at" timestamp with time zone DEFAULT "now"() NOT NULL,
    "updated_at" timestamp with time zone DEFAULT "now"() NOT NULL,
    "deleted_at" timestamp with time zone,
    "client_type" "auth"."oauth_client_type" DEFAULT 'confidential'::"auth"."oauth_client_type" NOT NULL,
    CONSTRAINT "oauth_clients_client_name_length" CHECK (("char_length"("client_name") <= 1024)),
    CONSTRAINT "oauth_clients_client_uri_length" CHECK (("char_length"("client_uri") <= 2048)),
    CONSTRAINT "oauth_clients_logo_uri_length" CHECK (("char_length"("logo_uri") <= 2048))
);


ALTER TABLE "auth"."oauth_clients" OWNER TO "supabase_auth_admin";


CREATE TABLE IF NOT EXISTS "auth"."oauth_consents" (
    "id" "uuid" NOT NULL,
    "user_id" "uuid" NOT NULL,
    "client_id" "uuid" NOT NULL,
    "scopes" "text" NOT NULL,
    "granted_at" timestamp with time zone DEFAULT "now"() NOT NULL,
    "revoked_at" timestamp with time zone,
    CONSTRAINT "oauth_consents_revoked_after_granted" CHECK ((("revoked_at" IS NULL) OR ("revoked_at" >= "granted_at"))),
    CONSTRAINT "oauth_consents_scopes_length" CHECK (("char_length"("scopes") <= 2048)),
    CONSTRAINT "oauth_consents_scopes_not_empty" CHECK (("char_length"(TRIM(BOTH FROM "scopes")) > 0))
);


ALTER TABLE "auth"."oauth_consents" OWNER TO "supabase_auth_admin";


CREATE TABLE IF NOT EXISTS "auth"."one_time_tokens" (
    "id" "uuid" NOT NULL,
    "user_id" "uuid" NOT NULL,
    "token_type" "auth"."one_time_token_type" NOT NULL,
    "token_hash" "text" NOT NULL,
    "relates_to" "text" NOT NULL,
    "created_at" timestamp without time zone DEFAULT "now"() NOT NULL,
    "updated_at" timestamp without time zone DEFAULT "now"() NOT NULL,
    CONSTRAINT "one_time_tokens_token_hash_check" CHECK (("char_length"("token_hash") > 0))
);


ALTER TABLE "auth"."one_time_tokens" OWNER TO "supabase_auth_admin";


CREATE TABLE IF NOT EXISTS "auth"."refresh_tokens" (
    "instance_id" "uuid",
    "id" bigint NOT NULL,
    "token" character varying(255),
    "user_id" character varying(255),
    "revoked" boolean,
    "created_at" timestamp with time zone,
    "updated_at" timestamp with time zone,
    "parent" character varying(255),
    "session_id" "uuid"
);


ALTER TABLE "auth"."refresh_tokens" OWNER TO "supabase_auth_admin";


COMMENT ON TABLE "auth"."refresh_tokens" IS 'Auth: Store of tokens used to refresh JWT tokens once they expire.';



CREATE SEQUENCE IF NOT EXISTS "auth"."refresh_tokens_id_seq"
    START WITH 1
    INCREMENT BY 1
    NO MINVALUE
    NO MAXVALUE
    CACHE 1;


ALTER SEQUENCE "auth"."refresh_tokens_id_seq" OWNER TO "supabase_auth_admin";


ALTER SEQUENCE "auth"."refresh_tokens_id_seq" OWNED BY "auth"."refresh_tokens"."id";



CREATE TABLE IF NOT EXISTS "auth"."saml_providers" (
    "id" "uuid" NOT NULL,
    "sso_provider_id" "uuid" NOT NULL,
    "entity_id" "text" NOT NULL,
    "metadata_xml" "text" NOT NULL,
    "metadata_url" "text",
    "attribute_mapping" "jsonb",
    "created_at" timestamp with time zone,
    "updated_at" timestamp with time zone,
    "name_id_format" "text",
    CONSTRAINT "entity_id not empty" CHECK (("char_length"("entity_id") > 0)),
    CONSTRAINT "metadata_url not empty" CHECK ((("metadata_url" = NULL::"text") OR ("char_length"("metadata_url") > 0))),
    CONSTRAINT "metadata_xml not empty" CHECK (("char_length"("metadata_xml") > 0))
);


ALTER TABLE "auth"."saml_providers" OWNER TO "supabase_auth_admin";


COMMENT ON TABLE "auth"."saml_providers" IS 'Auth: Manages SAML Identity Provider connections.';



CREATE TABLE IF NOT EXISTS "auth"."saml_relay_states" (
    "id" "uuid" NOT NULL,
    "sso_provider_id" "uuid" NOT NULL,
    "request_id" "text" NOT NULL,
    "for_email" "text",
    "redirect_to" "text",
    "created_at" timestamp with time zone,
    "updated_at" timestamp with time zone,
    "flow_state_id" "uuid",
    CONSTRAINT "request_id not empty" CHECK (("char_length"("request_id") > 0))
);


ALTER TABLE "auth"."saml_relay_states" OWNER TO "supabase_auth_admin";


COMMENT ON TABLE "auth"."saml_relay_states" IS 'Auth: Contains SAML Relay State information for each Service Provider initiated login.';



CREATE TABLE IF NOT EXISTS "auth"."schema_migrations" (
    "version" character varying(255) NOT NULL
);


ALTER TABLE "auth"."schema_migrations" OWNER TO "supabase_auth_admin";


COMMENT ON TABLE "auth"."schema_migrations" IS 'Auth: Manages updates to the auth system.';



CREATE TABLE IF NOT EXISTS "auth"."sessions" (
    "id" "uuid" NOT NULL,
    "user_id" "uuid" NOT NULL,
    "created_at" timestamp with time zone,
    "updated_at" timestamp with time zone,
    "factor_id" "uuid",
    "aal" "auth"."aal_level",
    "not_after" timestamp with time zone,
    "refreshed_at" timestamp without time zone,
    "user_agent" "text",
    "ip" "inet",
    "tag" "text",
    "oauth_client_id" "uuid",
    "refresh_token_hmac_key" "text",
    "refresh_token_counter" bigint
);


ALTER TABLE "auth"."sessions" OWNER TO "supabase_auth_admin";


COMMENT ON TABLE "auth"."sessions" IS 'Auth: Stores session data associated to a user.';



COMMENT ON COLUMN "auth"."sessions"."not_after" IS 'Auth: Not after is a nullable column that contains a timestamp after which the session should be regarded as expired.';



COMMENT ON COLUMN "auth"."sessions"."refresh_token_hmac_key" IS 'Holds a HMAC-SHA256 key used to sign refresh tokens for this session.';



COMMENT ON COLUMN "auth"."sessions"."refresh_token_counter" IS 'Holds the ID (counter) of the last issued refresh token.';



CREATE TABLE IF NOT EXISTS "auth"."sso_domains" (
    "id" "uuid" NOT NULL,
    "sso_provider_id" "uuid" NOT NULL,
    "domain" "text" NOT NULL,
    "created_at" timestamp with time zone,
    "updated_at" timestamp with time zone,
    CONSTRAINT "domain not empty" CHECK (("char_length"("domain") > 0))
);


ALTER TABLE "auth"."sso_domains" OWNER TO "supabase_auth_admin";


COMMENT ON TABLE "auth"."sso_domains" IS 'Auth: Manages SSO email address domain mapping to an SSO Identity Provider.';



CREATE TABLE IF NOT EXISTS "auth"."sso_providers" (
    "id" "uuid" NOT NULL,
    "resource_id" "text",
    "created_at" timestamp with time zone,
    "updated_at" timestamp with time zone,
    "disabled" boolean,
    CONSTRAINT "resource_id not empty" CHECK ((("resource_id" = NULL::"text") OR ("char_length"("resource_id") > 0)))
);


ALTER TABLE "auth"."sso_providers" OWNER TO "supabase_auth_admin";


COMMENT ON TABLE "auth"."sso_providers" IS 'Auth: Manages SSO identity provider information; see saml_providers for SAML.';



COMMENT ON COLUMN "auth"."sso_providers"."resource_id" IS 'Auth: Uniquely identifies a SSO provider according to a user-chosen resource ID (case insensitive), useful in infrastructure as code.';



CREATE TABLE IF NOT EXISTS "auth"."users" (
    "instance_id" "uuid",
    "id" "uuid" NOT NULL,
    "aud" character varying(255),
    "role" character varying(255),
    "email" character varying(255),
    "encrypted_password" character varying(255),
    "email_confirmed_at" timestamp with time zone,
    "invited_at" timestamp with time zone,
    "confirmation_token" character varying(255),
    "confirmation_sent_at" timestamp with time zone,
    "recovery_token" character varying(255),
    "recovery_sent_at" timestamp with time zone,
    "email_change_token_new" character varying(255),
    "email_change" character varying(255),
    "email_change_sent_at" timestamp with time zone,
    "last_sign_in_at" timestamp with time zone,
    "raw_app_meta_data" "jsonb",
    "raw_user_meta_data" "jsonb",
    "is_super_admin" boolean,
    "created_at" timestamp with time zone,
    "updated_at" timestamp with time zone,
    "phone" "text" DEFAULT NULL::character varying,
    "phone_confirmed_at" timestamp with time zone,
    "phone_change" "text" DEFAULT ''::character varying,
    "phone_change_token" character varying(255) DEFAULT ''::character varying,
    "phone_change_sent_at" timestamp with time zone,
    "confirmed_at" timestamp with time zone GENERATED ALWAYS AS (LEAST("email_confirmed_at", "phone_confirmed_at")) STORED,
    "email_change_token_current" character varying(255) DEFAULT ''::character varying,
    "email_change_confirm_status" smallint DEFAULT 0,
    "banned_until" timestamp with time zone,
    "reauthentication_token" character varying(255) DEFAULT ''::character varying,
    "reauthentication_sent_at" timestamp with time zone,
    "is_sso_user" boolean DEFAULT false NOT NULL,
    "deleted_at" timestamp with time zone,
    "is_anonymous" boolean DEFAULT false NOT NULL,
    CONSTRAINT "users_email_change_confirm_status_check" CHECK ((("email_change_confirm_status" >= 0) AND ("email_change_confirm_status" <= 2)))
);


ALTER TABLE "auth"."users" OWNER TO "supabase_auth_admin";


COMMENT ON TABLE "auth"."users" IS 'Auth: Stores user login data within a secure schema.';



COMMENT ON COLUMN "auth"."users"."is_sso_user" IS 'Auth: Set this column to true when the account comes from SSO. These accounts can have duplicate emails.';



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
    CONSTRAINT "avatar_cache_processing_status_check" CHECK (("processing_status" = ANY (ARRAY['pending'::"text", 'processing'::"text", 'completed'::"text", 'failed'::"text"])))
);


ALTER TABLE "public"."avatar_cache" OWNER TO "postgres";


COMMENT ON TABLE "public"."avatar_cache" IS 'Stores avatar generation cache. Supports preview avatars (character_profile_id IS NULL) with a 1-hour access window for the creating user. Preview avatars should be linked to a character or cleaned up within this window.';



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
    CONSTRAINT "descriptors_attribute_attribute_type_check" CHECK (("attribute_type" = ANY (ARRAY['hair'::"text", 'eyes'::"text", 'skin'::"text", 'body'::"text", 'hair_length'::"text", 'glasses'::"text", 'pet_color'::"text"])))
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
    "deleted_at"
   FROM "public"."content"
  WHERE (("content_type" = 'story'::"text") AND ("deleted_at" IS NULL));


ALTER VIEW "public"."stories" OWNER TO "postgres";


COMMENT ON VIEW "public"."stories" IS 'View of content table filtered to active stories only';



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



CREATE TABLE IF NOT EXISTS "storage"."buckets" (
    "id" "text" NOT NULL,
    "name" "text" NOT NULL,
    "owner" "uuid",
    "created_at" timestamp with time zone DEFAULT "now"(),
    "updated_at" timestamp with time zone DEFAULT "now"(),
    "public" boolean DEFAULT false,
    "avif_autodetection" boolean DEFAULT false,
    "file_size_limit" bigint,
    "allowed_mime_types" "text"[],
    "owner_id" "text",
    "type" "storage"."buckettype" DEFAULT 'STANDARD'::"storage"."buckettype" NOT NULL
);


ALTER TABLE "storage"."buckets" OWNER TO "supabase_storage_admin";


COMMENT ON COLUMN "storage"."buckets"."owner" IS 'Field is deprecated, use owner_id instead';



CREATE TABLE IF NOT EXISTS "storage"."buckets_analytics" (
    "id" "text" NOT NULL,
    "type" "storage"."buckettype" DEFAULT 'ANALYTICS'::"storage"."buckettype" NOT NULL,
    "format" "text" DEFAULT 'ICEBERG'::"text" NOT NULL,
    "created_at" timestamp with time zone DEFAULT "now"() NOT NULL,
    "updated_at" timestamp with time zone DEFAULT "now"() NOT NULL
);


ALTER TABLE "storage"."buckets_analytics" OWNER TO "supabase_storage_admin";


CREATE TABLE IF NOT EXISTS "storage"."migrations" (
    "id" integer NOT NULL,
    "name" character varying(100) NOT NULL,
    "hash" character varying(40) NOT NULL,
    "executed_at" timestamp without time zone DEFAULT CURRENT_TIMESTAMP
);


ALTER TABLE "storage"."migrations" OWNER TO "supabase_storage_admin";


CREATE TABLE IF NOT EXISTS "storage"."objects" (
    "id" "uuid" DEFAULT "gen_random_uuid"() NOT NULL,
    "bucket_id" "text",
    "name" "text",
    "owner" "uuid",
    "created_at" timestamp with time zone DEFAULT "now"(),
    "updated_at" timestamp with time zone DEFAULT "now"(),
    "last_accessed_at" timestamp with time zone DEFAULT "now"(),
    "metadata" "jsonb",
    "path_tokens" "text"[] GENERATED ALWAYS AS ("string_to_array"("name", '/'::"text")) STORED,
    "version" "text",
    "owner_id" "text",
    "user_metadata" "jsonb",
    "level" integer
);


ALTER TABLE "storage"."objects" OWNER TO "supabase_storage_admin";


COMMENT ON COLUMN "storage"."objects"."owner" IS 'Field is deprecated, use owner_id instead';



CREATE TABLE IF NOT EXISTS "storage"."prefixes" (
    "bucket_id" "text" NOT NULL,
    "name" "text" NOT NULL COLLATE "pg_catalog"."C",
    "level" integer GENERATED ALWAYS AS ("storage"."get_level"("name")) STORED NOT NULL,
    "created_at" timestamp with time zone DEFAULT "now"(),
    "updated_at" timestamp with time zone DEFAULT "now"()
);


ALTER TABLE "storage"."prefixes" OWNER TO "supabase_storage_admin";


CREATE TABLE IF NOT EXISTS "storage"."s3_multipart_uploads" (
    "id" "text" NOT NULL,
    "in_progress_size" bigint DEFAULT 0 NOT NULL,
    "upload_signature" "text" NOT NULL,
    "bucket_id" "text" NOT NULL,
    "key" "text" NOT NULL COLLATE "pg_catalog"."C",
    "version" "text" NOT NULL,
    "owner_id" "text",
    "created_at" timestamp with time zone DEFAULT "now"() NOT NULL,
    "user_metadata" "jsonb"
);


ALTER TABLE "storage"."s3_multipart_uploads" OWNER TO "supabase_storage_admin";


CREATE TABLE IF NOT EXISTS "storage"."s3_multipart_uploads_parts" (
    "id" "uuid" DEFAULT "gen_random_uuid"() NOT NULL,
    "upload_id" "text" NOT NULL,
    "size" bigint DEFAULT 0 NOT NULL,
    "part_number" integer NOT NULL,
    "bucket_id" "text" NOT NULL,
    "key" "text" NOT NULL COLLATE "pg_catalog"."C",
    "etag" "text" NOT NULL,
    "owner_id" "text",
    "version" "text" NOT NULL,
    "created_at" timestamp with time zone DEFAULT "now"() NOT NULL
);


ALTER TABLE "storage"."s3_multipart_uploads_parts" OWNER TO "supabase_storage_admin";


ALTER TABLE ONLY "auth"."refresh_tokens" ALTER COLUMN "id" SET DEFAULT "nextval"('"auth"."refresh_tokens_id_seq"'::"regclass");



ALTER TABLE ONLY "auth"."mfa_amr_claims"
    ADD CONSTRAINT "amr_id_pk" PRIMARY KEY ("id");



ALTER TABLE ONLY "auth"."audit_log_entries"
    ADD CONSTRAINT "audit_log_entries_pkey" PRIMARY KEY ("id");



ALTER TABLE ONLY "auth"."flow_state"
    ADD CONSTRAINT "flow_state_pkey" PRIMARY KEY ("id");



ALTER TABLE ONLY "auth"."identities"
    ADD CONSTRAINT "identities_pkey" PRIMARY KEY ("id");



ALTER TABLE ONLY "auth"."identities"
    ADD CONSTRAINT "identities_provider_id_provider_unique" UNIQUE ("provider_id", "provider");



ALTER TABLE ONLY "auth"."instances"
    ADD CONSTRAINT "instances_pkey" PRIMARY KEY ("id");



ALTER TABLE ONLY "auth"."mfa_amr_claims"
    ADD CONSTRAINT "mfa_amr_claims_session_id_authentication_method_pkey" UNIQUE ("session_id", "authentication_method");



ALTER TABLE ONLY "auth"."mfa_challenges"
    ADD CONSTRAINT "mfa_challenges_pkey" PRIMARY KEY ("id");



ALTER TABLE ONLY "auth"."mfa_factors"
    ADD CONSTRAINT "mfa_factors_last_challenged_at_key" UNIQUE ("last_challenged_at");



ALTER TABLE ONLY "auth"."mfa_factors"
    ADD CONSTRAINT "mfa_factors_pkey" PRIMARY KEY ("id");



ALTER TABLE ONLY "auth"."oauth_authorizations"
    ADD CONSTRAINT "oauth_authorizations_authorization_code_key" UNIQUE ("authorization_code");



ALTER TABLE ONLY "auth"."oauth_authorizations"
    ADD CONSTRAINT "oauth_authorizations_authorization_id_key" UNIQUE ("authorization_id");



ALTER TABLE ONLY "auth"."oauth_authorizations"
    ADD CONSTRAINT "oauth_authorizations_pkey" PRIMARY KEY ("id");



ALTER TABLE ONLY "auth"."oauth_clients"
    ADD CONSTRAINT "oauth_clients_pkey" PRIMARY KEY ("id");



ALTER TABLE ONLY "auth"."oauth_consents"
    ADD CONSTRAINT "oauth_consents_pkey" PRIMARY KEY ("id");



ALTER TABLE ONLY "auth"."oauth_consents"
    ADD CONSTRAINT "oauth_consents_user_client_unique" UNIQUE ("user_id", "client_id");



ALTER TABLE ONLY "auth"."one_time_tokens"
    ADD CONSTRAINT "one_time_tokens_pkey" PRIMARY KEY ("id");



ALTER TABLE ONLY "auth"."refresh_tokens"
    ADD CONSTRAINT "refresh_tokens_pkey" PRIMARY KEY ("id");



ALTER TABLE ONLY "auth"."refresh_tokens"
    ADD CONSTRAINT "refresh_tokens_token_unique" UNIQUE ("token");



ALTER TABLE ONLY "auth"."saml_providers"
    ADD CONSTRAINT "saml_providers_entity_id_key" UNIQUE ("entity_id");



ALTER TABLE ONLY "auth"."saml_providers"
    ADD CONSTRAINT "saml_providers_pkey" PRIMARY KEY ("id");



ALTER TABLE ONLY "auth"."saml_relay_states"
    ADD CONSTRAINT "saml_relay_states_pkey" PRIMARY KEY ("id");



ALTER TABLE ONLY "auth"."schema_migrations"
    ADD CONSTRAINT "schema_migrations_pkey" PRIMARY KEY ("version");



ALTER TABLE ONLY "auth"."sessions"
    ADD CONSTRAINT "sessions_pkey" PRIMARY KEY ("id");



ALTER TABLE ONLY "auth"."sso_domains"
    ADD CONSTRAINT "sso_domains_pkey" PRIMARY KEY ("id");



ALTER TABLE ONLY "auth"."sso_providers"
    ADD CONSTRAINT "sso_providers_pkey" PRIMARY KEY ("id");



ALTER TABLE ONLY "auth"."users"
    ADD CONSTRAINT "users_phone_key" UNIQUE ("phone");



ALTER TABLE ONLY "auth"."users"
    ADD CONSTRAINT "users_pkey" PRIMARY KEY ("id");



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



ALTER TABLE ONLY "storage"."buckets_analytics"
    ADD CONSTRAINT "buckets_analytics_pkey" PRIMARY KEY ("id");



ALTER TABLE ONLY "storage"."buckets"
    ADD CONSTRAINT "buckets_pkey" PRIMARY KEY ("id");



ALTER TABLE ONLY "storage"."migrations"
    ADD CONSTRAINT "migrations_name_key" UNIQUE ("name");



ALTER TABLE ONLY "storage"."migrations"
    ADD CONSTRAINT "migrations_pkey" PRIMARY KEY ("id");



ALTER TABLE ONLY "storage"."objects"
    ADD CONSTRAINT "objects_pkey" PRIMARY KEY ("id");



ALTER TABLE ONLY "storage"."prefixes"
    ADD CONSTRAINT "prefixes_pkey" PRIMARY KEY ("bucket_id", "level", "name");



ALTER TABLE ONLY "storage"."s3_multipart_uploads_parts"
    ADD CONSTRAINT "s3_multipart_uploads_parts_pkey" PRIMARY KEY ("id");



ALTER TABLE ONLY "storage"."s3_multipart_uploads"
    ADD CONSTRAINT "s3_multipart_uploads_pkey" PRIMARY KEY ("id");



CREATE INDEX "audit_logs_instance_id_idx" ON "auth"."audit_log_entries" USING "btree" ("instance_id");



CREATE UNIQUE INDEX "confirmation_token_idx" ON "auth"."users" USING "btree" ("confirmation_token") WHERE (("confirmation_token")::"text" !~ '^[0-9 ]*$'::"text");



CREATE UNIQUE INDEX "email_change_token_current_idx" ON "auth"."users" USING "btree" ("email_change_token_current") WHERE (("email_change_token_current")::"text" !~ '^[0-9 ]*$'::"text");



CREATE UNIQUE INDEX "email_change_token_new_idx" ON "auth"."users" USING "btree" ("email_change_token_new") WHERE (("email_change_token_new")::"text" !~ '^[0-9 ]*$'::"text");



CREATE INDEX "factor_id_created_at_idx" ON "auth"."mfa_factors" USING "btree" ("user_id", "created_at");



CREATE INDEX "flow_state_created_at_idx" ON "auth"."flow_state" USING "btree" ("created_at" DESC);



CREATE INDEX "identities_email_idx" ON "auth"."identities" USING "btree" ("email" "text_pattern_ops");



COMMENT ON INDEX "auth"."identities_email_idx" IS 'Auth: Ensures indexed queries on the email column';



CREATE INDEX "identities_user_id_idx" ON "auth"."identities" USING "btree" ("user_id");



CREATE INDEX "idx_auth_code" ON "auth"."flow_state" USING "btree" ("auth_code");



CREATE INDEX "idx_user_id_auth_method" ON "auth"."flow_state" USING "btree" ("user_id", "authentication_method");



CREATE INDEX "mfa_challenge_created_at_idx" ON "auth"."mfa_challenges" USING "btree" ("created_at" DESC);



CREATE UNIQUE INDEX "mfa_factors_user_friendly_name_unique" ON "auth"."mfa_factors" USING "btree" ("friendly_name", "user_id") WHERE (TRIM(BOTH FROM "friendly_name") <> ''::"text");



CREATE INDEX "mfa_factors_user_id_idx" ON "auth"."mfa_factors" USING "btree" ("user_id");



CREATE INDEX "oauth_auth_pending_exp_idx" ON "auth"."oauth_authorizations" USING "btree" ("expires_at") WHERE ("status" = 'pending'::"auth"."oauth_authorization_status");



CREATE INDEX "oauth_clients_deleted_at_idx" ON "auth"."oauth_clients" USING "btree" ("deleted_at");



CREATE INDEX "oauth_consents_active_client_idx" ON "auth"."oauth_consents" USING "btree" ("client_id") WHERE ("revoked_at" IS NULL);



CREATE INDEX "oauth_consents_active_user_client_idx" ON "auth"."oauth_consents" USING "btree" ("user_id", "client_id") WHERE ("revoked_at" IS NULL);



CREATE INDEX "oauth_consents_user_order_idx" ON "auth"."oauth_consents" USING "btree" ("user_id", "granted_at" DESC);



CREATE INDEX "one_time_tokens_relates_to_hash_idx" ON "auth"."one_time_tokens" USING "hash" ("relates_to");



CREATE INDEX "one_time_tokens_token_hash_hash_idx" ON "auth"."one_time_tokens" USING "hash" ("token_hash");



CREATE UNIQUE INDEX "one_time_tokens_user_id_token_type_key" ON "auth"."one_time_tokens" USING "btree" ("user_id", "token_type");



CREATE UNIQUE INDEX "reauthentication_token_idx" ON "auth"."users" USING "btree" ("reauthentication_token") WHERE (("reauthentication_token")::"text" !~ '^[0-9 ]*$'::"text");



CREATE UNIQUE INDEX "recovery_token_idx" ON "auth"."users" USING "btree" ("recovery_token") WHERE (("recovery_token")::"text" !~ '^[0-9 ]*$'::"text");



CREATE INDEX "refresh_tokens_instance_id_idx" ON "auth"."refresh_tokens" USING "btree" ("instance_id");



CREATE INDEX "refresh_tokens_instance_id_user_id_idx" ON "auth"."refresh_tokens" USING "btree" ("instance_id", "user_id");



CREATE INDEX "refresh_tokens_parent_idx" ON "auth"."refresh_tokens" USING "btree" ("parent");



CREATE INDEX "refresh_tokens_session_id_revoked_idx" ON "auth"."refresh_tokens" USING "btree" ("session_id", "revoked");



CREATE INDEX "refresh_tokens_updated_at_idx" ON "auth"."refresh_tokens" USING "btree" ("updated_at" DESC);



CREATE INDEX "saml_providers_sso_provider_id_idx" ON "auth"."saml_providers" USING "btree" ("sso_provider_id");



CREATE INDEX "saml_relay_states_created_at_idx" ON "auth"."saml_relay_states" USING "btree" ("created_at" DESC);



CREATE INDEX "saml_relay_states_for_email_idx" ON "auth"."saml_relay_states" USING "btree" ("for_email");



CREATE INDEX "saml_relay_states_sso_provider_id_idx" ON "auth"."saml_relay_states" USING "btree" ("sso_provider_id");



CREATE INDEX "sessions_not_after_idx" ON "auth"."sessions" USING "btree" ("not_after" DESC);



CREATE INDEX "sessions_oauth_client_id_idx" ON "auth"."sessions" USING "btree" ("oauth_client_id");



CREATE INDEX "sessions_user_id_idx" ON "auth"."sessions" USING "btree" ("user_id");



CREATE UNIQUE INDEX "sso_domains_domain_idx" ON "auth"."sso_domains" USING "btree" ("lower"("domain"));



CREATE INDEX "sso_domains_sso_provider_id_idx" ON "auth"."sso_domains" USING "btree" ("sso_provider_id");



CREATE UNIQUE INDEX "sso_providers_resource_id_idx" ON "auth"."sso_providers" USING "btree" ("lower"("resource_id"));



CREATE INDEX "sso_providers_resource_id_pattern_idx" ON "auth"."sso_providers" USING "btree" ("resource_id" "text_pattern_ops");



CREATE UNIQUE INDEX "unique_phone_factor_per_user" ON "auth"."mfa_factors" USING "btree" ("user_id", "phone");



CREATE INDEX "user_id_created_at_idx" ON "auth"."sessions" USING "btree" ("user_id", "created_at");



CREATE UNIQUE INDEX "users_email_partial_key" ON "auth"."users" USING "btree" ("email") WHERE ("is_sso_user" = false);



COMMENT ON INDEX "auth"."users_email_partial_key" IS 'Auth: A partial unique index that applies only when is_sso_user is false';



CREATE INDEX "users_instance_id_email_idx" ON "auth"."users" USING "btree" ("instance_id", "lower"(("email")::"text"));



CREATE INDEX "users_instance_id_idx" ON "auth"."users" USING "btree" ("instance_id");



CREATE INDEX "users_is_anonymous_idx" ON "auth"."users" USING "btree" ("is_anonymous");



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



CREATE UNIQUE INDEX "bname" ON "storage"."buckets" USING "btree" ("name");



CREATE UNIQUE INDEX "bucketid_objname" ON "storage"."objects" USING "btree" ("bucket_id", "name");



CREATE INDEX "idx_multipart_uploads_list" ON "storage"."s3_multipart_uploads" USING "btree" ("bucket_id", "key", "created_at");



CREATE UNIQUE INDEX "idx_name_bucket_level_unique" ON "storage"."objects" USING "btree" ("name" COLLATE "C", "bucket_id", "level");



CREATE INDEX "idx_objects_bucket_id_name" ON "storage"."objects" USING "btree" ("bucket_id", "name" COLLATE "C");



CREATE INDEX "idx_objects_lower_name" ON "storage"."objects" USING "btree" (("path_tokens"["level"]), "lower"("name") "text_pattern_ops", "bucket_id", "level");



CREATE INDEX "idx_prefixes_lower_name" ON "storage"."prefixes" USING "btree" ("bucket_id", "level", (("string_to_array"("name", '/'::"text"))["level"]), "lower"("name") "text_pattern_ops");



CREATE INDEX "name_prefix_search" ON "storage"."objects" USING "btree" ("name" "text_pattern_ops");



CREATE UNIQUE INDEX "objects_bucket_id_level_idx" ON "storage"."objects" USING "btree" ("bucket_id", "level", "name" COLLATE "C");



CREATE OR REPLACE TRIGGER "on_auth_user_created" AFTER INSERT ON "auth"."users" FOR EACH ROW EXECUTE FUNCTION "public"."handle_new_user"();



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



CREATE OR REPLACE TRIGGER "enforce_bucket_name_length_trigger" BEFORE INSERT OR UPDATE OF "name" ON "storage"."buckets" FOR EACH ROW EXECUTE FUNCTION "storage"."enforce_bucket_name_length"();



CREATE OR REPLACE TRIGGER "objects_delete_delete_prefix" AFTER DELETE ON "storage"."objects" FOR EACH ROW EXECUTE FUNCTION "storage"."delete_prefix_hierarchy_trigger"();



CREATE OR REPLACE TRIGGER "objects_insert_create_prefix" BEFORE INSERT ON "storage"."objects" FOR EACH ROW EXECUTE FUNCTION "storage"."objects_insert_prefix_trigger"();



CREATE OR REPLACE TRIGGER "objects_update_create_prefix" BEFORE UPDATE ON "storage"."objects" FOR EACH ROW WHEN ((("new"."name" <> "old"."name") OR ("new"."bucket_id" <> "old"."bucket_id"))) EXECUTE FUNCTION "storage"."objects_update_prefix_trigger"();



CREATE OR REPLACE TRIGGER "prefixes_create_hierarchy" BEFORE INSERT ON "storage"."prefixes" FOR EACH ROW WHEN (("pg_trigger_depth"() < 1)) EXECUTE FUNCTION "storage"."prefixes_insert_trigger"();



CREATE OR REPLACE TRIGGER "prefixes_delete_hierarchy" AFTER DELETE ON "storage"."prefixes" FOR EACH ROW EXECUTE FUNCTION "storage"."delete_prefix_hierarchy_trigger"();



CREATE OR REPLACE TRIGGER "update_objects_updated_at" BEFORE UPDATE ON "storage"."objects" FOR EACH ROW EXECUTE FUNCTION "storage"."update_updated_at_column"();



ALTER TABLE ONLY "auth"."identities"
    ADD CONSTRAINT "identities_user_id_fkey" FOREIGN KEY ("user_id") REFERENCES "auth"."users"("id") ON DELETE CASCADE;



ALTER TABLE ONLY "auth"."mfa_amr_claims"
    ADD CONSTRAINT "mfa_amr_claims_session_id_fkey" FOREIGN KEY ("session_id") REFERENCES "auth"."sessions"("id") ON DELETE CASCADE;



ALTER TABLE ONLY "auth"."mfa_challenges"
    ADD CONSTRAINT "mfa_challenges_auth_factor_id_fkey" FOREIGN KEY ("factor_id") REFERENCES "auth"."mfa_factors"("id") ON DELETE CASCADE;



ALTER TABLE ONLY "auth"."mfa_factors"
    ADD CONSTRAINT "mfa_factors_user_id_fkey" FOREIGN KEY ("user_id") REFERENCES "auth"."users"("id") ON DELETE CASCADE;



ALTER TABLE ONLY "auth"."oauth_authorizations"
    ADD CONSTRAINT "oauth_authorizations_client_id_fkey" FOREIGN KEY ("client_id") REFERENCES "auth"."oauth_clients"("id") ON DELETE CASCADE;



ALTER TABLE ONLY "auth"."oauth_authorizations"
    ADD CONSTRAINT "oauth_authorizations_user_id_fkey" FOREIGN KEY ("user_id") REFERENCES "auth"."users"("id") ON DELETE CASCADE;



ALTER TABLE ONLY "auth"."oauth_consents"
    ADD CONSTRAINT "oauth_consents_client_id_fkey" FOREIGN KEY ("client_id") REFERENCES "auth"."oauth_clients"("id") ON DELETE CASCADE;



ALTER TABLE ONLY "auth"."oauth_consents"
    ADD CONSTRAINT "oauth_consents_user_id_fkey" FOREIGN KEY ("user_id") REFERENCES "auth"."users"("id") ON DELETE CASCADE;



ALTER TABLE ONLY "auth"."one_time_tokens"
    ADD CONSTRAINT "one_time_tokens_user_id_fkey" FOREIGN KEY ("user_id") REFERENCES "auth"."users"("id") ON DELETE CASCADE;



ALTER TABLE ONLY "auth"."refresh_tokens"
    ADD CONSTRAINT "refresh_tokens_session_id_fkey" FOREIGN KEY ("session_id") REFERENCES "auth"."sessions"("id") ON DELETE CASCADE;



ALTER TABLE ONLY "auth"."saml_providers"
    ADD CONSTRAINT "saml_providers_sso_provider_id_fkey" FOREIGN KEY ("sso_provider_id") REFERENCES "auth"."sso_providers"("id") ON DELETE CASCADE;



ALTER TABLE ONLY "auth"."saml_relay_states"
    ADD CONSTRAINT "saml_relay_states_flow_state_id_fkey" FOREIGN KEY ("flow_state_id") REFERENCES "auth"."flow_state"("id") ON DELETE CASCADE;



ALTER TABLE ONLY "auth"."saml_relay_states"
    ADD CONSTRAINT "saml_relay_states_sso_provider_id_fkey" FOREIGN KEY ("sso_provider_id") REFERENCES "auth"."sso_providers"("id") ON DELETE CASCADE;



ALTER TABLE ONLY "auth"."sessions"
    ADD CONSTRAINT "sessions_oauth_client_id_fkey" FOREIGN KEY ("oauth_client_id") REFERENCES "auth"."oauth_clients"("id") ON DELETE CASCADE;



ALTER TABLE ONLY "auth"."sessions"
    ADD CONSTRAINT "sessions_user_id_fkey" FOREIGN KEY ("user_id") REFERENCES "auth"."users"("id") ON DELETE CASCADE;



ALTER TABLE ONLY "auth"."sso_domains"
    ADD CONSTRAINT "sso_domains_sso_provider_id_fkey" FOREIGN KEY ("sso_provider_id") REFERENCES "auth"."sso_providers"("id") ON DELETE CASCADE;



ALTER TABLE ONLY "public"."api_cost_logs"
    ADD CONSTRAINT "api_cost_logs_character_profile_id_fkey" FOREIGN KEY ("character_profile_id") REFERENCES "public"."character_profiles"("id") ON DELETE SET NULL;



ALTER TABLE ONLY "public"."api_cost_logs"
    ADD CONSTRAINT "api_cost_logs_content_id_fkey" FOREIGN KEY ("content_id") REFERENCES "public"."content"("id") ON DELETE SET NULL;



ALTER TABLE ONLY "public"."api_cost_logs"
    ADD CONSTRAINT "api_cost_logs_user_id_fkey" FOREIGN KEY ("user_id") REFERENCES "auth"."users"("id") ON DELETE SET NULL;



ALTER TABLE ONLY "public"."avatar_cache"
    ADD CONSTRAINT "avatar_cache_ai_config_id_fkey" FOREIGN KEY ("ai_config_id") REFERENCES "public"."ai_configs"("id");



ALTER TABLE ONLY "public"."avatar_cache"
    ADD CONSTRAINT "avatar_cache_character_profile_id_fkey" FOREIGN KEY ("character_profile_id") REFERENCES "public"."character_profiles"("id") ON DELETE CASCADE;



ALTER TABLE ONLY "public"."character_profiles"
    ADD CONSTRAINT "character_profiles_avatar_cache_id_fkey" FOREIGN KEY ("avatar_cache_id") REFERENCES "public"."avatar_cache"("id") ON DELETE SET NULL;



ALTER TABLE ONLY "public"."character_profiles"
    ADD CONSTRAINT "character_profiles_user_id_fkey" FOREIGN KEY ("user_id") REFERENCES "auth"."users"("id") ON DELETE CASCADE;



ALTER TABLE ONLY "public"."content_characters"
    ADD CONSTRAINT "content_characters_character_profile_id_fkey" FOREIGN KEY ("character_profile_id") REFERENCES "public"."character_profiles"("id") ON DELETE SET NULL;



ALTER TABLE ONLY "public"."content_characters"
    ADD CONSTRAINT "content_characters_content_id_fkey" FOREIGN KEY ("content_id") REFERENCES "public"."content"("id") ON DELETE CASCADE;



ALTER TABLE ONLY "public"."content_illustrations"
    ADD CONSTRAINT "content_illustrations_content_id_fkey" FOREIGN KEY ("content_id") REFERENCES "public"."content"("id") ON DELETE CASCADE;



ALTER TABLE ONLY "public"."content"
    ADD CONSTRAINT "content_parent_content_id_fkey" FOREIGN KEY ("parent_content_id") REFERENCES "public"."content"("id") ON DELETE SET NULL;



ALTER TABLE ONLY "public"."content"
    ADD CONSTRAINT "content_source_story_id_fkey" FOREIGN KEY ("source_story_id") REFERENCES "public"."content"("id") ON DELETE SET NULL;



ALTER TABLE ONLY "public"."content"
    ADD CONSTRAINT "content_user_id_fkey" FOREIGN KEY ("user_id") REFERENCES "auth"."users"("id") ON DELETE SET NULL;



ALTER TABLE ONLY "public"."generation_usage"
    ADD CONSTRAINT "generation_usage_user_id_fkey" FOREIGN KEY ("user_id") REFERENCES "auth"."users"("id") ON DELETE CASCADE;



ALTER TABLE ONLY "public"."user_profiles"
    ADD CONSTRAINT "user_profiles_id_fkey" FOREIGN KEY ("id") REFERENCES "auth"."users"("id") ON DELETE CASCADE;



ALTER TABLE ONLY "public"."user_profiles"
    ADD CONSTRAINT "user_profiles_subscription_tier_id_fkey" FOREIGN KEY ("subscription_tier_id") REFERENCES "public"."subscription_tiers"("id");



ALTER TABLE ONLY "public"."vignette_panels"
    ADD CONSTRAINT "vignette_panels_story_id_fkey" FOREIGN KEY ("story_id") REFERENCES "public"."content"("id") ON DELETE CASCADE;



ALTER TABLE ONLY "storage"."objects"
    ADD CONSTRAINT "objects_bucketId_fkey" FOREIGN KEY ("bucket_id") REFERENCES "storage"."buckets"("id");



ALTER TABLE ONLY "storage"."prefixes"
    ADD CONSTRAINT "prefixes_bucketId_fkey" FOREIGN KEY ("bucket_id") REFERENCES "storage"."buckets"("id");



ALTER TABLE ONLY "storage"."s3_multipart_uploads"
    ADD CONSTRAINT "s3_multipart_uploads_bucket_id_fkey" FOREIGN KEY ("bucket_id") REFERENCES "storage"."buckets"("id");



ALTER TABLE ONLY "storage"."s3_multipart_uploads_parts"
    ADD CONSTRAINT "s3_multipart_uploads_parts_bucket_id_fkey" FOREIGN KEY ("bucket_id") REFERENCES "storage"."buckets"("id");



ALTER TABLE ONLY "storage"."s3_multipart_uploads_parts"
    ADD CONSTRAINT "s3_multipart_uploads_parts_upload_id_fkey" FOREIGN KEY ("upload_id") REFERENCES "storage"."s3_multipart_uploads"("id") ON DELETE CASCADE;



ALTER TABLE "auth"."audit_log_entries" ENABLE ROW LEVEL SECURITY;


ALTER TABLE "auth"."flow_state" ENABLE ROW LEVEL SECURITY;


ALTER TABLE "auth"."identities" ENABLE ROW LEVEL SECURITY;


ALTER TABLE "auth"."instances" ENABLE ROW LEVEL SECURITY;


ALTER TABLE "auth"."mfa_amr_claims" ENABLE ROW LEVEL SECURITY;


ALTER TABLE "auth"."mfa_challenges" ENABLE ROW LEVEL SECURITY;


ALTER TABLE "auth"."mfa_factors" ENABLE ROW LEVEL SECURITY;


ALTER TABLE "auth"."one_time_tokens" ENABLE ROW LEVEL SECURITY;


ALTER TABLE "auth"."refresh_tokens" ENABLE ROW LEVEL SECURITY;


ALTER TABLE "auth"."saml_providers" ENABLE ROW LEVEL SECURITY;


ALTER TABLE "auth"."saml_relay_states" ENABLE ROW LEVEL SECURITY;


ALTER TABLE "auth"."schema_migrations" ENABLE ROW LEVEL SECURITY;


ALTER TABLE "auth"."sessions" ENABLE ROW LEVEL SECURITY;


ALTER TABLE "auth"."sso_domains" ENABLE ROW LEVEL SECURITY;


ALTER TABLE "auth"."sso_providers" ENABLE ROW LEVEL SECURITY;


ALTER TABLE "auth"."users" ENABLE ROW LEVEL SECURITY;


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



CREATE POLICY "Users can create avatar cache" ON "public"."avatar_cache" FOR INSERT TO "authenticated" WITH CHECK ((("character_profile_id" IS NULL) OR (EXISTS ( SELECT 1
   FROM "public"."character_profiles"
  WHERE (("character_profiles"."id" = "avatar_cache"."character_profile_id") AND ("character_profiles"."user_id" = "auth"."uid"()))))));



CREATE POLICY "Users can create own characters" ON "public"."character_profiles" FOR INSERT WITH CHECK (("auth"."uid"() = "user_id"));



CREATE POLICY "Users can create own content" ON "public"."content" FOR INSERT WITH CHECK (("auth"."uid"() = "user_id"));



CREATE POLICY "Users can delete avatar cache" ON "public"."avatar_cache" FOR DELETE TO "authenticated" USING (((("character_profile_id" IS NULL) AND ("created_at" > ("now"() - '01:00:00'::interval))) OR (EXISTS ( SELECT 1
   FROM "public"."character_profiles"
  WHERE (("character_profiles"."id" = "avatar_cache"."character_profile_id") AND ("character_profiles"."user_id" = "auth"."uid"()))))));



CREATE POLICY "Users can delete their own vignette panels" ON "public"."vignette_panels" FOR DELETE USING ((EXISTS ( SELECT 1
   FROM "public"."content"
  WHERE (("content"."id" = "vignette_panels"."story_id") AND ("content"."user_id" = "auth"."uid"())))));



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



CREATE POLICY "Users can update avatar cache" ON "public"."avatar_cache" FOR UPDATE TO "authenticated" USING (((("character_profile_id" IS NULL) AND ("created_at" > ("now"() - '01:00:00'::interval))) OR (EXISTS ( SELECT 1
   FROM "public"."character_profiles"
  WHERE (("character_profiles"."id" = "avatar_cache"."character_profile_id") AND ("character_profiles"."user_id" = "auth"."uid"())))))) WITH CHECK ((("character_profile_id" IS NULL) OR (EXISTS ( SELECT 1
   FROM "public"."character_profiles"
  WHERE (("character_profiles"."id" = "avatar_cache"."character_profile_id") AND ("character_profiles"."user_id" = "auth"."uid"()))))));



CREATE POLICY "Users can update own characters" ON "public"."character_profiles" FOR UPDATE USING (("auth"."uid"() = "user_id"));



CREATE POLICY "Users can update own content" ON "public"."content" FOR UPDATE USING (("auth"."uid"() = "user_id"));



CREATE POLICY "Users can update own profile" ON "public"."user_profiles" FOR UPDATE USING (("auth"."uid"() = "id"));



CREATE POLICY "Users can update their own generation usage" ON "public"."generation_usage" FOR UPDATE TO "authenticated" USING (("user_id" = "auth"."uid"())) WITH CHECK (("user_id" = "auth"."uid"()));



CREATE POLICY "Users can view active AI configs" ON "public"."ai_configs" FOR SELECT TO "authenticated" USING (("is_active" = true));



CREATE POLICY "Users can view avatar cache" ON "public"."avatar_cache" FOR SELECT TO "authenticated" USING (((("character_profile_id" IS NULL) AND ("created_at" > ("now"() - '01:00:00'::interval))) OR (EXISTS ( SELECT 1
   FROM "public"."character_profiles"
  WHERE (("character_profiles"."id" = "avatar_cache"."character_profile_id") AND ("character_profiles"."user_id" = "auth"."uid"()))))));



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


CREATE POLICY "Public can view avatars" ON "storage"."objects" FOR SELECT USING (("bucket_id" = 'avatars'::"text"));



CREATE POLICY "Public can view illustrations" ON "storage"."objects" FOR SELECT USING (("bucket_id" = 'illustrations'::"text"));



CREATE POLICY "Users can delete own avatars" ON "storage"."objects" FOR DELETE TO "authenticated" USING ((("bucket_id" = 'avatars'::"text") AND ((("storage"."foldername"("name"))[1] = ("auth"."uid"())::"text") OR ((("storage"."foldername"("name"))[1] = 'previews'::"text") AND (("storage"."foldername"("name"))[2] = ("auth"."uid"())::"text")))));



CREATE POLICY "Users can delete own illustrations" ON "storage"."objects" FOR DELETE TO "authenticated" USING ((("bucket_id" = 'illustrations'::"text") AND (("storage"."foldername"("name"))[1] = ("auth"."uid"())::"text")));



CREATE POLICY "Users can delete own uploads" ON "storage"."objects" FOR DELETE TO "authenticated" USING ((("bucket_id" = 'user-uploads'::"text") AND (("storage"."foldername"("name"))[1] = ("auth"."uid"())::"text")));



CREATE POLICY "Users can update own avatars" ON "storage"."objects" FOR UPDATE TO "authenticated" USING ((("bucket_id" = 'avatars'::"text") AND ((("storage"."foldername"("name"))[1] = ("auth"."uid"())::"text") OR ((("storage"."foldername"("name"))[1] = 'previews'::"text") AND (("storage"."foldername"("name"))[2] = ("auth"."uid"())::"text")))));



CREATE POLICY "Users can update own illustrations" ON "storage"."objects" FOR UPDATE TO "authenticated" USING ((("bucket_id" = 'illustrations'::"text") AND (("storage"."foldername"("name"))[1] = ("auth"."uid"())::"text")));



CREATE POLICY "Users can update own uploads" ON "storage"."objects" FOR UPDATE TO "authenticated" USING ((("bucket_id" = 'user-uploads'::"text") AND (("storage"."foldername"("name"))[1] = ("auth"."uid"())::"text")));



CREATE POLICY "Users can upload avatars to own folder" ON "storage"."objects" FOR INSERT TO "authenticated" WITH CHECK ((("bucket_id" = 'avatars'::"text") AND ((("storage"."foldername"("name"))[1] = ("auth"."uid"())::"text") OR ((("storage"."foldername"("name"))[1] = 'previews'::"text") AND (("storage"."foldername"("name"))[2] = ("auth"."uid"())::"text")))));



CREATE POLICY "Users can upload illustrations to own folder" ON "storage"."objects" FOR INSERT TO "authenticated" WITH CHECK ((("bucket_id" = 'illustrations'::"text") AND (("storage"."foldername"("name"))[1] = ("auth"."uid"())::"text")));



CREATE POLICY "Users can upload to own folder" ON "storage"."objects" FOR INSERT TO "authenticated" WITH CHECK ((("bucket_id" = 'user-uploads'::"text") AND (("storage"."foldername"("name"))[1] = ("auth"."uid"())::"text")));



CREATE POLICY "Users can view own uploads" ON "storage"."objects" FOR SELECT TO "authenticated" USING ((("bucket_id" = 'user-uploads'::"text") AND (("storage"."foldername"("name"))[1] = ("auth"."uid"())::"text")));



ALTER TABLE "storage"."buckets" ENABLE ROW LEVEL SECURITY;


ALTER TABLE "storage"."buckets_analytics" ENABLE ROW LEVEL SECURITY;


ALTER TABLE "storage"."migrations" ENABLE ROW LEVEL SECURITY;


ALTER TABLE "storage"."objects" ENABLE ROW LEVEL SECURITY;


ALTER TABLE "storage"."prefixes" ENABLE ROW LEVEL SECURITY;


ALTER TABLE "storage"."s3_multipart_uploads" ENABLE ROW LEVEL SECURITY;


ALTER TABLE "storage"."s3_multipart_uploads_parts" ENABLE ROW LEVEL SECURITY;


GRANT USAGE ON SCHEMA "auth" TO "anon";
GRANT USAGE ON SCHEMA "auth" TO "authenticated";
GRANT USAGE ON SCHEMA "auth" TO "service_role";
GRANT ALL ON SCHEMA "auth" TO "supabase_auth_admin";
GRANT ALL ON SCHEMA "auth" TO "dashboard_user";
GRANT USAGE ON SCHEMA "auth" TO "postgres";



GRANT USAGE ON SCHEMA "public" TO "postgres";
GRANT USAGE ON SCHEMA "public" TO "anon";
GRANT USAGE ON SCHEMA "public" TO "authenticated";
GRANT USAGE ON SCHEMA "public" TO "service_role";



GRANT USAGE ON SCHEMA "storage" TO "postgres" WITH GRANT OPTION;
GRANT USAGE ON SCHEMA "storage" TO "anon";
GRANT USAGE ON SCHEMA "storage" TO "authenticated";
GRANT USAGE ON SCHEMA "storage" TO "service_role";
GRANT ALL ON SCHEMA "storage" TO "supabase_storage_admin";
GRANT ALL ON SCHEMA "storage" TO "dashboard_user";



GRANT ALL ON FUNCTION "auth"."email"() TO "dashboard_user";



GRANT ALL ON FUNCTION "auth"."jwt"() TO "postgres";
GRANT ALL ON FUNCTION "auth"."jwt"() TO "dashboard_user";



GRANT ALL ON FUNCTION "auth"."role"() TO "dashboard_user";



GRANT ALL ON FUNCTION "auth"."uid"() TO "dashboard_user";



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



GRANT ALL ON TABLE "auth"."audit_log_entries" TO "dashboard_user";
GRANT INSERT,REFERENCES,DELETE,TRIGGER,TRUNCATE,MAINTAIN,UPDATE ON TABLE "auth"."audit_log_entries" TO "postgres";
GRANT SELECT ON TABLE "auth"."audit_log_entries" TO "postgres" WITH GRANT OPTION;



GRANT INSERT,REFERENCES,DELETE,TRIGGER,TRUNCATE,MAINTAIN,UPDATE ON TABLE "auth"."flow_state" TO "postgres";
GRANT SELECT ON TABLE "auth"."flow_state" TO "postgres" WITH GRANT OPTION;
GRANT ALL ON TABLE "auth"."flow_state" TO "dashboard_user";



GRANT INSERT,REFERENCES,DELETE,TRIGGER,TRUNCATE,MAINTAIN,UPDATE ON TABLE "auth"."identities" TO "postgres";
GRANT SELECT ON TABLE "auth"."identities" TO "postgres" WITH GRANT OPTION;
GRANT ALL ON TABLE "auth"."identities" TO "dashboard_user";



GRANT ALL ON TABLE "auth"."instances" TO "dashboard_user";
GRANT INSERT,REFERENCES,DELETE,TRIGGER,TRUNCATE,MAINTAIN,UPDATE ON TABLE "auth"."instances" TO "postgres";
GRANT SELECT ON TABLE "auth"."instances" TO "postgres" WITH GRANT OPTION;



GRANT INSERT,REFERENCES,DELETE,TRIGGER,TRUNCATE,MAINTAIN,UPDATE ON TABLE "auth"."mfa_amr_claims" TO "postgres";
GRANT SELECT ON TABLE "auth"."mfa_amr_claims" TO "postgres" WITH GRANT OPTION;
GRANT ALL ON TABLE "auth"."mfa_amr_claims" TO "dashboard_user";



GRANT INSERT,REFERENCES,DELETE,TRIGGER,TRUNCATE,MAINTAIN,UPDATE ON TABLE "auth"."mfa_challenges" TO "postgres";
GRANT SELECT ON TABLE "auth"."mfa_challenges" TO "postgres" WITH GRANT OPTION;
GRANT ALL ON TABLE "auth"."mfa_challenges" TO "dashboard_user";



GRANT INSERT,REFERENCES,DELETE,TRIGGER,TRUNCATE,MAINTAIN,UPDATE ON TABLE "auth"."mfa_factors" TO "postgres";
GRANT SELECT ON TABLE "auth"."mfa_factors" TO "postgres" WITH GRANT OPTION;
GRANT ALL ON TABLE "auth"."mfa_factors" TO "dashboard_user";



GRANT ALL ON TABLE "auth"."oauth_authorizations" TO "postgres";
GRANT ALL ON TABLE "auth"."oauth_authorizations" TO "dashboard_user";



GRANT ALL ON TABLE "auth"."oauth_clients" TO "postgres";
GRANT ALL ON TABLE "auth"."oauth_clients" TO "dashboard_user";



GRANT ALL ON TABLE "auth"."oauth_consents" TO "postgres";
GRANT ALL ON TABLE "auth"."oauth_consents" TO "dashboard_user";



GRANT INSERT,REFERENCES,DELETE,TRIGGER,TRUNCATE,MAINTAIN,UPDATE ON TABLE "auth"."one_time_tokens" TO "postgres";
GRANT SELECT ON TABLE "auth"."one_time_tokens" TO "postgres" WITH GRANT OPTION;
GRANT ALL ON TABLE "auth"."one_time_tokens" TO "dashboard_user";



GRANT ALL ON TABLE "auth"."refresh_tokens" TO "dashboard_user";
GRANT INSERT,REFERENCES,DELETE,TRIGGER,TRUNCATE,MAINTAIN,UPDATE ON TABLE "auth"."refresh_tokens" TO "postgres";
GRANT SELECT ON TABLE "auth"."refresh_tokens" TO "postgres" WITH GRANT OPTION;



GRANT ALL ON SEQUENCE "auth"."refresh_tokens_id_seq" TO "dashboard_user";
GRANT ALL ON SEQUENCE "auth"."refresh_tokens_id_seq" TO "postgres";



GRANT INSERT,REFERENCES,DELETE,TRIGGER,TRUNCATE,MAINTAIN,UPDATE ON TABLE "auth"."saml_providers" TO "postgres";
GRANT SELECT ON TABLE "auth"."saml_providers" TO "postgres" WITH GRANT OPTION;
GRANT ALL ON TABLE "auth"."saml_providers" TO "dashboard_user";



GRANT INSERT,REFERENCES,DELETE,TRIGGER,TRUNCATE,MAINTAIN,UPDATE ON TABLE "auth"."saml_relay_states" TO "postgres";
GRANT SELECT ON TABLE "auth"."saml_relay_states" TO "postgres" WITH GRANT OPTION;
GRANT ALL ON TABLE "auth"."saml_relay_states" TO "dashboard_user";



GRANT SELECT ON TABLE "auth"."schema_migrations" TO "postgres" WITH GRANT OPTION;



GRANT INSERT,REFERENCES,DELETE,TRIGGER,TRUNCATE,MAINTAIN,UPDATE ON TABLE "auth"."sessions" TO "postgres";
GRANT SELECT ON TABLE "auth"."sessions" TO "postgres" WITH GRANT OPTION;
GRANT ALL ON TABLE "auth"."sessions" TO "dashboard_user";



GRANT INSERT,REFERENCES,DELETE,TRIGGER,TRUNCATE,MAINTAIN,UPDATE ON TABLE "auth"."sso_domains" TO "postgres";
GRANT SELECT ON TABLE "auth"."sso_domains" TO "postgres" WITH GRANT OPTION;
GRANT ALL ON TABLE "auth"."sso_domains" TO "dashboard_user";



GRANT INSERT,REFERENCES,DELETE,TRIGGER,TRUNCATE,MAINTAIN,UPDATE ON TABLE "auth"."sso_providers" TO "postgres";
GRANT SELECT ON TABLE "auth"."sso_providers" TO "postgres" WITH GRANT OPTION;
GRANT ALL ON TABLE "auth"."sso_providers" TO "dashboard_user";



GRANT ALL ON TABLE "auth"."users" TO "dashboard_user";
GRANT INSERT,REFERENCES,DELETE,TRIGGER,TRUNCATE,MAINTAIN,UPDATE ON TABLE "auth"."users" TO "postgres";
GRANT SELECT ON TABLE "auth"."users" TO "postgres" WITH GRANT OPTION;



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



GRANT ALL ON TABLE "storage"."buckets" TO "anon";
GRANT ALL ON TABLE "storage"."buckets" TO "authenticated";
GRANT ALL ON TABLE "storage"."buckets" TO "service_role";
GRANT ALL ON TABLE "storage"."buckets" TO "postgres" WITH GRANT OPTION;



GRANT ALL ON TABLE "storage"."buckets_analytics" TO "service_role";
GRANT ALL ON TABLE "storage"."buckets_analytics" TO "authenticated";
GRANT ALL ON TABLE "storage"."buckets_analytics" TO "anon";



GRANT ALL ON TABLE "storage"."objects" TO "anon";
GRANT ALL ON TABLE "storage"."objects" TO "authenticated";
GRANT ALL ON TABLE "storage"."objects" TO "service_role";
GRANT ALL ON TABLE "storage"."objects" TO "postgres" WITH GRANT OPTION;



GRANT ALL ON TABLE "storage"."prefixes" TO "service_role";
GRANT ALL ON TABLE "storage"."prefixes" TO "authenticated";
GRANT ALL ON TABLE "storage"."prefixes" TO "anon";



GRANT ALL ON TABLE "storage"."s3_multipart_uploads" TO "service_role";
GRANT SELECT ON TABLE "storage"."s3_multipart_uploads" TO "authenticated";
GRANT SELECT ON TABLE "storage"."s3_multipart_uploads" TO "anon";



GRANT ALL ON TABLE "storage"."s3_multipart_uploads_parts" TO "service_role";
GRANT SELECT ON TABLE "storage"."s3_multipart_uploads_parts" TO "authenticated";
GRANT SELECT ON TABLE "storage"."s3_multipart_uploads_parts" TO "anon";



ALTER DEFAULT PRIVILEGES FOR ROLE "supabase_auth_admin" IN SCHEMA "auth" GRANT ALL ON SEQUENCES TO "postgres";
ALTER DEFAULT PRIVILEGES FOR ROLE "supabase_auth_admin" IN SCHEMA "auth" GRANT ALL ON SEQUENCES TO "dashboard_user";



ALTER DEFAULT PRIVILEGES FOR ROLE "supabase_auth_admin" IN SCHEMA "auth" GRANT ALL ON FUNCTIONS TO "postgres";
ALTER DEFAULT PRIVILEGES FOR ROLE "supabase_auth_admin" IN SCHEMA "auth" GRANT ALL ON FUNCTIONS TO "dashboard_user";



ALTER DEFAULT PRIVILEGES FOR ROLE "supabase_auth_admin" IN SCHEMA "auth" GRANT ALL ON TABLES TO "postgres";
ALTER DEFAULT PRIVILEGES FOR ROLE "supabase_auth_admin" IN SCHEMA "auth" GRANT ALL ON TABLES TO "dashboard_user";



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






ALTER DEFAULT PRIVILEGES FOR ROLE "postgres" IN SCHEMA "storage" GRANT ALL ON SEQUENCES TO "postgres";
ALTER DEFAULT PRIVILEGES FOR ROLE "postgres" IN SCHEMA "storage" GRANT ALL ON SEQUENCES TO "anon";
ALTER DEFAULT PRIVILEGES FOR ROLE "postgres" IN SCHEMA "storage" GRANT ALL ON SEQUENCES TO "authenticated";
ALTER DEFAULT PRIVILEGES FOR ROLE "postgres" IN SCHEMA "storage" GRANT ALL ON SEQUENCES TO "service_role";



ALTER DEFAULT PRIVILEGES FOR ROLE "postgres" IN SCHEMA "storage" GRANT ALL ON FUNCTIONS TO "postgres";
ALTER DEFAULT PRIVILEGES FOR ROLE "postgres" IN SCHEMA "storage" GRANT ALL ON FUNCTIONS TO "anon";
ALTER DEFAULT PRIVILEGES FOR ROLE "postgres" IN SCHEMA "storage" GRANT ALL ON FUNCTIONS TO "authenticated";
ALTER DEFAULT PRIVILEGES FOR ROLE "postgres" IN SCHEMA "storage" GRANT ALL ON FUNCTIONS TO "service_role";



ALTER DEFAULT PRIVILEGES FOR ROLE "postgres" IN SCHEMA "storage" GRANT ALL ON TABLES TO "postgres";
ALTER DEFAULT PRIVILEGES FOR ROLE "postgres" IN SCHEMA "storage" GRANT ALL ON TABLES TO "anon";
ALTER DEFAULT PRIVILEGES FOR ROLE "postgres" IN SCHEMA "storage" GRANT ALL ON TABLES TO "authenticated";
ALTER DEFAULT PRIVILEGES FOR ROLE "postgres" IN SCHEMA "storage" GRANT ALL ON TABLES TO "service_role";




