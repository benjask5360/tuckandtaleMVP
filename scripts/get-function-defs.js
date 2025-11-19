#!/usr/bin/env node
/**
 * Get full function definitions for all 10 functions
 */

const { Client } = require('pg');
const fs = require('fs');
require('dotenv').config({ path: '.env.local' });

const password = process.env.SUPABASE_DB_PASSWORD;
const projectRef = 'iolimejvugpcpnmruqww';

async function getFunctionDefinitions() {
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

    const functionsQuery = await client.query(`
      SELECT
        p.proname AS function_name,
        pg_get_functiondef(p.oid) AS function_definition
      FROM pg_proc p
      JOIN pg_namespace n ON p.pronamespace = n.oid
      WHERE n.nspname = 'public'
      AND p.proname IN (
        'delete_user_safely',
        'delete_user_completely'
      )
      ORDER BY p.proname
    `);

    console.log('Function Definitions:\n');
    console.log('='.repeat(80));

    functionsQuery.rows.forEach((row) => {
      console.log(`\n${row.function_name}:\n`);
      console.log(row.function_definition);
      console.log('\n' + '='.repeat(80));
    });

  } catch (error) {
    console.error('Error:', error.message);
    process.exit(1);
  } finally {
    await client.end();
  }
}

getFunctionDefinitions();
