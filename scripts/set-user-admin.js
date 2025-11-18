#!/usr/bin/env node

/**
 * Set User as Admin
 * Usage: node scripts/set-user-admin.js <email>
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

async function setUserAdmin(email) {
  if (!email) {
    console.error('❌ Please provide an email address');
    console.log('\nUsage: node scripts/set-user-admin.js <email>');
    process.exit(1);
  }

  console.log('\n🔧 Setting User as Admin');
  console.log('━'.repeat(50));
  console.log(`Email: ${email}`);

  try {
    // Find user by email
    const { data: userProfile, error: findError } = await supabase
      .from('user_profiles')
      .select('id, email, first_name, last_name, user_type')
      .eq('email', email)
      .single();

    if (findError || !userProfile) {
      console.error('❌ User not found with email:', email);
      process.exit(1);
    }

    console.log('\n📋 Current user profile:');
    console.log(`  - Name: ${userProfile.first_name} ${userProfile.last_name}`);
    console.log(`  - User Type: ${userProfile.user_type}`);

    if (userProfile.user_type === 'admin') {
      console.log('\n✅ User is already an admin!');
      process.exit(0);
    }

    // Update to admin
    const { data: updateData, error: updateError } = await supabase
      .from('user_profiles')
      .update({ user_type: 'admin' })
      .eq('id', userProfile.id)
      .select();

    if (updateError) {
      console.error('❌ Error updating user:', updateError);
      process.exit(1);
    }

    console.log('\n✅ User successfully updated to admin!');
    console.log('Updated profile:', updateData[0]);
    console.log('━'.repeat(50));

  } catch (error) {
    console.error('\n❌ Operation failed:', error);
    process.exit(1);
  }
}

// Get email from command line argument
const email = process.argv[2];
setUserAdmin(email);
