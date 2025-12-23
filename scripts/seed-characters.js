#!/usr/bin/env node
/**
 * Seed Script: Create 15 Other Characters (10 Pets + 5 Magical Beings)
 *
 * Creates test character profiles for the hello@tuckandtale.com admin account.
 * Validates all values against the allowed form options before inserting.
 *
 * Usage: node scripts/seed-characters.js
 *        node scripts/seed-characters.js --force  (deletes existing and recreates)
 */

const { Client } = require('pg');
const path = require('path');

// Load environment variables
const envPath = path.join(__dirname, '..', '.env.local');
require('dotenv').config({ path: envPath });

// =============================================================================
// ALLOWED VALUES (from lib/character-types.ts)
// =============================================================================

const ALLOWED_VALUES = {
  // Pet fields
  species: ['dog', 'cat', 'bird', 'rabbit', 'hamster', 'fish', 'turtle', 'horse'],
  petEyeColor: ['blue', 'brown', 'green', 'amber', 'hazel', 'gray', 'black'],
  primaryColor: ['white', 'black', 'brown', 'gray', 'golden', 'tan', 'orange', 'spotted', 'striped'],

  // Magical creature fields
  creatureType: ['dragon', 'unicorn', 'fairy', 'phoenix', 'mermaid', 'griffin', 'elf', 'wizard'],
  magicalColor: ['gold', 'silver', 'rainbow', 'purple', 'blue', 'green', 'red', 'white', 'black']
};

// =============================================================================
// CHARACTER PROFILES DATA
// =============================================================================

const PET_PROFILES = [
  {
    name: 'Biscuit',
    species: 'dog',
    breed: 'Golden Retriever',
    primaryColor: 'golden',
    eyeColor: 'brown'
  },
  {
    name: 'Luna',
    species: 'dog',
    breed: 'Black Lab',
    primaryColor: 'black',
    eyeColor: 'brown'
  },
  {
    name: 'Cooper',
    species: 'dog',
    breed: 'Beagle',
    primaryColor: 'brown',
    eyeColor: 'hazel'
  },
  {
    name: 'Daisy',
    species: 'dog',
    breed: 'Corgi',
    primaryColor: 'golden',
    eyeColor: 'brown'
  },
  {
    name: 'Max',
    species: 'dog',
    breed: 'German Shepherd',
    primaryColor: 'tan',
    eyeColor: 'brown'
  },
  {
    name: 'Bella',
    species: 'dog',
    breed: 'Goldendoodle',
    primaryColor: 'golden',
    eyeColor: 'brown'
  },
  {
    name: 'Charlie',
    species: 'dog',
    breed: 'Bulldog',
    primaryColor: 'white',
    eyeColor: 'brown'
  },
  {
    name: 'Rosie',
    species: 'dog',
    breed: 'Cavalier King Charles',
    primaryColor: 'brown',
    eyeColor: 'brown'
  },
  {
    name: 'Bear',
    species: 'dog',
    breed: 'Bernese Mountain Dog',
    primaryColor: 'black',
    eyeColor: 'brown'
  },
  {
    name: 'Penny',
    species: 'dog',
    breed: 'Australian Shepherd',
    primaryColor: 'gray',
    eyeColor: 'blue'
  }
];

const MAGICAL_PROFILES = [
  {
    name: 'Sparkle',
    creatureType: 'unicorn',
    color: 'white'
  },
  {
    name: 'Blaze',
    creatureType: 'dragon',
    color: 'red'
  },
  {
    name: 'Whiskers',
    creatureType: 'wizard',
    color: 'purple'
  },
  {
    name: 'Flutter',
    creatureType: 'fairy',
    color: 'rainbow'
  },
  {
    name: 'Cosmo',
    creatureType: 'phoenix',
    color: 'gold'
  }
];

const ADMIN_EMAIL = 'hello@tuckandtale.com';

// =============================================================================
// VALIDATION FUNCTIONS
// =============================================================================

