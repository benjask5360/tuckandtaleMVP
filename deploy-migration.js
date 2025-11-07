const { Client } = require('pg');
const fs = require('fs');
const path = require('path');

const client = new Client({
  host: 'aws-1-us-east-2.connect.psdb.cloud',
  port: 6543,
  database: 'postgres',
  user: 'postgres.iolimejvugpcpnmruqww',
  password: 'adsdf7897JKH',
  ssl: {
    rejectUnauthorized: false
  },
  connectionTimeoutMillis: 30000,
});

async function deployMigration() {
  try {
    console.log('Connecting to Supabase...');
    await client.connect();
    console.log('Connected successfully!');

    // Read the migration file
    const migrationSQL = fs.readFileSync(
      path.join(__dirname, 'DEPLOY_AVATAR_MIGRATION.sql'),
      'utf8'
    );

    console.log('Executing migration...');
    await client.query(migrationSQL);
    console.log('✅ Migration deployed successfully!');

  } catch (error) {
    console.error('❌ Error:', error.message);
    process.exit(1);
  } finally {
    await client.end();
  }
}

deployMigration();
