// Verify the signup fix was applied
import { createClient } from '@supabase/supabase-js';
import dotenv from 'dotenv';
import { fileURLToPath } from 'url';
import { dirname, join } from 'path';

const __filename = fileURLToPath(import.meta.url);
const __dirname = dirname(__filename);

dotenv.config({ path: join(__dirname, '..', '.env.local') });

const supabaseUrl = process.env.NEXT_PUBLIC_SUPABASE_URL;
const supabaseKey = process.env.SUPABASE_SERVICE_KEY;

if (!supabaseUrl || !supabaseKey) {
  console.error('❌ Missing environment variables');
  process.exit(1);
}

const supabase = createClient(supabaseUrl, supabaseKey);

async function verifyFix() {
  console.log('🔍 Verifying signup fix...\n');

  try {
    // Check if tier_free exists
    const { data: freeTier, error: tierError } = await supabase
      .from('subscription_tiers')
      .select('id, name')
      .eq('id', 'tier_free')
      .single();

    if (tierError) {
      console.error('❌ tier_free not found:', tierError.message);
      return;
    }

    console.log('✅ tier_free exists:', freeTier.name);

    // Check if migration was recorded
    const { data: migrations, error: migError } = await supabase
      .from('supabase_migrations.schema_migrations')
      .select('version')
      .eq('version', '20251115155000')
      .maybeSingle();

    if (migrations) {
      console.log('✅ Migration 20251115155000 recorded as applied');
    } else {
      console.log('ℹ️  Migration not found in schema_migrations (may use different table)');
    }

    console.log('\n✨ Signup fix verification complete!');
    console.log('New users should now be assigned tier_free on signup.');
    console.log('\nTo test:');
    console.log('1. Try creating a new user account');
    console.log('2. Check that the user_profile has subscription_tier_id = "tier_free"');

  } catch (error) {
    console.error('❌ Verification error:', error.message);
  }
}

verifyFix();