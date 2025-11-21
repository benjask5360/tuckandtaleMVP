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

    // Check pet_color descriptors
    console.log('='.repeat(80));
    console.log('PET_COLOR DESCRIPTORS IN descriptors_attribute:');
    console.log('='.repeat(80));

    const petColorResult = await client.query(`
      SELECT
        simple_term,
        rich_description,
        attribute_type
      FROM descriptors_attribute
      WHERE attribute_type = 'pet_color'
      ORDER BY simple_term
    `);

    if (petColorResult.rows.length === 0) {
      console.log('❌ No pet_color descriptors found!');
    } else {
      console.log(`Found ${petColorResult.rows.length} pet_color descriptors:\n`);
      petColorResult.rows.forEach(row => {
        console.log(`  ${row.simple_term} → ${row.rich_description}`);
      });
    }

    console.log('\n' + '='.repeat(80));
    console.log('ALL ATTRIBUTE_TYPE VALUES:');
    console.log('='.repeat(80));

    const allTypesResult = await client.query(`
      SELECT DISTINCT attribute_type, COUNT(*) as count
      FROM descriptors_attribute
      GROUP BY attribute_type
      ORDER BY attribute_type
    `);

    allTypesResult.rows.forEach(row => {
      console.log(`  ${row.attribute_type}: ${row.count} entries`);
    });

    await client.end();
  } catch (error) {
    console.error('❌ Error:', error.message);
    process.exit(1);
  }
}

checkDescriptors();
