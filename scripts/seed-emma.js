#!/usr/bin/env node
/**
 * Seed Script: Create Emma Child Profile
 *
 * Creates a test child profile for the hello@tuckandtale.com admin account.
 * Validates all values against the allowed form options before inserting.
 *
 * Usage: node scripts/seed-emma.js
 *
 * Avatar generation must be triggered separately via the app UI or API.
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
// EMMA'S PROFILE DATA
// =============================================================================

const EMMA_PROFILE = {
  name: 'Emma',
  dateOfBirth: '2021-12-22', // Age 4 (as of Dec 2025)
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
};

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

async function seedEmma() {
  console.log('\n========================================');
  console.log('  SEED SCRIPT: Create Emma Profile');
  console.log('========================================\n');

  // Validate environment
  const password = process.env.SUPABASE_DB_PASSWORD;
  if (!password) {
    console.error('❌ SUPABASE_DB_PASSWORD not found in .env.local');
    process.exit(1);
  }

  // Validate profile data
  console.log('📋 Validating profile data against allowed options...\n');
  const validationErrors = validateProfile(EMMA_PROFILE);

  if (validationErrors.length > 0) {
    console.error('❌ VALIDATION FAILED:\n');
    validationErrors.forEach(err => console.error(`   - ${err}`));
    console.error('\n⚠️  Profile data does not match allowed form options. Aborting.');
    process.exit(1);
  }

  console.log('✅ All values are valid!\n');
  console.log('Profile data:');
  console.log(JSON.stringify(EMMA_PROFILE, null, 2));
  console.log('');

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

    // Check if Emma already exists
    console.log('🔍 Checking if Emma already exists...');
    const { rows: existing } = await client.query(
      `SELECT id, name FROM character_profiles
       WHERE user_id = $1 AND name = $2 AND character_type = 'child'`,
      [adminUserId, EMMA_PROFILE.name]
    );

    if (existing.length > 0) {
      console.log(`⚠️  Emma already exists (ID: ${existing[0].id})`);
      console.log('   Use --force to delete and recreate, or delete manually first.');

      if (process.argv.includes('--force')) {
        console.log('\n🗑️  --force flag detected, deleting existing profile...');
        await client.query(
          `DELETE FROM character_profiles WHERE id = $1`,
          [existing[0].id]
        );
        console.log('✅ Deleted existing profile\n');
      } else {
        process.exit(0);
      }
    }

    // Calculate age from date of birth
    const age = calculateAge(EMMA_PROFILE.dateOfBirth);
    console.log(`📅 Calculated age from DOB: ${age} years old\n`);

    // Build attributes object (matching app structure)
    const attributes = {
      name: EMMA_PROFILE.name,
      dateOfBirth: EMMA_PROFILE.dateOfBirth,
      age: age,
      gender: EMMA_PROFILE.gender,
      hairColor: EMMA_PROFILE.hairColor,
      hairLength: EMMA_PROFILE.hairLength,
      hairType: EMMA_PROFILE.hairType,
      eyeColor: EMMA_PROFILE.eyeColor,
      skinTone: EMMA_PROFILE.skinTone,
      bodyType: EMMA_PROFILE.bodyType,
      hasGlasses: EMMA_PROFILE.hasGlasses,
      background: EMMA_PROFILE.background,
      interests: EMMA_PROFILE.interests,
      growthAreas: EMMA_PROFILE.growthAreas,
    };

    // Build basic appearance description
    const appearance_description = `A friendly ${age}-year-old ${EMMA_PROFILE.gender === 'female' ? 'girl' : 'boy'} with ${EMMA_PROFILE.hairColor} ${EMMA_PROFILE.hairLength} ${EMMA_PROFILE.hairType} hair and ${EMMA_PROFILE.eyeColor} eyes.`;

    // Insert character profile
    console.log('💾 Inserting Emma into character_profiles...');
    const { rows: inserted } = await client.query(
      `INSERT INTO character_profiles (
        user_id,
        character_type,
        name,
        attributes,
        appearance_description,
        is_primary
      ) VALUES ($1, $2, $3, $4, $5, $6)
      RETURNING id, name, created_at`,
      [
        adminUserId,
        'child',
        EMMA_PROFILE.name,
        JSON.stringify(attributes),
        appearance_description,
        true  // Make Emma the primary child
      ]
    );

    const emma = inserted[0];
    console.log('\n========================================');
    console.log('  ✅ SUCCESS: Emma Created!');
    console.log('========================================');
    console.log(`   ID: ${emma.id}`);
    console.log(`   Name: ${emma.name}`);
    console.log(`   Created: ${emma.created_at}`);
    console.log('');
    console.log('📷 NEXT STEP: Generate Avatar');
    console.log('   Option 1: Via UI - Go to Dashboard > My Children > Emma > Generate Avatar');
    console.log(`   Option 2: Via API - POST /api/characters/${emma.id}/generate-avatar`);
    console.log('');

  } catch (error) {
    console.error('\n❌ Error:', error.message);
    process.exit(1);
  } finally {
    await client.end();
  }
}

seedEmma();
