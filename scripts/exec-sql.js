#!/usr/bin/env node

/**
 * Execute SQL Directly
 *
 * This script executes SQL files directly against your remote Supabase database
 * using the Management API.
 */

const fs = require('fs');
const path = require('path');
require('dotenv').config({ path: '.env.local' });

const supabaseUrl = process.env.NEXT_PUBLIC_SUPABASE_URL;
const supabaseServiceKey = process.env.SUPABASE_SERVICE_KEY;

if (!supabaseUrl || !supabaseServiceKey) {
  console.error('❌ Missing environment variables');
  process.exit(1);
}

const projectRef = supabaseUrl.match(/https:\/\/([^.]+)\.supabase\.co/)[1];

async function executeSQLFile(sqlFile) {
  console.log('\n🚀 Execute SQL');
  console.log('━'.repeat(50));

  if (!fs.existsSync(sqlFile)) {
    console.error(`❌ File not found: ${sqlFile}`);
    process.exit(1);
  }

  const sql = fs.readFileSync(sqlFile, 'utf8');
  console.log(`📄 File: ${path.basename(sqlFile)}`);
  console.log(`📦 Size: ${sql.length} bytes`);
  console.log('');

  // Use Supabase Management API
  const apiUrl = `https://api.supabase.com/v1/projects/${projectRef}/database/query`;

  console.log('🔄 Executing SQL via Supabase API...');

  try {
    const fetch = (await import('node-fetch')).default;
    const response = await fetch(apiUrl, {
      method: 'POST',
      headers: {
        'Authorization': `Bearer ${supabaseServiceKey}`,
        'Content-Type': 'application/json',
        'apikey': supabaseServiceKey
      },
      body: JSON.stringify({
        query: sql
      })
    });

    if (!response.ok) {
      const error = await response.text();
      throw new Error(`API Error: ${response.status} - ${error}`);
    }

    const result = await response.json();
    console.log('✅ SQL executed successfully!');

    if (result) {
      console.log('📊 Result:', JSON.stringify(result, null, 2));
    }

    console.log('');
    console.log('━'.repeat(50));
    console.log('✨ Complete!');

  } catch (error) {
    console.error('\n❌ Error:', error.message);
    console.log('\n💡 Manual alternative:');
    console.log(`   1. Go to: https://supabase.com/dashboard/project/${projectRef}/sql`);
    console.log(`   2. Copy the contents of: ${sqlFile}`);
    console.log('   3. Paste and run in the SQL Editor');
    console.log('');
    process.exit(1);
  }
}

const sqlFile = process.argv[2] || 'scripts/sql/reset_migration_history.sql';
executeSQLFile(sqlFile);
