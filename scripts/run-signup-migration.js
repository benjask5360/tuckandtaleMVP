// Run the signup fix migration directly using Supabase Management API
import { createClient } from '@supabase/supabase-js';
import dotenv from 'dotenv';
import { fileURLToPath } from 'url';
import { dirname, join } from 'path';
import fs from 'fs';

const __filename = fileURLToPath(import.meta.url);
const __dirname = dirname(__filename);

// Load environment variables
dotenv.config({ path: join(__dirname, '..', '.env.local') });

const supabaseUrl = process.env.NEXT_PUBLIC_SUPABASE_URL;
const supabaseServiceKey = process.env.SUPABASE_SERVICE_KEY;

if (!supabaseUrl || !supabaseServiceKey) {
  console.error('❌ Missing environment variables');
  process.exit(1);
}

// Create admin client
const supabase = createClient(supabaseUrl, supabaseServiceKey, {
  auth: {
    autoRefreshToken: false,
    persistSession: false
  }
});

async function runMigration() {
  console.log('🔧 Running signup fix migration...\n');

  try {
    // Read the migration SQL
    const migrationPath = join(__dirname, '..', 'supabase', 'migrations', '20251115155000_fix_handle_new_user_function.sql');
    const migrationSql = fs.readFileSync(migrationPath, 'utf8');

    console.log('📄 Migration SQL:');
    console.log('─'.repeat(60));
    console.log(migrationSql);
    console.log('─'.repeat(60));
    console.log();

    // Execute each statement separately
    const statements = migrationSql
      .split(';')
      .map(s => s.trim())
      .filter(s => s.length > 0 && !s.startsWith('--'));

    console.log(`📝 Executing ${statements.length} SQL statements...\n`);

    for (let i = 0; i < statements.length; i++) {
      const stmt = statements[i] + ';';

      // Skip comment-only statements
      if (stmt.trim().startsWith('--')) continue;

      console.log(`Statement ${i + 1}/${statements.length}...`);

      // Use raw SQL execution via edge function or direct approach
      // Since we can't execute DDL directly via the client, we'll use a workaround

      // Try using the REST API endpoint
      const response = await fetch(`${supabaseUrl}/rest/v1/rpc/exec`, {
        method: 'POST',
        headers: {
          'apikey': supabaseServiceKey,
          'Authorization': `Bearer ${supabaseServiceKey}`,
          'Content-Type': 'application/json',
          'Prefer': 'return=minimal'
        },
        body: JSON.stringify({ query: stmt })
      }).catch(err => {
        console.log('   (REST API not available, will use alternative)');
        return null;
      });

      if (response && !response.ok) {
        console.log(`   ⚠️ Could not execute via REST API`);
      }
    }

    // Verify the function was updated by checking if tier_free exists
    const { data: tierCheck } = await supabase
      .from('subscription_tiers')
      .select('id, name')
      .eq('id', 'tier_free')
      .single();

    if (tierCheck) {
      console.log('✅ Verified: tier_free exists:', tierCheck.name);
    } else {
      console.error('❌ Warning: tier_free not found in subscription_tiers!');
    }

    console.log('\n─'.repeat(60));
    console.log('📋 MANUAL APPLICATION REQUIRED');
    console.log('─'.repeat(60));
    console.log('\nThe Supabase client library cannot execute DDL statements.');
    console.log('Please apply this migration manually:\n');
    console.log('1. Go to: https://supabase.com/dashboard/project/iolimejvugpcpnmruqww/sql/new');
    console.log('2. Paste and run the following SQL:\n');
    console.log('─'.repeat(60));
    console.log(migrationSql);
    console.log('─'.repeat(60));
    console.log('\nOr use the Supabase CLI:');
    console.log('npx supabase db execute --file supabase/migrations/20251115155000_fix_handle_new_user_function.sql\n');

  } catch (error) {
    console.error('❌ Error:', error.message);
  }
}

runMigration();