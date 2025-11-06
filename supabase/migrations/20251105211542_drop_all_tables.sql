-- Drop all tables in reverse order (to handle foreign key dependencies)
DROP TABLE IF EXISTS public.usage CASCADE;
DROP TABLE IF EXISTS public.subscriptions CASCADE;
DROP TABLE IF EXISTS public.stories CASCADE;
DROP TABLE IF EXISTS public.children CASCADE;
DROP TABLE IF EXISTS public.profiles CASCADE;

-- Drop triggers
DROP TRIGGER IF EXISTS on_auth_user_created ON auth.users;

-- Drop functions
DROP FUNCTION IF EXISTS public.handle_new_user() CASCADE;
DROP FUNCTION IF EXISTS public.handle_updated_at() CASCADE;
