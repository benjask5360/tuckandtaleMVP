-- Create webhook trigger to notify admin on new user signup
-- This calls the on-user-created Edge Function when a new user_profiles row is inserted

-- Enable the pg_net extension if not already enabled (for HTTP requests)
CREATE EXTENSION IF NOT EXISTS pg_net WITH SCHEMA extensions;

-- Create the trigger function that calls our Edge Function
CREATE OR REPLACE FUNCTION public.notify_admin_on_signup()
RETURNS trigger
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
DECLARE
  edge_function_url TEXT := 'https://iolimejvugpcpnmruqww.supabase.co/functions/v1/on-user-created';
  webhook_secret TEXT := 'tuckandtale_webhook_secret_2024_xK9mP3nQ';
  payload JSONB;
BEGIN
  -- Build the payload matching what the Edge Function expects
  payload := jsonb_build_object(
    'type', 'INSERT',
    'table', 'user_profiles',
    'schema', 'public',
    'record', jsonb_build_object(
      'id', NEW.id,
      'email', NEW.email,
      'full_name', NEW.full_name,
      'created_at', NEW.created_at
    ),
    'old_record', NULL
  );

  -- Make async HTTP POST to Edge Function
  PERFORM extensions.http_post(
    url := edge_function_url,
    body := payload::text,
    headers := jsonb_build_object(
      'Content-Type', 'application/json',
      'Authorization', 'Bearer ' || webhook_secret
    )
  );

  RETURN NEW;
END;
$$;

-- Create the trigger on user_profiles table
DROP TRIGGER IF EXISTS on_user_profile_created ON public.user_profiles;

CREATE TRIGGER on_user_profile_created
  AFTER INSERT ON public.user_profiles
  FOR EACH ROW
  EXECUTE FUNCTION public.notify_admin_on_signup();

-- Add comment for documentation
COMMENT ON FUNCTION public.notify_admin_on_signup IS 'Trigger function that notifies admin via Edge Function when a new user signs up';
