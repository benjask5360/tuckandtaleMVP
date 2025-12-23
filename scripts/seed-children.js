#!/usr/bin/env node
/**
 * Seed Script: Create 15 Child Profiles
 *
 * Creates test child profiles for the hello@tuckandtale.com admin account.
 * Validates all values against the allowed form options before inserting.
 *
 * Usage: node scripts/seed-children.js
 *        node scripts/seed-children.js --force  (deletes existing and recreates)
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
  gender: ['male', 'female', 'non-binary'],
  hairColor: ['blonde', 'brown', 'black', 'red', 'auburn'],
  hairLength: ['infant_hair', 'short', 'medium', 'long', 'very_long', 'bald'],
  hairType: ['straight', 'wavy', 'curly', 'coily'],
  eyeColor: ['blue', 'brown', 'green', 'hazel', 'gray'],
  skinTone: ['fair', 'light', 'olive', 'tan', 'brown', 'dark'],
  bodyType: ['slender', 'average', 'athletic', 'strong', 'husky', 'round'],
  background: [
    'white',
    'black_african_american',
    'american_indian_alaska_native',
    'asian',
    'native_hawaiian_pacific_islander',
    'middle_eastern_north_african',
    'hispanic_latino',
    'other'
  ],
  interests: [
    'animals', 'sports', 'music', 'art', 'science',
    'reading', 'outdoors', 'technology', 'cooking', 'dancing'
  ],
  growthAreas: [
    'emotional_regulation', 'social_skills', 'confidence', 'patience',
    'sharing', 'listening', 'problem_solving', 'creativity',
    'independence', 'responsibility'
  ]
};

// =============================================================================
// CHILD PROFILES DATA
// =============================================================================

const CHILD_PROFILES = [
  {
    name: 'Emma',
    dateOfBirth: '2021-12-22',
    gender: 'female',
    hairColor: 'blonde',
    hairLength: 'long',
    hairType: 'straight',
    eyeColor: 'blue',
    skinTone: 'fair',
    bodyType: 'average',
    hasGlasses: false,
    background: 'white',
    interests: ['animals', 'art'],
    growthAreas: ['emotional_regulation']
  },
  {
    name: 'Liam',
    dateOfBirth: '2019-12-22',
    gender: 'male',
    hairColor: 'brown',
    hairLength: 'short',
    hairType: 'straight',
    eyeColor: 'brown',
    skinTone: 'light',
    bodyType: 'athletic',
    hasGlasses: false,
    background: 'white',
    interests: ['sports', 'outdoors'],
    growthAreas: ['patience']
  },
  {
    name: 'Olivia',
    dateOfBirth: '2022-12-22',
    gender: 'female',
    hairColor: 'black',
    hairLength: 'medium',
    hairType: 'coily',
    eyeColor: 'brown',
    skinTone: 'dark',
    bodyType: 'average',
    hasGlasses: false,
    background: 'black_african_american',
    interests: ['music', 'dancing'],
    growthAreas: ['sharing']
  },
  {
    name: 'Noah',
    dateOfBirth: '2018-12-22',
    gender: 'male',
    hairColor: 'black',
    hairLength: 'short',
    hairType: 'straight',
    eyeColor: 'brown',
    skinTone: 'tan',
    bodyType: 'strong',
    hasGlasses: false,
    background: 'hispanic_latino',
    interests: ['sports', 'science'],
    growthAreas: ['problem_solving']
  },
  {
    name: 'Ava',
    dateOfBirth: '2021-12-22',
    gender: 'female',
    hairColor: 'black',
    hairLength: 'long',
    hairType: 'straight',
    eyeColor: 'brown',
    skinTone: 'light',
    bodyType: 'slender',
    hasGlasses: false,
    background: 'asian',
    interests: ['art', 'reading'],
    growthAreas: ['confidence']
  },
  {
    name: 'Lucas',
    dateOfBirth: '2019-12-22',
    gender: 'male',
    hairColor: 'brown',
    hairLength: 'short',
    hairType: 'wavy',
    eyeColor: 'hazel',
    skinTone: 'light',
    bodyType: 'average',
    hasGlasses: true,
    background: 'white',
    interests: ['technology', 'science'],
    growthAreas: ['listening']
  },
  {
    name: 'Sophia',
    dateOfBirth: '2022-12-22',
    gender: 'female',
    hairColor: 'brown',
    hairLength: 'medium',
    hairType: 'curly',
    eyeColor: 'brown',
    skinTone: 'olive',
    bodyType: 'average',
    hasGlasses: false,
    background: 'hispanic_latino',
    interests: ['dancing', 'music'],
    growthAreas: ['emotional_regulation']
  },
  {
    name: 'Mason',
    dateOfBirth: '2021-12-22',
    gender: 'male',
    hairColor: 'black',
    hairLength: 'short',
    hairType: 'coily',
    eyeColor: 'brown',
    skinTone: 'brown',
    bodyType: 'husky',
    hasGlasses: false,
    background: 'black_african_american',
    interests: ['sports', 'animals'],
    growthAreas: ['social_skills']
  },
  {
    name: 'Isabella',
    dateOfBirth: '2019-12-22',
    gender: 'female',
    hairColor: 'brown',
    hairLength: 'very_long',
    hairType: 'wavy',
    eyeColor: 'brown',
    skinTone: 'tan',
    bodyType: 'average',
    hasGlasses: false,
    background: 'hispanic_latino',
    interests: ['art', 'cooking'],
    growthAreas: ['creativity']
  },
  {
    name: 'Ethan',
    dateOfBirth: '2018-12-22',
    gender: 'male',
    hairColor: 'black',
    hairLength: 'short',
    hairType: 'straight',
    eyeColor: 'brown',
    skinTone: 'light',
    bodyType: 'athletic',
    hasGlasses: false,
    background: 'asian',
    interests: ['technology', 'sports'],
    growthAreas: ['responsibility']
  },
  {
    name: 'Mia',
    dateOfBirth: '2022-12-22',
    gender: 'female',
    hairColor: 'brown',
    hairLength: 'medium',
    hairType: 'curly',
    eyeColor: 'hazel',
    skinTone: 'tan',
    bodyType: 'average',
    hasGlasses: false,
    background: 'other',
    interests: ['animals', 'music'],
    growthAreas: ['independence']
  },
  {
    name: 'Aiden',
    dateOfBirth: '2021-12-22',
    gender: 'male',
    hairColor: 'red',
    hairLength: 'short',
    hairType: 'wavy',
    eyeColor: 'green',
    skinTone: 'fair',
    bodyType: 'average',
    hasGlasses: false,
    background: 'white',
    interests: ['outdoors', 'animals'],
    growthAreas: ['patience']
  },
  {
    name: 'Charlotte',
    dateOfBirth: '2019-12-22',
    gender: 'female',
    hairColor: 'black',
    hairLength: 'long',
    hairType: 'curly',
    eyeColor: 'brown',
    skinTone: 'dark',
    bodyType: 'slender',
    hasGlasses: false,
    background: 'black_african_american',
    interests: ['reading', 'art'],
    growthAreas: ['confidence']
  },
  {
    name: 'Jack',
    dateOfBirth: '2022-12-22',
    gender: 'male',
    hairColor: 'blonde',
    hairLength: 'infant_hair',
    hairType: 'straight',
    eyeColor: 'blue',
    skinTone: 'fair',
    bodyType: 'round',
    hasGlasses: false,
    background: 'white',
    interests: ['animals', 'outdoors'],
    growthAreas: ['sharing']
  },
  {
    name: 'Amelia',
    dateOfBirth: '2018-12-22',
    gender: 'female',
    hairColor: 'black',
    hairLength: 'long',
    hairType: 'straight',
    eyeColor: 'brown',
    skinTone: 'light',
    bodyType: 'average',
    hasGlasses: false,
    background: 'asian',
    interests: ['reading', 'science'],
    growthAreas: ['problem_solving']
  }
];

const ADMIN_EMAIL = 'hello@tuckandtale.com';

// =============================================================================
// VALIDATION FUNCTIONS
// =============================================================================

function validateProfile(profile) {
  const errors = [];

  // Validate single-value fields
  const singleFields = ['gender', 'hairColor', 'hairLength', 'hairType', 'eyeColor', 'skinTone', 'bodyType', 'background'];

  for (const field of singleFields) {
    if (profile[field] && !ALLOWED_VALUES[field].includes(profile[field])) {
      errors.push(`Invalid ${field}: "${profile[field]}". Allowed: ${ALLOWED_VALUES[field].join(', ')}`);
    }
  }

  // Validate array fields
  const arrayFields = ['interests', 'growthAreas'];

  for (const field of arrayFields) {
    if (profile[field]) {
      for (const value of profile[field]) {
        if (!ALLOWED_VALUES[field].includes(value)) {
          errors.push(`Invalid ${field} value: "${value}". Allowed: ${ALLOWED_VALUES[field].join(', ')}`);
        }
      }
    }
  }

  // Validate date format
  if (profile.dateOfBirth && !/^\d{4}-\d{2}-\d{2}$/.test(profile.dateOfBirth)) {
    errors.push(`Invalid dateOfBirth format: "${profile.dateOfBirth}". Expected: YYYY-MM-DD`);
  }

  // Validate hasGlasses is boolean
  if (typeof profile.hasGlasses !== 'boolean') {
    errors.push(`Invalid hasGlasses: "${profile.hasGlasses}". Expected: true or false`);
  }

  return errors;
}

function calculateAge(dateOfBirth) {
  const today = new Date();
  const birthDate = new Date(dateOfBirth);
  let age = today.getFullYear() - birthDate.getFullYear();
  const monthDiff = today.getMonth() - birthDate.getMonth();
  if (monthDiff < 0 || (monthDiff === 0 && today.getDate() < birthDate.getDate())) {
    age--;
  }
  return age;
}

// =============================================================================
// MAIN SCRIPT
// =============================================================================

async function seedChildren() {
  console.log('\n========================================');
  console.log('  SEED SCRIPT: Create 15 Child Profiles');
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

  for (const profile of CHILD_PROFILES) {
    const errors = validateProfile(profile);
    if (errors.length > 0) {
      console.error(`❌ ${profile.name}: VALIDATION FAILED`);
      errors.forEach(err => console.error(`   - ${err}`));
      hasErrors = true;
    } else {
      console.log(`✅ ${profile.name}: Valid`);
    }
  }

  if (hasErrors) {
    console.error('\n⚠️  Some profiles have invalid data. Aborting.');
    process.exit(1);
  }

  console.log('\n✅ All 15 profiles validated successfully!\n');

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

    // Check for existing profiles
    const { rows: existing } = await client.query(
      `SELECT name FROM character_profiles WHERE user_id = $1 AND character_type = 'child'`,
      [adminUserId]
    );

    if (existing.length > 0) {
      console.log(`⚠️  Found ${existing.length} existing child profiles: ${existing.map(e => e.name).join(', ')}`);

      if (forceMode) {
        console.log('\n🗑️  --force flag detected, deleting existing child profiles...');
        await client.query(
          `DELETE FROM character_profiles WHERE user_id = $1 AND character_type = 'child'`,
          [adminUserId]
        );
        console.log('✅ Deleted existing profiles\n');
      } else {
        console.log('   Use --force to delete and recreate all profiles.\n');
      }
    }

    // Insert each profile
    console.log('💾 Inserting child profiles...\n');

    let created = 0;
    let skipped = 0;

    for (let i = 0; i < CHILD_PROFILES.length; i++) {
      const profile = CHILD_PROFILES[i];

      // Check if this specific profile exists
      const { rows: existingProfile } = await client.query(
        `SELECT id FROM character_profiles WHERE user_id = $1 AND name = $2 AND character_type = 'child'`,
        [adminUserId, profile.name]
      );

      if (existingProfile.length > 0 && !forceMode) {
        console.log(`   ⏭️  ${profile.name} - already exists, skipping`);
        skipped++;
        continue;
      }

      // Calculate age
      const age = calculateAge(profile.dateOfBirth);

      // Build attributes object
      const attributes = {
        name: profile.name,
        dateOfBirth: profile.dateOfBirth,
        age: age,
        gender: profile.gender,
        hairColor: profile.hairColor,
        hairLength: profile.hairLength,
        hairType: profile.hairType,
        eyeColor: profile.eyeColor,
        skinTone: profile.skinTone,
        bodyType: profile.bodyType,
        hasGlasses: profile.hasGlasses,
        background: profile.background,
        interests: profile.interests,
        growthAreas: profile.growthAreas,
      };

      // Build appearance description
      const genderWord = profile.gender === 'female' ? 'girl' : 'boy';
      const appearance_description = `A friendly ${age}-year-old ${genderWord} with ${profile.hairColor} ${profile.hairLength} ${profile.hairType} hair and ${profile.eyeColor} eyes.`;

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
          'child',
          profile.name,
          JSON.stringify(attributes),
          appearance_description,
          i === 0  // First child (Emma) is primary
        ]
      );

      console.log(`   ✅ ${profile.name} (age ${age}) - ID: ${inserted[0].id}`);
      created++;
    }

    console.log('\n========================================');
    console.log('  ✅ SEED COMPLETE');
    console.log('========================================');
    console.log(`   Created: ${created}`);
    console.log(`   Skipped: ${skipped}`);
    console.log(`   Total:   ${CHILD_PROFILES.length}`);
    console.log('');

  } catch (error) {
    console.error('\n❌ Error:', error.message);
    process.exit(1);
  } finally {
    await client.end();
  }
}

seedChildren();
