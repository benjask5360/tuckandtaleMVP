const { Client } = require('pg');
require('dotenv').config({ path: '.env.local' });

const password = process.env.SUPABASE_DB_PASSWORD;
const projectRef = 'iolimejvugpcpnmruqww';

async function checkView() {
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

    // Get the view definition
    const result = await client.query(`
      SELECT pg_get_viewdef('stories', true) as definition
    `);

    console.log('📋 Current "stories" VIEW definition:');
    console.log('='.repeat(80));
    console.log(result.rows[0].definition);
    console.log('='.repeat(80));

    await client.end();
  } catch (error) {
    console.error('❌ Error:', error.message);
    process.exit(1);
  }
}

checkView();
