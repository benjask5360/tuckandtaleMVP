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
    console.log('EYE COLOR DESCRIPTORS:');
    console.log('='.repeat(80));

    const result = await client.query(`
      SELECT
        simple_term,
        rich_description
      FROM descriptors_attribute
      WHERE attribute_type = 'eyes'
        AND is_active = true
      ORDER BY simple_term
      LIMIT 20
    `);

    console.log(`Found ${result.rows.length} eye color descriptors:\n`);
    result.rows.forEach(row => {
      console.log(`  "${row.simple_term}" → "${row.rich_description}"`);
    });

    await client.end();
  } catch (error) {
    console.error('❌ Error:', error.message);
    process.exit(1);
  }
}

checkDescriptors();
