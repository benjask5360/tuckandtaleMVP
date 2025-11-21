/**
 * Regenerate Cheeto's appearance_description
 * This will test if manually running the description generation works
 */

const { Client } = require('pg');
require('dotenv').config({ path: '.env.local' });

const password = process.env.SUPABASE_DB_PASSWORD;
const projectRef = 'iolimejvugpcpnmruqww';

/**
 * Build pet description (matching descriptionBuilder.ts logic)
 */
function buildPetDescription(attributes) {
  console.log('\n📝 Building description from attributes:', JSON.stringify(attributes, null, 2));

  const parts = [];

  // Get species/breed
  let species = '';
  if (attributes.breed) {
    species = attributes.breed;
  } else if (attributes.species) {
    species = attributes.species;
  }

  // Get color - trim whitespace
  let petColor = attributes.primaryColor;
  if (petColor) {
    petColor = petColor.trim();
  }

  console.log(`   Species: "${species}"`);
  console.log(`   Color: "${petColor}"`);

  // Build description
  if (petColor && species) {
    parts.push(`A ${petColor} ${species}`);
  } else if (species) {
    parts.push(`A ${species}`);
  } else {
    parts.push('A pet');
    console.log('   ⚠️ Defaulting to "A pet" - missing species!');
  }

  // Add eye color
  const petAttributes = [];
  if (attributes.eyeColor) {
    petAttributes.push(`${attributes.eyeColor} eyes`);
  }

  if (petAttributes.length > 0) {
    parts.push('with');
    parts.push(petAttributes.join(' and '));
  }

  const description = parts.join(' ');
  console.log(`   Final: "${description}"`);
  return description;
}

async function regenerateCheeto() {
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
    console.log('REGENERATE CHEETO\'S DESCRIPTION');
    console.log('='.repeat(80));

    // Fetch Cheeto
    const result = await client.query(`
      SELECT
        id,
        name,
        character_type,
        attributes,
        appearance_description
      FROM character_profiles
      WHERE name = 'Cheeto'
      LIMIT 1
    `);

    if (result.rows.length === 0) {
      console.error('❌ Cheeto not found!');
      process.exit(1);
    }

    const cheeto = result.rows[0];
    console.log('\n📋 Current Cheeto:');
    console.log('   Name:', cheeto.name);
    console.log('   Type:', cheeto.character_type);
    console.log('   Current Description:', cheeto.appearance_description);
    console.log('   Attributes:', JSON.stringify(cheeto.attributes, null, 2));

    // Generate new description
    const newDescription = buildPetDescription(cheeto.attributes);

    console.log('\n' + '='.repeat(80));
    console.log('COMPARISON:');
    console.log('='.repeat(80));
    console.log('Old:', cheeto.appearance_description);
    console.log('New:', newDescription);

    if (cheeto.appearance_description === newDescription) {
      console.log('\n⚠️ Descriptions are the same - no update needed');
      await client.end();
      return;
    }

    // Update the database
    console.log('\n📝 Updating database...');
    await client.query(
      `UPDATE character_profiles
       SET appearance_description = $1
       WHERE id = $2`,
      [newDescription, cheeto.id]
    );

    console.log('✅ Successfully updated Cheeto\'s description!');

    // Verify
    const verifyResult = await client.query(
      `SELECT appearance_description FROM character_profiles WHERE id = $1`,
      [cheeto.id]
    );

    console.log('\n🔍 Verification:');
    console.log('   Updated Description:', verifyResult.rows[0].appearance_description);

    await client.end();
  } catch (error) {
    console.error('❌ Error:', error.message);
    process.exit(1);
  }
}

regenerateCheeto();