function validatePetProfile(profile) {
  const errors = [];

  if (profile.species && !ALLOWED_VALUES.species.includes(profile.species)) {
    errors.push(`Invalid species: "${profile.species}". Allowed: ${ALLOWED_VALUES.species.join(', ')}`);
  }

  if (profile.primaryColor && !ALLOWED_VALUES.primaryColor.includes(profile.primaryColor)) {
    errors.push(`Invalid primaryColor: "${profile.primaryColor}". Allowed: ${ALLOWED_VALUES.primaryColor.join(', ')}`);
  }

  if (profile.eyeColor && !ALLOWED_VALUES.petEyeColor.includes(profile.eyeColor)) {
    errors.push(`Invalid eyeColor: "${profile.eyeColor}". Allowed: ${ALLOWED_VALUES.petEyeColor.join(', ')}`);
  }

  // breed is free-form text, no validation needed

  return errors;
}

function validateMagicalProfile(profile) {
  const errors = [];

  if (profile.creatureType && !ALLOWED_VALUES.creatureType.includes(profile.creatureType)) {
    errors.push(`Invalid creatureType: "${profile.creatureType}". Allowed: ${ALLOWED_VALUES.creatureType.join(', ')}`);
  }

  if (profile.color && !ALLOWED_VALUES.magicalColor.includes(profile.color)) {
    errors.push(`Invalid color: "${profile.color}". Allowed: ${ALLOWED_VALUES.magicalColor.join(', ')}`);
  }

  return errors;
}

// =============================================================================
// MAIN SCRIPT
// =============================================================================

