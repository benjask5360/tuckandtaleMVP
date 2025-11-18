#!/usr/bin/env node

/**
 * Check User Admin Status
 * Usage: node scripts/check-user-admin.js <email>
 */

require('dotenv').config({ path: '.env.local' });
const { createClient } = require('@supabase/supabase-js');

const supabaseUrl = process.env.NEXT_PUBLIC_SUPABASE_URL;
const supabaseServiceKey = process.env.SUPABASE_SERVICE_KEY;

if (!supabaseUrl || !supabaseServiceKey) {
  console.error('❌ Missing environment variables');
  process.exit(1);
}

const supabase = createClient(supabaseUrl, supabaseServiceKey);

async function checkUserAdmin(email) {
  if (!email) {
    console.error('❌ Please provide an email address');
    console.log('\nUsage: node scripts/check-user-admin.js <email>');
    process.exit(1);
  }

  console.log('\n🔍 Checking User Admin Status');
  console.log('━'.repeat(50));
  console.log(`Email: ${email}`);

  try {
    // Find user by email
    const { data: userProfile, error: findError } = await supabase
      .from('user_profiles')
      .select('*')
      .eq('email', email)
      .single();

    if (findError || !userProfile) {
      console.error('❌ User not found with email:', email);
      console.error('Error:', findError);
      process.exit(1);
    }

    console.log('\n📋 User Profile:');
    console.log(JSON.stringify(userProfile, null, 2));

    console.log('\n✅ Summary:');
    console.log(`  - Name: ${userProfile.first_name} ${userProfile.last_name}`);
    console.log(`  - Email: ${userProfile.email}`);
    console.log(`  - User Type: ${userProfile.user_type || 'NOT SET'}`);
    console.log(`  - Is Admin: ${userProfile.user_type === 'admin' ? 'YES ✅' : 'NO ❌'}`);
    console.log('━'.repeat(50));

  } catch (error) {
    console.error('\n❌ Operation failed:', error);
    process.exit(1);
  }
}

// Get email from command line argument
const email = process.argv[2];
checkUserAdmin(email);
