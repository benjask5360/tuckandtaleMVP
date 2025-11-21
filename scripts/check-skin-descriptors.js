const { Client } = require('pg');
require('dotenv').config({ path: '.env.local' });

const password = process.env.SUPABASE_DB_PASSWORD;
const projectRef = 'iolimejvugpcpnmruqww';

async function checkDescriptors() {
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

    console.log('='.repeat(80));
    console.log('SKIN TONE DESCRIPTORS:');
    console.log('='.repeat(80));

    const result = await client.query(`
      SELECT
        id,
        simple_term,
        rich_description,
        is_active
      FROM descriptors_attribute
      WHERE attribute_type = 'skin'
      ORDER BY simple_term
    `);

    console.log(`Found ${result.rows.length} skin tone descriptors:\n`);
    result.rows.forEach(row => {
      const status = row.is_active ? '✓' : '✗';
      console.log(`  [${status}] "${row.simple_term}" → "${row.rich_description}" (ID: ${row.id})`);
    });

    await client.end();
  } catch (error) {
    console.error('❌ Error:', error.message);
    process.exit(1);
  }
}

checkDescriptors();
