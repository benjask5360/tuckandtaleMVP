const { createClient } = require('@supabase/supabase-js');
require('dotenv').config({ path: '.env.local' });

const supabaseUrl = process.env.NEXT_PUBLIC_SUPABASE_URL;
const supabaseServiceKey = process.env.SUPABASE_SERVICE_KEY;

async function applyFix() {
  console.log('====================================================');
  console.log('APPLYING FIRST AVATAR SAVE FIX');
  console.log('====================================================\n');

  // Connect using service role key for admin access
  const supabase = createClient(supabaseUrl, supabaseServiceKey, {
    auth: {
      autoRefreshToken: false,
      persistSession: false
    }
  });

  try {
    // Execute the fix as a raw SQL query
    const fixQuery = `
      -- Drop existing UPDATE policy
      DROP POLICY IF EXISTS "Users can update avatar cache" ON public.avatar_cache;

      -- Create fixed UPDATE policy
      CREATE POLICY "Users can update avatar cache" ON public.avatar_cache
      FOR UPDATE
      USING (
        created_by_user_id = auth.uid()
        OR
        EXISTS (
          SELECT 1 FROM public.character_profiles
          WHERE character_profiles.id = avatar_cache.character_profile_id
          AND character_profiles.user_id = auth.uid()
        )
      )
      WITH CHECK (
        created_by_user_id = auth.uid()
      );
    `;

    // Since Supabase JS client doesn't have a direct SQL execute method,
    // we'll create the fix as a migration file
    console.log('Since direct SQL execution is not available via JS client,');
    console.log('the fix has been prepared as a migration.\n');

    console.log('OPTION 1: Run via Supabase Dashboard');
    console.log('=========================================');
    console.log('1. Go to your Supabase Dashboard');
    console.log('2. Navigate to SQL Editor');
    console.log('3. Copy and run this SQL:\n');
    console.log(fixQuery);
    console.log('\n=========================================\n');

    console.log('OPTION 2: Use the migration file');
    console.log('=========================================');
    console.log('The migration file has been created at:');
    console.log('supabase/migrations/20251114001_fix_first_avatar_save_race_condition.sql');
    console.log('\nTo apply it:');
    console.log('1. Fix the CLI connection issue');
    console.log('2. Run: npx supabase db push');
    console.log('=========================================\n');

  } catch (error) {
    console.error('Error:', error.message);
  }
}

applyFix().catch(console.error);