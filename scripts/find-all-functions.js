#!/usr/bin/env node
/**
 * Find all functions in the database that need search_path fix
 */

const { Client } = require('pg');
require('dotenv').config({ path: '.env.local' });

const password = process.env.SUPABASE_DB_PASSWORD;
const projectRef = 'iolimejvugpcpnmruqww';

async function findAllFunctions() {
  console.log('\n🔍 Finding All Functions That Need search_path Fix');
  console.log('━'.repeat(50));

  const client = new Client({
    host: `db.${projectRef}.supabase.co`,
    port: 6543,
    user: 'postgres',
    password: password,
    database: 'postgres',
    ssl: { rejectUnauthorized: false },
  });

  try {
    await client.connect();
    console.log('✅ Connected to database\n');

    // Get all functions in public schema
    const functionsQuery = await client.query(`
      SELECT
        p.proname AS function_name,
        pg_get_functiondef(p.oid) AS function_definition
      FROM pg_proc p
      JOIN pg_namespace n ON p.pronamespace = n.oid
      WHERE n.nspname = 'public'
      AND p.proname IN (
        'get_remaining_regenerations',
        'increment_avatar_generation',
        'delete_user_safely',
        'handle_updated_at',
        'handle_new_user',
        'update_updated_at_column',
        'get_gender_descriptor_for_age',
        'delete_user_completely',
        'increment_generation_usage',
        'update_api_prices_updated_at'
      )
      ORDER BY p.proname
    `);

    console.log(`Found ${functionsQuery.rows.length} functions:\n`);

    functionsQuery.rows.forEach((row, idx) => {
      console.log(`${idx + 1}. ${row.function_name}`);

      // Check if SET search_path is already present
      const hasSearchPath = row.function_definition.includes('SET search_path');
      console.log(`   ${hasSearchPath ? '✅' : '❌'} Has SET search_path: ${hasSearchPath}`);

      // Check if SECURITY DEFINER
      const hasSecurityDefiner = row.function_definition.includes('SECURITY DEFINER');
      console.log(`   ${hasSecurityDefiner ? '⚠️ ' : '  '} SECURITY DEFINER: ${hasSecurityDefiner}`);

      console.log('');
    });

    console.log('━'.repeat(50));
    console.log('\n📋 Functions that exist in database:');
    functionsQuery.rows.forEach(row => {
      console.log(`   - ${row.function_name}`);
    });

  } catch (error) {
    console.error('\n❌ Error:', error.message);
    process.exit(1);
  } finally {
    await client.end();
  }
}

findAllFunctions();
