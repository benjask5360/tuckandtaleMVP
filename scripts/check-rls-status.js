#!/usr/bin/env node
/**
 * Check RLS status on subscription_tiers table
 */

const { Client } = require('pg');
require('dotenv').config({ path: '.env.local' });

const password = process.env.SUPABASE_DB_PASSWORD;
const projectRef = 'iolimejvugpcpnmruqww';

async function checkRLSStatus() {
  console.log('\n🔍 Checking RLS Status');
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

    // Check 1: RLS enabled status
    console.log('1️⃣  RLS Status on subscription_tiers:');
    const rlsResult = await client.query(`
      SELECT
        schemaname,
        tablename,
        rowsecurity as rls_enabled
      FROM pg_tables
      WHERE schemaname = 'public'
      AND tablename = 'subscription_tiers'
    `);

    if (rlsResult.rows.length > 0) {
      const rls = rlsResult.rows[0];
      console.log(`   ${rls.rls_enabled ? '✅' : '❌'} RLS ${rls.rls_enabled ? 'ENABLED' : 'DISABLED'}`);
    }

    // Check 2: RLS policies
    console.log('\n2️⃣  RLS Policies on subscription_tiers:');
    const policiesResult = await client.query(`
      SELECT
        policyname,
        cmd,
        roles::text[],
        qual::text as using_expr,
        with_check::text as check_expr
      FROM pg_policies
      WHERE schemaname = 'public'
      AND tablename = 'subscription_tiers'
      ORDER BY policyname
    `);

    if (policiesResult.rows.length > 0) {
      console.log(`   Found ${policiesResult.rows.length} policies:`);
      policiesResult.rows.forEach(p => {
        console.log(`   ✅ ${p.policyname}`);
        console.log(`      - Command: ${p.cmd}`);
        console.log(`      - Roles: ${p.roles}`);
      });
    } else {
      console.log('   ❌ No policies found');
    }

    // Check 3: subscription_tiers_backup existence
    console.log('\n3️⃣  Checking for backup table:');
    const backupResult = await client.query(`
      SELECT tablename
      FROM pg_tables
      WHERE schemaname = 'public'
      AND tablename = 'subscription_tiers_backup'
    `);

    if (backupResult.rows.length === 0) {
      console.log('   ✅ subscription_tiers_backup table DROPPED (as expected)');
    } else {
      console.log('   ❌ subscription_tiers_backup table still exists');
    }

    // Check 4: Test read access
    console.log('\n4️⃣  Testing read access to subscription_tiers:');
    const readResult = await client.query(`
      SELECT id, name, is_active
      FROM subscription_tiers
      ORDER BY name
    `);

    if (readResult.rows.length > 0) {
      console.log(`   ✅ Successfully read ${readResult.rows.length} tiers:`);
      readResult.rows.forEach(tier => {
        console.log(`      - ${tier.name} (${tier.id}) - Active: ${tier.is_active}`);
      });
    }

    console.log('\n━'.repeat(50));
    console.log('✅ Security check complete!\n');

  } catch (error) {
    console.error('\n❌ Error:', error.message);
    process.exit(1);
  } finally {
    await client.end();
  }
}

checkRLSStatus();
