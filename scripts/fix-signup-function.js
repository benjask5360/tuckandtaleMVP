// Fix signup function to use new tier structure
import { createClient } from '@supabase/supabase-js';
import dotenv from 'dotenv';
import { fileURLToPath } from 'url';
import { dirname, join } from 'path';

const __filename = fileURLToPath(import.meta.url);
const __dirname = dirname(__filename);

// Load environment variables
dotenv.config({ path: join(__dirname, '..', '.env.local') });

const supabaseUrl = process.env.NEXT_PUBLIC_SUPABASE_URL;
const supabaseKey = process.env.SUPABASE_SERVICE_KEY;

if (!supabaseUrl || !supabaseKey) {
  console.error('❌ Missing environment variables');
  process.exit(1);
}

const supabase = createClient(supabaseUrl, supabaseKey);

async function fixSignupFunction() {
  console.log('🔧 Fixing handle_new_user function for new tier structure\n');

  const sql = `
    -- Fix handle_new_user function to use new tier structure
    CREATE OR REPLACE FUNCTION public.handle_new_user()
    RETURNS TRIGGER
    LANGUAGE plpgsql
    SECURITY DEFINER
    AS $$
    BEGIN
      -- Create user profile with free tier assigned
      -- Using the new TEXT-based tier ID directly
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
        'tier_free', -- Use the new TEXT-based free tier ID
        'active',
        NOW(),
        NOW()
      );

      RETURN new;
    END;
    $$;

    -- Ensure the trigger exists
    DROP TRIGGER IF EXISTS on_auth_user_created ON auth.users;
    CREATE TRIGGER on_auth_user_created
      AFTER INSERT ON auth.users
      FOR EACH ROW EXECUTE FUNCTION public.handle_new_user();

    -- Grant necessary permissions
    GRANT EXECUTE ON FUNCTION public.handle_new_user() TO service_role;
  `;

  try {
    // Execute the SQL to update the function
    const { error } = await supabase.rpc('exec_sql', { sql_query: sql }).catch(async (err) => {
      // If exec_sql doesn't exist, try direct approach
      console.log('📝 Using alternative approach...');

      // We'll need to use the Supabase SQL editor or migration
      // For now, let's at least verify the current function
      const { data: funcCheck } = await supabase
        .from('subscription_tiers')
        .select('id')
        .eq('id', 'tier_free')
        .single();

      if (funcCheck) {
        console.log('✅ tier_free exists in database');
      } else {
        console.error('❌ tier_free not found!');
      }

      throw new Error('Please apply the migration 20251115155000_fix_handle_new_user_function.sql manually via Supabase dashboard');
    });

    if (error) {
      throw error;
    }

    console.log('✅ Successfully updated handle_new_user function');
    console.log('✅ New users will now be assigned tier_free on signup');

  } catch (error) {
    console.error('❌ Error:', error.message);
    console.log('\n📋 Manual Fix Instructions:');
    console.log('1. Go to Supabase Dashboard > SQL Editor');
    console.log('2. Run the SQL from: supabase/migrations/20251115155000_fix_handle_new_user_function.sql');
    console.log('3. This will fix the signup issue');
  }
}

fixSignupFunction();