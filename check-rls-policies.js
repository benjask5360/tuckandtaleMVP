/**
 * Check RLS policies on avatar_cache table
 */

const { createClient } = require('@supabase/supabase-js');

const supabaseUrl = process.env.NEXT_PUBLIC_SUPABASE_URL;
const supabaseServiceKey = process.env.SUPABASE_SERVICE_KEY;

if (!supabaseUrl || !supabaseServiceKey) {
  console.error('Missing Supabase credentials');
  process.exit(1);
}

const supabase = createClient(supabaseUrl, supabaseServiceKey);

async function checkRLSPolicies() {
  console.log('\n=== Checking RLS Policies for avatar_cache ===\n');

  // Query pg_policies to get RLS policies
  const { data, error } = await supabase.rpc('exec_sql', {
    sql: `
      SELECT
        schemaname,
        tablename,
        policyname,
        permissive,
        roles,
        cmd,
        qual,
        with_check
      FROM pg_policies
      WHERE tablename = 'avatar_cache'
      ORDER BY policyname;
    `
  });

  if (error) {
    console.error('Error fetching policies:', error);

    // Try alternative method using information_schema
    console.log('\nTrying alternative query...\n');

    const { data: data2, error: error2 } = await supabase.rpc('exec_sql', {
      sql: `
        SELECT * FROM pg_policies WHERE tablename = 'avatar_cache';
      `
    });

    if (error2) {
      console.error('Alternative query also failed:', error2);
      process.exit(1);
    }

    console.log('Policies:', JSON.stringify(data2, null, 2));
    return;
  }

  console.log('RLS Policies on avatar_cache:');
  console.log(JSON.stringify(data, null, 2));
}

checkRLSPolicies()
  .then(() => {
    console.log('\nDone!');
    process.exit(0);
  })
  .catch((error) => {
    console.error('Script failed:', error);
    process.exit(1);
  });
