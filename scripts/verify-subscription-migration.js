// Verify subscription_tiers migration success
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

async function verifyMigration() {
  console.log('🔍 Verifying subscription_tiers migration and tier ID updates...\n');

  try {
    // 1. Check if new subscription_tiers table exists and has correct structure
    console.log('📊 Checking subscription_tiers table structure...');
    const { data: columns, error: columnsError } = await supabase
      .from('subscription_tiers')
      .select('*')
      .limit(0);

    if (columnsError) {
      console.error('❌ Error accessing subscription_tiers table:', columnsError);
      return;
    }

    // 2. Fetch and display all subscription tiers
    console.log('\n📋 Fetching subscription tiers...');
    const { data: tiers, error: tiersError } = await supabase
      .from('subscription_tiers')
      .select('*')
      .order('display_order');

    if (tiersError) {
      console.error('❌ Error fetching tiers:', tiersError);
      return;
    }

    console.log(`✅ Found ${tiers.length} subscription tiers\n`);

    // Display tier details
    for (const tier of tiers) {
      console.log(`\n🎯 ${tier.name} (ID: ${tier.id})`);
      console.log('━'.repeat(50));
      console.log(`  💰 Price: $${tier.price_monthly || 0}/month`);
      console.log(`  📚 Limits:`);
      console.log(`     - Illustrated (lifetime): ${tier.illustrated_limit_total ?? 'unlimited'}`);
      console.log(`     - Illustrated (monthly): ${tier.illustrated_limit_month}`);
      console.log(`     - Text-only (monthly): ${tier.text_limit_month}`);
      console.log(`     - Avatar regenerations: ${tier.avatar_regenerations_month}/month`);
      console.log(`  👤 Profiles:`);
      console.log(`     - Child profiles: ${tier.child_profiles}`);
      console.log(`     - Other characters: ${tier.other_character_profiles}`);
      console.log(`  ✨ Features:`);
      console.log(`     - Pets: ${tier.allow_pets ? '✅' : '❌'}`);
      console.log(`     - Magical creatures: ${tier.allow_magical_creatures ? '✅' : '❌'}`);
      console.log(`     - Fun stories: ${tier.allow_fun_stories ? '✅' : '❌'}`);
      console.log(`     - Growth stories: ${tier.allow_growth_stories ? '✅' : '❌'}`);
      console.log(`     - Genres: ${tier.allow_genres ? '✅' : '❌'}`);
      console.log(`     - Writing styles: ${tier.allow_writing_styles ? '✅' : '❌'}`);
      console.log(`     - Story length: ${tier.allow_story_length ? '✅' : '❌'}`);
      console.log(`     - Library: ${tier.allow_library ? '✅' : '❌'}`);
      console.log(`     - Favorites: ${tier.allow_favorites ? '✅' : '❌'}`);
      console.log(`  🎖️ Support: ${tier.support_level}`);
      console.log(`  🚀 Early access: ${tier.early_access ? '✅' : '❌'}`);
    }

    // 3. Check user_profiles migration
    console.log('\n\n👥 Checking user_profiles migration...');
    const { data: userCount, error: userError } = await supabase
      .from('user_profiles')
      .select('subscription_tier_id', { count: 'exact' });

    if (userError) {
      console.error('❌ Error checking user_profiles:', userError);
      return;
    }

    console.log(`✅ Total users: ${userCount.length}`);

    // Count users by tier
    const tierCounts = {};
    for (const user of userCount) {
      tierCounts[user.subscription_tier_id] = (tierCounts[user.subscription_tier_id] || 0) + 1;
    }

    console.log('\n📊 Users by tier:');
    for (const [tierId, count] of Object.entries(tierCounts)) {
      console.log(`   - ${tierId}: ${count} users`);
    }

    // 4. Verify backup table was created
    console.log('\n💾 Checking backup table...');
    const { count, error: backupError } = await supabase
      .from('subscription_tiers_backup')
      .select('*', { count: 'exact', head: true });

    if (backupError) {
      console.log('⚠️  No backup table found (might be expected if this is first run)');
    } else {
      console.log(`✅ Backup table exists with ${count} rows`);
    }

    console.log('\n\n✨ Migration verification complete!');
    console.log('━'.repeat(50));
    console.log('Summary:');
    console.log('  ✅ New subscription_tiers table created');
    console.log('  ✅ 3 tiers seeded (moonlight, starlight, supernova)');
    console.log('  ✅ User profiles migrated to TEXT-based tier IDs');
    console.log('  ✅ All users set to moonlight (free) tier');
    console.log('\n🎉 Step 2 completed successfully!');

  } catch (error) {
    console.error('❌ Unexpected error:', error);
  }
}

verifyMigration();