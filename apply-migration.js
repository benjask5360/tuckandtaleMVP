/**
 * Utility script to apply SQL migration files to Supabase
 * Executes SQL statements individually using Supabase client
 */

const { createClient } = require('@supabase/supabase-js');
const fs = require('fs');
const path = require('path');

const supabaseUrl = process.env.NEXT_PUBLIC_SUPABASE_URL;
const supabaseServiceKey = process.env.SUPABASE_SERVICE_KEY;

if (!supabaseUrl || !supabaseServiceKey) {
  console.error('Missing Supabase credentials');
  console.error('NEXT_PUBLIC_SUPABASE_URL:', supabaseUrl);
  console.error('SUPABASE_SERVICE_KEY:', supabaseServiceKey ? 'present' : 'missing');
  process.exit(1);
}

const supabase = createClient(supabaseUrl, supabaseServiceKey, {
  auth: {
    autoRefreshToken: false,
    persistSession: false
  }
});

async function applyMigration(migrationFilePath) {
  console.log(`\nReading migration file: ${migrationFilePath}`);

  // Read the SQL file
  const sqlContent = fs.readFileSync(migrationFilePath, 'utf8');

  console.log('\n=== SQL to be executed ===');
  console.log(sqlContent);
  console.log('========================\n');

  // Split into individual SQL statements (basic parsing)
  // Remove comments and split by semicolons
  const statements = sqlContent
    .split('\n')
    .filter(line => !line.trim().startsWith('--'))
    .join('\n')
    .split(';')
    .map(stmt => stmt.trim())
    .filter(stmt => stmt.length > 0);

  console.log(`Found ${statements.length} SQL statement(s) to execute\n`);

  for (let i = 0; i < statements.length; i++) {
    const stmt = statements[i];
    console.log(`\nExecuting statement ${i + 1}/${statements.length}...`);
    console.log(stmt.substring(0, 100) + (stmt.length > 100 ? '...' : ''));

    try {
      const { data, error } = await supabase.rpc('exec_sql', { query: stmt });

      if (error) {
        console.error(`\n❌ Statement ${i + 1} failed:`, error.message);
        throw error;
      }

      console.log(`✅ Statement ${i + 1} executed successfully`);
      if (data) {
        console.log('Result:', data);
      }
    } catch (error) {
      console.error(`\n❌ Failed to execute statement ${i + 1}:`, error.message);
      throw error;
    }
  }

  console.log('\n✅ All statements executed successfully!');
}

// Get migration file path from command line
const migrationFile = process.argv[2];

if (!migrationFile) {
  console.error('Usage: node apply-migration.js <path-to-migration-file.sql>');
  process.exit(1);
}

const fullPath = path.resolve(migrationFile);

if (!fs.existsSync(fullPath)) {
  console.error(`Migration file not found: ${fullPath}`);
  process.exit(1);
}

applyMigration(fullPath)
  .then(() => {
    console.log('\n✅ Done!');
    process.exit(0);
  })
  .catch((error) => {
    console.error('\n❌ Script failed:', error.message);
    process.exit(1);
  });
