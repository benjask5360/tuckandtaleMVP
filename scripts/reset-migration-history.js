#!/usr/bin/env node

/**
 * Reset Migration History
 *
 * This script clears the remote migration history table so we can start fresh.
 * Use this ONLY if you have migration history mismatches.
 *
 * WARNING: This will clear the migration history but NOT undo any migrations.
 * Your data and schema will remain intact.
 */

const { createClient } = require('@supabase/supabase-js');
require('dotenv').config({ path: '.env.local' });

const supabaseUrl = process.env.NEXT_PUBLIC_SUPABASE_URL;
const supabaseServiceKey = process.env.SUPABASE_SERVICE_KEY;

if (!supabaseUrl || !supabaseServiceKey) {
  console.error('❌ Missing environment variables');
  console.error('   Required: NEXT_PUBLIC_SUPABASE_URL and SUPABASE_SERVICE_KEY');
  process.exit(1);
}

async function resetMigrationHistory() {
  console.log('\n⚠️  Migration History Reset');
  console.log('━'.repeat(50));
  console.log('\n⚠️  WARNING: This will clear the migration history table.');
  console.log('   Your data and schema will remain intact.\n');

  // Create Supabase client with service role
  const supabase = createClient(supabaseUrl, supabaseServiceKey, {
    auth: {
      persistSession: false,
      autoRefreshToken: false,
    },
  });

  try {
    console.log('🔍 Connecting to database...');

    // Delete all entries from supabase_migrations.schema_migrations
    console.log('🗑️  Clearing migration history...');

    // Use raw SQL to clear the schema_migrations table
    const { data, error } = await supabase
      .from('supabase_migrations.schema_migrations')
      .delete()
      .neq('version', '0'); // Delete all (using a condition that's always true)

    if (error && !error.message.includes('does not exist')) {
      // If the table exists but there's an error, throw it
      if (!error.message.includes('No rows found')) {
        console.error('   Error:', error.message);
        console.log('\n💡 Try running this SQL manually in Supabase Dashboard:');
        console.log('   DELETE FROM supabase_migrations.schema_migrations;');
        console.log('');
        process.exit(1);
      }
    }

    console.log('✅ Migration history cleared!');
    console.log('\n💡 Next steps:');
    console.log('   1. Run: npx supabase db pull');
    console.log('   2. This will create a baseline migration from your current schema');
    console.log('   3. Then you can use: npm run db:push for future migrations');
    console.log('\n━'.repeat(50));
    console.log('✨ Reset complete!\n');

  } catch (error) {
    console.error('\n❌ Error:', error.message);
    console.log('\n💡 Alternative: Clear via Supabase Dashboard SQL Editor:');
    console.log('   DELETE FROM supabase_migrations.schema_migrations;');
    console.log('');
    process.exit(1);
  }
}

// Confirm before running
const readline = require('readline').createInterface({
  input: process.stdin,
  output: process.stdout
});

readline.question('\n⚠️  Are you sure you want to reset migration history? (yes/no): ', (answer) => {
  readline.close();

  if (answer.toLowerCase() === 'yes') {
    resetMigrationHistory();
  } else {
    console.log('\n❌ Reset cancelled.\n');
    process.exit(0);
  }
});
