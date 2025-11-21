const { Client } = require('pg');
require('dotenv').config({ path: '.env.local' });

const password = process.env.SUPABASE_DB_PASSWORD;
const projectRef = 'iolimejvugpcpnmruqww';

async function deactivateMedium() {
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
    console.log('DEACTIVATING "medium" SKIN TONE DESCRIPTOR');
    console.log('='.repeat(80));

    // Update the medium descriptor to inactive
    const result = await client.query(`
      UPDATE descriptors_attribute
      SET is_active = false
      WHERE attribute_type = 'skin'
        AND simple_term = 'medium'
      RETURNING id, simple_term, rich_description, is_active
    `);

    if (result.rows.length > 0) {
      console.log('\n✅ Successfully deactivated:');
      result.rows.forEach(row => {
        console.log(`   ID: ${row.id}`);
        console.log(`   Simple Term: ${row.simple_term}`);
        console.log(`   Rich Description: ${row.rich_description}`);
        console.log(`   Active: ${row.is_active}`);
      });
    } else {
      console.log('\n⚠️ No "medium" descriptor found to deactivate');
    }

    console.log('\n' + '='.repeat(80));
    console.log('REMAINING ACTIVE SKIN TONE DESCRIPTORS:');
    console.log('='.repeat(80));

    const activeResult = await client.query(`
      SELECT simple_term, rich_description
      FROM descriptors_attribute
      WHERE attribute_type = 'skin'
        AND is_active = true
      ORDER BY simple_term
    `);

    console.log(`\nActive skin tones (${activeResult.rows.length}):\n`);
    activeResult.rows.forEach(row => {
      console.log(`  ✓ "${row.simple_term}" → "${row.rich_description}"`);
    });

    await client.end();
  } catch (error) {
    console.error('❌ Error:', error.message);
    process.exit(1);
  }
}

deactivateMedium();
