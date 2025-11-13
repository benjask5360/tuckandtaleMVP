/**
 * Fix new user subscription issue
 * Uses direct database queries to update schema and data
 */

const { createClient } = require('@supabase/supabase-js');

const supabaseUrl = process.env.NEXT_PUBLIC_SUPABASE_URL;
const supabaseServiceKey = process.env.SUPABASE_SERVICE_KEY;

if (!supabaseUrl || !supabaseServiceKey) {
  console.error('Missing Supabase credentials');
  console.error('Set NEXT_PUBLIC_SUPABASE_URL and SUPABASE_SERVICE_KEY');
  process.exit(1);
}

const supabase = createClient(supabaseUrl, supabaseServiceKey, {
  auth: {
    autoRefreshToken: false,
    persistSession: false
  },
  db: {
    schema: 'public'
  }
});

async function main() {
  console.log('=== Fixing New User Subscription Issue ===\n');

  try {
    // Step 1: Get the free tier ID
    console.log('Step 1: Getting free tier ID...');
    const { data: freeTier, error: tierError } = await supabase
      .from('subscription_tiers')
      .select('id')
      .eq('tier_name', 'free')
      .single();

    if (tierError || !freeTier) {
      throw new Error(`Failed to get free tier: ${tierError?.message}`);
    }

    console.log(`✅ Free tier ID: ${freeTier.id}`);

    // Step 2: Update existing users without subscription tier
    console.log('\nStep 2: Assigning free tier to existing users...');
    const { data: updatedUsers, error: updateError } = await supabase
      .from('user_profiles')
      .update({ subscription_tier_id: freeTier.id })
      .is('subscription_tier_id', null)
      .select('id');

    if (updateError) {
      console.error(`⚠️  Warning: ${updateError.message}`);
    } else {
      console.log(`✅ Updated ${updatedUsers?.length || 0} user(s)`);
    }

    // Step 3-7: Run SQL migrations via Supabase SQL editor or CLI
    console.log('\n⚠️  IMPORTANT: The following SQL changes need to be applied manually:');
    console.log('\nRun this SQL in your Supabase SQL editor or use `npx supabase db execute`:\n');

    const sqlMigrations = `
-- Add created_by_user_id column to avatar_cache
ALTER TABLE public.avatar_cache
ADD COLUMN IF NOT EXISTS created_by_user_id uuid REFERENCES auth.users(id);

-- Create index
CREATE INDEX IF NOT EXISTS idx_avatar_cache_created_by_user
ON public.avatar_cache(created_by_user_id)
WHERE character_profile_id IS NULL;

-- Drop existing RLS policies
DROP POLICY IF EXISTS "Users can view avatar cache" ON public.avatar_cache;
DROP POLICY IF EXISTS "Users can manage avatar cache" ON public.avatar_cache;

-- Create new RLS policy for viewing
CREATE POLICY "Users can view avatar cache" ON public.avatar_cache
  FOR SELECT USING (
    EXISTS (
      SELECT 1 FROM public.character_profiles
      WHERE character_profiles.id = avatar_cache.character_profile_id
      AND character_profiles.user_id = auth.uid()
    )
    OR (character_profile_id IS NULL AND created_by_user_id = auth.uid())
  );

-- Create new RLS policy for managing
CREATE POLICY "Users can manage avatar cache" ON public.avatar_cache
  FOR ALL USING (
    EXISTS (
      SELECT 1 FROM public.character_profiles
      WHERE character_profiles.id = avatar_cache.character_profile_id
      AND character_profiles.user_id = auth.uid()
    )
    OR (character_profile_id IS NULL AND created_by_user_id = auth.uid())
  );

-- Update handle_new_user function to assign free tier
CREATE OR REPLACE FUNCTION public.handle_new_user()
RETURNS trigger AS $$
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
$$ LANGUAGE plpgsql SECURITY DEFINER;
`;

    console.log(sqlMigrations);
    console.log('\n');

    // Write to a temporary SQL file
    const fs = require('fs');
    const path = require('path');
    const sqlFilePath = path.join(__dirname, '..', 'supabase', 'migrations', '20251219_fix_new_user_subscription.sql');
    fs.writeFileSync(sqlFilePath, sqlMigrations.trim());
    console.log(`✅ SQL migration saved to: ${sqlFilePath}`);
    console.log('\nTo apply, run:');
    console.log(`  npx supabase db execute -f ${sqlFilePath}`);

  } catch (error) {
    console.error('\n❌ Error:', error.message);
    throw error;
  }
}

main()
  .then(() => {
    console.log('\n✅ Partial fix completed successfully');
    console.log('⚠️  Remember to apply the SQL migrations manually');
    process.exit(0);
  })
  .catch((error) => {
    console.error('\n❌ Script failed:', error);
    process.exit(1);
  });
