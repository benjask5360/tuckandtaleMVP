#!/usr/bin/env node
/**
 * Push migrations using DEDICATED POOLER
 * This bypasses the broken shared pooler
 */

const { Client } = require('pg');
const fs = require('fs');
const path = require('path');
require('dotenv').config({ path: '.env.local' });

const password = process.env.SUPABASE_DB_PASSWORD;
const projectRef = 'iolimejvugpcpnmruqww';

async function pushMigrations() {
  console.log('\n🚀 Pushing Migrations via Dedicated Pooler');
  console.log('━'.repeat(50));

  const migrationsDir = path.join(__dirname, '..', 'supabase', 'migrations');

  if (!fs.existsSync(migrationsDir)) {
    console.log('✅ No migrations directory - nothing to push');
    return;
  }

  const files = fs.readdirSync(migrationsDir)
    .filter(f => f.endsWith('.sql'))
    .sort();

  if (files.length === 0) {
    console.log('✅ No migration files found');
    return;
  }

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
    console.log('✅ Connected to dedicated pooler');

    // Get already applied migrations
    const { rows } = await client.query(
      'SELECT version FROM supabase_migrations.schema_migrations ORDER BY version'
    );
    const applied = new Set(rows.map(r => r.version));

    console.log(`📊 Applied migrations: ${applied.size}`);
    console.log(`📁 Found migration files: ${files.length}`);
    console.log('');

    for (const file of files) {
      const version = file.replace('.sql', '');

      if (applied.has(version)) {
        console.log(`⏭️  ${file} - already applied`);
        continue;
      }

      console.log(`🔄 Applying: ${file}`);
      const sql = fs.readFileSync(path.join(migrationsDir, file), 'utf8');

      await client.query('BEGIN');
      try {
        await client.query(sql);
        await client.query(
          'INSERT INTO supabase_migrations.schema_migrations (version) VALUES ($1)',
          [version]
        );
        await client.query('COMMIT');
        console.log(`   ✅ Success`);
      } catch (err) {
        await client.query('ROLLBACK');
        console.log(`   ❌ Failed: ${err.message}`);
        throw err;
      }
    }

    console.log('\n━'.repeat(50));
    console.log('✨ All migrations applied!');
    console.log('');

  } catch (error) {
    console.error('\n❌ Error:', error.message);
    process.exit(1);
  } finally {
    await client.end();
  }
}

pushMigrations();