async function seedCharacters() {
  console.log('\n========================================');
  console.log('  SEED SCRIPT: Create 15 Characters');
  console.log('  (10 Pets + 5 Magical Beings)');
  console.log('========================================\n');

  const forceMode = process.argv.includes('--force');

  // Validate environment
  const password = process.env.SUPABASE_DB_PASSWORD;
  if (!password) {
    console.error('❌ SUPABASE_DB_PASSWORD not found in .env.local');
    process.exit(1);
  }

  // Validate all profiles first
  console.log('📋 Validating all profile data against allowed options...\n');
  let hasErrors = false;

  console.log('PETS:');
  for (const profile of PET_PROFILES) {
    const errors = validatePetProfile(profile);
    if (errors.length > 0) {
      console.error(`❌ ${profile.name}: VALIDATION FAILED`);
      errors.forEach(err => console.error(`   - ${err}`));
      hasErrors = true;
    } else {
      console.log(`✅ ${profile.name} (${profile.breed}): Valid`);
    }
  }

  console.log('\nMAGICAL BEINGS:');
  for (const profile of MAGICAL_PROFILES) {
    const errors = validateMagicalProfile(profile);
    if (errors.length > 0) {
      console.error(`❌ ${profile.name}: VALIDATION FAILED`);
      errors.forEach(err => console.error(`   - ${err}`));
      hasErrors = true;
    } else {
      console.log(`✅ ${profile.name} (${profile.creatureType}): Valid`);
    }
  }

  if (hasErrors) {
    console.error('\n⚠️  Some profiles have invalid data. Aborting.');
    process.exit(1);
  }

  console.log('\n✅ All 15 character profiles validated successfully!\n');

  // Connect to database
  const projectRef = 'iolimejvugpcpnmruqww';
  const PORT = process.env.SUPABASE_DB_PORT || 6543;

  const client = new Client({
    host: `db.${projectRef}.supabase.co`,
    port: PORT,
    user: 'postgres',
    password: password,
    database: 'postgres',
    ssl: { rejectUnauthorized: false },
  });

  try {
    await client.connect();
    console.log('✅ Connected to database\n');

    // Find admin user
    console.log(`🔍 Looking up admin user: ${ADMIN_EMAIL}`);
    const { rows: users } = await client.query(
      `SELECT id, email FROM auth.users WHERE email = $1`,
      [ADMIN_EMAIL]
    );

    if (users.length === 0) {
      console.error(`❌ Admin user not found: ${ADMIN_EMAIL}`);
      process.exit(1);
    }

    const adminUserId = users[0].id;
    console.log(`✅ Found admin user: ${adminUserId}\n`);

    // Check for existing pet and magical creature profiles
    const { rows: existingPets } = await client.query(
      `SELECT name FROM character_profiles WHERE user_id = $1 AND character_type = 'pet'`,
      [adminUserId]
    );

    const { rows: existingMagical } = await client.query(
      `SELECT name FROM character_profiles WHERE user_id = $1 AND character_type = 'magical_creature'`,
      [adminUserId]
    );

    if (existingPets.length > 0 || existingMagical.length > 0) {
      console.log(`⚠️  Found existing profiles:`);
      if (existingPets.length > 0) {
        console.log(`   Pets: ${existingPets.map(e => e.name).join(', ')}`);
      }
      if (existingMagical.length > 0) {
        console.log(`   Magical: ${existingMagical.map(e => e.name).join(', ')}`);
      }

      if (forceMode) {
        console.log('\n🗑️  --force flag detected, deleting existing profiles...');
        await client.query(
          `DELETE FROM character_profiles WHERE user_id = $1 AND character_type IN ('pet', 'magical_creature')`,
          [adminUserId]
        );
        console.log('✅ Deleted existing profiles\n');
      } else {
        console.log('   Use --force to delete and recreate all profiles.\n');
      }
    }

    // Insert pet profiles
    console.log('💾 Inserting PET profiles...\n');

    let petsCreated = 0;
    let petsSkipped = 0;

    for (const profile of PET_PROFILES) {
      // Check if this specific profile exists
      const { rows: existingProfile } = await client.query(
        `SELECT id FROM character_profiles WHERE user_id = $1 AND name = $2 AND character_type = 'pet'`,
        [adminUserId, profile.name]
      );

      if (existingProfile.length > 0 && !forceMode) {
        console.log(`   ⏭️  ${profile.name} - already exists, skipping`);
        petsSkipped++;
        continue;
      }

      // Build attributes object
      const attributes = {
        name: profile.name,
        species: profile.species,
        breed: profile.breed,
        primaryColor: profile.primaryColor,
        eyeColor: profile.eyeColor
      };

      // Build appearance description
      const appearance_description = `A happy ${profile.primaryColor} ${profile.breed} with ${profile.eyeColor} eyes.`;

      // Insert
      const { rows: inserted } = await client.query(
        `INSERT INTO character_profiles (
          user_id,
          character_type,
          name,
          attributes,
          appearance_description,
          is_primary
        ) VALUES ($1, $2, $3, $4, $5, $6)
        RETURNING id`,
        [
          adminUserId,
          'pet',
          profile.name,
          JSON.stringify(attributes),
          appearance_description,
          false
        ]
      );

      console.log(`   ✅ ${profile.name} (${profile.breed}) - ID: ${inserted[0].id}`);
      petsCreated++;
    }

    // Insert magical creature profiles
    console.log('\n💾 Inserting MAGICAL CREATURE profiles...\n');

    let magicalCreated = 0;
    let magicalSkipped = 0;

    for (const profile of MAGICAL_PROFILES) {
      // Check if this specific profile exists
      const { rows: existingProfile } = await client.query(
        `SELECT id FROM character_profiles WHERE user_id = $1 AND name = $2 AND character_type = 'magical_creature'`,
        [adminUserId, profile.name]
      );

      if (existingProfile.length > 0 && !forceMode) {
        console.log(`   ⏭️  ${profile.name} - already exists, skipping`);
        magicalSkipped++;
        continue;
      }

      // Build attributes object
      const attributes = {
        name: profile.name,
        creatureType: profile.creatureType,
        color: profile.color
      };

      // Build appearance description
      const appearance_description = `A magical ${profile.color} ${profile.creatureType} with enchanting features.`;

      // Insert
      const { rows: inserted } = await client.query(
        `INSERT INTO character_profiles (
          user_id,
          character_type,
          name,
          attributes,
          appearance_description,
          is_primary
        ) VALUES ($1, $2, $3, $4, $5, $6)
        RETURNING id`,
        [
          adminUserId,
          'magical_creature',
          profile.name,
          JSON.stringify(attributes),
          appearance_description,
          false
        ]
      );

      console.log(`   ✅ ${profile.name} (${profile.creatureType}) - ID: ${inserted[0].id}`);
      magicalCreated++;
    }

    console.log('\n========================================');
    console.log('  ✅ SEED COMPLETE');
    console.log('========================================');
    console.log(`   Pets Created:    ${petsCreated}`);
    console.log(`   Pets Skipped:    ${petsSkipped}`);
    console.log(`   Magical Created: ${magicalCreated}`);
    console.log(`   Magical Skipped: ${magicalSkipped}`);
    console.log(`   Total:           ${PET_PROFILES.length + MAGICAL_PROFILES.length}`);
    console.log('');

  } catch (error) {
    console.error('\n❌ Error:', error.message);
    process.exit(1);
  } finally {
    await client.end();
  }
}

seedCharacters();
