const { createClient } = require('@supabase/supabase-js');

const supabaseUrl = process.env.NEXT_PUBLIC_SUPABASE_URL;
const supabaseKey = process.env.SUPABASE_SERVICE_KEY;

if (!supabaseUrl || !supabaseKey) {
  console.error('Missing environment variables');
  process.exit(1);
}

const supabase = createClient(supabaseUrl, supabaseKey);

async function verifySecurityFixes() {
  console.log('🔍 Verifying Supabase security fixes...\n');

  // Check 1: Verify subscription_tiers has RLS enabled
  console.log('1. Checking if RLS is enabled on subscription_tiers...');
  const { data: rlsData, error: rlsError } = await supabase
    .rpc('exec_sql', {
      sql_query: `
        SELECT relname, relrowsecurity
        FROM pg_class
        WHERE relname = 'subscription_tiers'
        AND relnamespace = 'public'::regnamespace;
      `
    });

  if (rlsError) {
    console.error('❌ Error checking RLS:', rlsError);
  } else if (rlsData && rlsData.length > 0) {
    const hasRLS = rlsData[0].relrowsecurity;
    console.log(hasRLS ? '✅ RLS is enabled on subscription_tiers' : '❌ RLS is NOT enabled on subscription_tiers');
  }

  // Check 2: Verify RLS policies exist
  console.log('\n2. Checking RLS policies on subscription_tiers...');
  const { data: policiesData, error: policiesError } = await supabase
    .rpc('exec_sql', {
      sql_query: `
        SELECT policyname, cmd, roles, qual, with_check
        FROM pg_policies
        WHERE tablename = 'subscription_tiers';
      `
    });

  if (policiesError) {
    console.error('❌ Error checking policies:', policiesError);
  } else if (policiesData && policiesData.length > 0) {
    console.log(`✅ Found ${policiesData.length} RLS policies:`);
    policiesData.forEach(policy => {
      console.log(`   - ${policy.policyname} (${policy.cmd})`);
    });
  } else {
    console.log('❌ No RLS policies found on subscription_tiers');
  }

  // Check 3: Verify subscription_tiers_backup is dropped
  console.log('\n3. Checking if subscription_tiers_backup table exists...');
  const { data: backupData, error: backupError } = await supabase
    .rpc('exec_sql', {
      sql_query: `
        SELECT tablename
        FROM pg_tables
        WHERE schemaname = 'public'
        AND tablename = 'subscription_tiers_backup';
      `
    });

  if (backupError) {
    console.error('❌ Error checking backup table:', backupError);
  } else if (backupData && backupData.length === 0) {
    console.log('✅ subscription_tiers_backup table has been dropped');
  } else {
    console.log('❌ subscription_tiers_backup table still exists');
  }

  // Check 4: Test that subscription_tiers is still readable
  console.log('\n4. Testing subscription_tiers is still readable...');
  const { data: tiersData, error: tiersError } = await supabase
    .from('subscription_tiers')
    .select('id, name, is_active')
    .limit(5);

  if (tiersError) {
    console.error('❌ Error reading subscription_tiers:', tiersError);
  } else if (tiersData && tiersData.length > 0) {
    console.log(`✅ Successfully read ${tiersData.length} subscription tiers`);
    tiersData.forEach(tier => {
      console.log(`   - ${tier.name} (${tier.id}) - Active: ${tier.is_active}`);
    });
  } else {
    console.log('⚠️  No data in subscription_tiers');
  }

  console.log('\n✅ Security verification complete!');
}

verifySecurityFixes().catch(console.error);
