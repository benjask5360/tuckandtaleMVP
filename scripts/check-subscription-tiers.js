#!/usr/bin/env node

/**
 * Check Subscription Tiers
 *
 * This script checks what subscription tiers currently exist in the database
 */

require('dotenv').config({ path: '.env.local' });
const { createClient } = require('@supabase/supabase-js');

const supabaseUrl = process.env.NEXT_PUBLIC_SUPABASE_URL;
const supabaseServiceKey = process.env.SUPABASE_SERVICE_KEY;

if (!supabaseUrl || !supabaseServiceKey) {
  console.error('❌ Missing environment variables');
  process.exit(1);
}

const supabase = createClient(supabaseUrl, supabaseServiceKey, {
  auth: {
    autoRefreshToken: false,
    persistSession: false
  }
});

async function checkTiers() {
  console.log('\n📊 Checking Subscription Tiers');
  console.log('━'.repeat(60));

  try {
    const { data, error } = await supabase
      .from('subscription_tiers')
      .select('*');

    if (error) {
      throw new Error(`Failed to fetch tiers: ${error.message}`);
    }

    console.log('\n✅ Found', data.length, 'tier(s):\n');

    data.forEach((tier, index) => {
      console.log(`${index + 1}. ${tier.name || tier.id}`);
      console.log('   ID:', tier.id);
      if (tier.illustrated_limit_total !== undefined) {
        console.log('   Illustrated Limit (Total):', tier.illustrated_limit_total);
      }
      if (tier.illustrated_limit_month !== undefined) {
        console.log('   Illustrated Limit (Month):', tier.illustrated_limit_month);
      }
      if (tier.text_limit_month !== undefined) {
        console.log('   Text Limit (Month):', tier.text_limit_month);
      }
      console.log('');
    });

    console.log('━'.repeat(60));

  } catch (error) {
    console.error('\n❌ Error:', error.message);
    process.exit(1);
  }
}

checkTiers();
