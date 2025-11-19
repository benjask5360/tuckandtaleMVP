#!/usr/bin/env node
/**
 * Check the actual definition of the stories view
 */

const { Client } = require('pg');
require('dotenv').config({ path: '.env.local' });

const password = process.env.SUPABASE_DB_PASSWORD;
const projectRef = 'iolimejvugpcpnmruqww';

async function checkStoriesView() {
  console.log('\n🔍 Checking Stories View Definition');
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

    // Get the full view definition
    console.log('📋 Current view definition:\n');
    const viewDef = await client.query(`
      SELECT pg_get_viewdef('public.stories'::regclass, true) as definition
    `);

    console.log(viewDef.rows[0].definition);
    console.log('');

    // Check if it has SECURITY DEFINER
    const hasSecurityDefiner = viewDef.rows[0].definition.toLowerCase().includes('security definer');

    if (hasSecurityDefiner) {
      console.log('❌ View HAS "SECURITY DEFINER" in definition');
    } else {
      console.log('✅ View does NOT have "SECURITY DEFINER" in definition');
    }

    // Check view options (security_invoker vs security_definer)
    console.log('\n📊 View security options:');
    const viewOptions = await client.query(`
      SELECT
        c.relname AS view_name,
        CASE c.relrowsecurity
          WHEN true THEN 'RLS Enabled'
          ELSE 'RLS Disabled'
        END as rls_status,
        c.reloptions AS options
      FROM pg_class c
      JOIN pg_namespace n ON n.oid = c.relnamespace
      WHERE c.relkind = 'v'
      AND n.nspname = 'public'
      AND c.relname = 'stories'
    `);

    console.log(JSON.stringify(viewOptions.rows, null, 2));

    // Check for security_invoker option (PostgreSQL 15+)
    console.log('\n🔐 Security mode check:');
    const securityMode = await client.query(`
      SELECT
        c.relname AS view_name,
        COALESCE(
          (SELECT option_value
           FROM pg_options_to_table(c.reloptions)
           WHERE option_name = 'security_invoker'),
          'false'
        ) AS security_invoker,
        COALESCE(
          (SELECT option_value
           FROM pg_options_to_table(c.reloptions)
           WHERE option_name = 'security_barrier'),
          'false'
        ) AS security_barrier
      FROM pg_class c
      JOIN pg_namespace n ON n.oid = c.relnamespace
      WHERE c.relkind = 'v'
      AND n.nspname = 'public'
      AND c.relname = 'stories'
    `);

    const mode = securityMode.rows[0];
    console.log(`   security_invoker: ${mode.security_invoker}`);
    console.log(`   security_barrier: ${mode.security_barrier}`);

    if (mode.security_invoker === 'true') {
      console.log('   ✅ View uses SECURITY INVOKER (safe - uses caller permissions)');
    } else {
      console.log('   ⚠️  View uses SECURITY DEFINER (uses creator permissions - this is the issue!)');
      console.log('   🔧 This should be fixed by setting security_invoker=true');
    }

    console.log('\n━'.repeat(50));

  } catch (error) {
    console.error('\n❌ Error:', error.message);
    process.exit(1);
  } finally {
    await client.end();
  }
}

checkStoriesView();
