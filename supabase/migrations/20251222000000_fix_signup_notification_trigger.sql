-- Fix the signup notification trigger to not fail the user creation
-- The previous implementation could cause user signups to fail if the webhook failed

-- Drop the existing trigger
DROP TRIGGER IF EXISTS on_user_profile_created ON public.user_profiles;

-- Recreate the trigger function with proper error handling
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
  -- Wrapped in exception handler to prevent signup failures
  BEGIN
    PERFORM net.http_post(
      url := edge_function_url,
      body := payload::text,
      headers := jsonb_build_object(
        'Content-Type', 'application/json',
        'Authorization', 'Bearer ' || webhook_secret
      )::jsonb
    );
  EXCEPTION WHEN OTHERS THEN
    -- Log the error but don't fail the transaction
    RAISE WARNING 'Failed to notify admin of signup: %', SQLERRM;
  END;

  RETURN NEW;
END;
$$;

-- Recreate the trigger
CREATE TRIGGER on_user_profile_created
  AFTER INSERT ON public.user_profiles
  FOR EACH ROW
  EXECUTE FUNCTION public.notify_admin_on_signup();

-- Add comment for documentation
COMMENT ON FUNCTION public.notify_admin_on_signup IS 'Trigger function that notifies admin via Edge Function when a new user signs up. Errors are logged but do not fail signup.';
