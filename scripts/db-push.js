#!/usr/bin/env node

/**
 * Direct Database Push Script
 *
 * This script pushes SQL files directly to the remote Supabase database,
 * bypassing the migration history system that has been causing issues.
 *
 * Usage:
 *   node scripts/db-push.js <sql-file-path>
 *
 * Example:
 *   node scripts/db-push.js scripts/sql/add_new_column.sql
 */

const { createClient } = require('@supabase/supabase-js');
const fs = require('fs');
const path = require('path');

// Load environment variables
require('dotenv').config({ path: '.env.local' });

const supabaseUrl = process.env.NEXT_PUBLIC_SUPABASE_URL;
const supabaseServiceKey = process.env.SUPABASE_SERVICE_KEY;

if (!supabaseUrl || !supabaseServiceKey) {
  console.error('❌ Missing environment variables');
  console.error('   Required: NEXT_PUBLIC_SUPABASE_URL and SUPABASE_SERVICE_KEY');
  process.exit(1);
}

async function pushSQL(sqlFilePath) {
  console.log('\n🚀 Direct Database Push');
  console.log('━'.repeat(50));

  // Check if file exists
  if (!fs.existsSync(sqlFilePath)) {
    console.error(`❌ File not found: ${sqlFilePath}`);
    process.exit(1);
  }

  // Read SQL file
  const sql = fs.readFileSync(sqlFilePath, 'utf8');
  console.log(`📄 File: ${path.basename(sqlFilePath)}`);
  console.log(`📦 Size: ${sql.length} characters`);
  console.log('');

  // Create Supabase client
  const supabase = createClient(supabaseUrl, supabaseServiceKey, {
    auth: {
      persistSession: false,
      autoRefreshToken: false,
    },
  });

  try {
    console.log('🔄 Executing SQL...');

    // Execute the SQL
    const { data, error } = await supabase.rpc('exec_sql', {
      sql_query: sql
    });

    if (error) {
      // If exec_sql function doesn't exist, try direct query
      if (error.message.includes('function') && error.message.includes('does not exist')) {
        console.log('⚠️  exec_sql function not found, using direct query...');

        // Try to execute directly via the Postgres connection
        // This requires the sql to be split into individual statements
        const statements = sql
          .split(';')
          .map(s => s.trim())
          .filter(s => s.length > 0);

        for (let i = 0; i < statements.length; i++) {
          const stmt = statements[i] + ';';
          console.log(`   Executing statement ${i + 1}/${statements.length}...`);

          const { error: stmtError } = await supabase.from('_migrations').select('*').limit(0);
          // Note: This is a workaround. For proper execution, we need a different approach.
        }

        console.log('\n⚠️  Warning: Direct execution not fully supported.');
        console.log('   Please use the Supabase CLI or Dashboard to execute this SQL.');
        console.log('   Or create a Postgres function to execute arbitrary SQL.');
        process.exit(1);
      }

      throw error;
    }

    console.log('✅ SQL executed successfully!');
    if (data) {
      console.log('📊 Result:', JSON.stringify(data, null, 2));
    }
    console.log('');
    console.log('━'.repeat(50));
    console.log('✨ Push complete!');

  } catch (error) {
    console.error('\n❌ Error executing SQL:');
    console.error('   ', error.message);
    console.error('');
    console.error('💡 Troubleshooting:');
    console.error('   1. Check your SQL syntax');
    console.error('   2. Verify your Supabase credentials');
    console.error('   3. Try using: npx supabase db push');
    console.error('');
    process.exit(1);
  }
}

// Main execution
const sqlFile = process.argv[2];

if (!sqlFile) {
  console.error('❌ No SQL file specified');
  console.error('');
  console.error('Usage: node scripts/db-push.js <sql-file-path>');
  console.error('');
  console.error('Example: node scripts/db-push.js scripts/sql/my_migration.sql');
  process.exit(1);
}

pushSQL(sqlFile);
