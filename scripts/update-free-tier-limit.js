#!/usr/bin/env node

/**
 * Update Free Tier Illustrated Story Limit
 *
 * This script updates the moonlight (free) tier to allow 3 illustrated stories per month
 * instead of 0, while keeping the lifetime limit of 3.
 */

require('dotenv').config({ path: '.env.local' });
const { createClient } = require('@supabase/supabase-js');

const supabaseUrl = process.env.NEXT_PUBLIC_SUPABASE_URL;
const supabaseServiceKey = process.env.SUPABASE_SERVICE_KEY;

if (!supabaseUrl || !supabaseServiceKey) {
  console.error('❌ Missing environment variables');
  console.error('   NEXT_PUBLIC_SUPABASE_URL:', supabaseUrl ? '✓' : '✗');
  console.error('   SUPABASE_SERVICE_KEY:', supabaseServiceKey ? '✓' : '✗');
  process.exit(1);
}

const supabase = createClient(supabaseUrl, supabaseServiceKey, {
  auth: {
    autoRefreshToken: false,
    persistSession: false
  }
});

async function updateFreeTier() {
  console.log('\n🔧 Updating Free Tier Illustrated Story Limit');
  console.log('━'.repeat(60));

  try {
    // First, check current values
    console.log('\n📊 Current free tier configuration:');
    const { data: currentDataArray, error: fetchError } = await supabase
      .from('subscription_tiers')
      .select('id, name, illustrated_limit_total, illustrated_limit_month, text_limit_month')
      .eq('id', 'tier_free');

    if (fetchError) {
      throw new Error(`Failed to fetch current data: ${fetchError.message}`);
    }

    if (!currentDataArray || currentDataArray.length === 0) {
      throw new Error('No tier_free tier found in database');
    }

    const currentData = currentDataArray[0];

    console.log('   ID:', currentData.id);
    console.log('   Name:', currentData.name);
    console.log('   Illustrated Limit (Total):', currentData.illustrated_limit_total);
    console.log('   Illustrated Limit (Month):', currentData.illustrated_limit_month);
    console.log('   Text Limit (Month):', currentData.text_limit_month);

    if (currentData.illustrated_limit_month === 3) {
      console.log('\n✅ Free tier is already configured correctly!');
      console.log('   No update needed.');
      return;
    }

    // Update the tier
    console.log('\n🔄 Updating illustrated_limit_month from', currentData.illustrated_limit_month, 'to 3...');

    const { data: updateData, error: updateError } = await supabase
      .from('subscription_tiers')
      .update({ illustrated_limit_month: 3 })
      .eq('id', 'tier_free')
      .select();

    if (updateError) {
      throw new Error(`Failed to update: ${updateError.message}`);
    }

    console.log('✅ Update successful!');

    // Verify the update
    console.log('\n📊 Updated free tier configuration:');
    const { data: verifyDataArray, error: verifyError } = await supabase
      .from('subscription_tiers')
      .select('id, name, illustrated_limit_total, illustrated_limit_month, text_limit_month')
      .eq('id', 'tier_free');

    if (verifyError) {
      throw new Error(`Failed to verify update: ${verifyError.message}`);
    }

    const verifyData = verifyDataArray[0];

    console.log('   ID:', verifyData.id);
    console.log('   Name:', verifyData.name);
    console.log('   Illustrated Limit (Total):', verifyData.illustrated_limit_total);
    console.log('   Illustrated Limit (Month):', verifyData.illustrated_limit_month, '← UPDATED');
    console.log('   Text Limit (Month):', verifyData.text_limit_month);

    console.log('\n━'.repeat(60));
    console.log('✨ Complete! Free users can now generate illustrated stories.');
    console.log('   They will be limited to 3 total (lifetime cap).');

  } catch (error) {
    console.error('\n❌ Error:', error.message);
    process.exit(1);
  }
}

updateFreeTier();
