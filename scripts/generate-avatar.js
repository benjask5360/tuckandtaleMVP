#!/usr/bin/env node
/**
 * Avatar Generation Script (Direct API)
 *
 * Generates avatar for a character by directly calling Leonardo AI,
 * then uploads to Supabase storage and updates the database.
 *
 * Usage:
 *   node scripts/generate-avatar.js <character_id>
 *
 * Requires environment variables in .env.local:
 *   - LEONARDO_API_KEY
 *   - NEXT_PUBLIC_SUPABASE_URL
 *   - SUPABASE_SERVICE_ROLE_KEY
 */

const { Client } = require('pg');
const { createClient } = require('@supabase/supabase-js');
const path = require('path');

// Load environment variables
const envPath = path.join(__dirname, '..', '.env.local');
require('dotenv').config({ path: envPath });

// =============================================================================
// CONFIGURATION
// =============================================================================

const LEONARDO_API_KEY = process.env.LEONARDO_API_KEY;
const LEONARDO_BASE_URL = 'https://cloud.leonardo.ai/api/rest/v1';
const SUPABASE_URL = process.env.NEXT_PUBLIC_SUPABASE_URL;
const SUPABASE_SERVICE_KEY = process.env.SUPABASE_SERVICE_KEY;
const DB_PASSWORD = process.env.SUPABASE_DB_PASSWORD;

// Default Leonardo model for avatars (from ai_generation_configs table)
const DEFAULT_MODEL_ID = '6b645e3a-d64f-4341-a6d8-7a3690fbf042'; // Leonardo Phoenix
const DEFAULT_WIDTH = 512;
const DEFAULT_HEIGHT = 768;

const POLL_INTERVAL_MS = 2000;
const MAX_POLL_ATTEMPTS = 30;

// =============================================================================
// HELPER FUNCTIONS
// =============================================================================

function sleep(ms) {
  return new Promise(resolve => setTimeout(resolve, ms));
}

// Build avatar prompt (simplified version of avatarPromptBuilder)
function buildAvatarPrompt(attributes) {
  const age = attributes.age || 8;
  const gender = attributes.gender || 'child';
  const genderWord = gender === 'female' ? 'girl' : gender === 'male' ? 'boy' : 'child';
  const kidOrAdult = age >= 18 ? 'adult' : 'kid';

  // Ethnicity phrase from background
  let ethnicityPhrase = '';
  const backgroundMap = {
    'white': 'Caucasian',
    'black_african_american': 'African American',
    'asian': 'East Asian',
    'hispanic_latino': 'Hispanic/Latino',
    'middle_eastern_north_african': 'Middle Eastern',
    'native_hawaiian_pacific_islander': 'Pacific Islander',
    'american_indian_alaska_native': 'Native American',
  };
  if (attributes.background && backgroundMap[attributes.background]) {
    ethnicityPhrase = ` with ${backgroundMap[attributes.background]} features`;
  }

  // Main descriptor
  const mainDescriptor = `${age}-year-old ${genderWord}`;

  // Build the prompt
  let prompt = `Disney Pixar style standing avatar of a friendly ${mainDescriptor}${ethnicityPhrase}, dressed like a typical American ${kidOrAdult} in modern casual clothes.`;

  // Add characteristics
  const charParts = [];
  const pronoun = gender === 'female' ? 'She' : gender === 'male' ? 'He' : 'They';
  const pronounHas = gender === 'non-binary' ? 'have' : 'has';

  if (attributes.hairColor && attributes.hairLength && attributes.hairType) {
    charParts.push(`${attributes.hairLength} ${attributes.hairType} ${attributes.hairColor} hair`);
  }
  if (attributes.eyeColor) {
    charParts.push(`${attributes.eyeColor} eyes`);
  }
  if (attributes.skinTone) {
    charParts.push(`a ${attributes.skinTone} skin tone`);
  }
  if (attributes.bodyType) {
    charParts.push(`a ${attributes.bodyType} build`);
  }

  if (charParts.length > 0) {
    prompt += ` ${pronoun} ${pronounHas} `;
    if (charParts.length === 1) {
      prompt += charParts[0];
    } else if (charParts.length === 2) {
      prompt += `${charParts[0]} and ${charParts[1]}`;
    } else {
      const lastPart = charParts.pop();
      prompt += `${charParts.join(', ')}, and ${lastPart}`;
    }
    prompt += '.';
  }

  // Add age emphasis
  const pronounPossessive = gender === 'female' ? 'Her' : gender === 'male' ? 'His' : 'Their';
  prompt += ` ${pronounPossessive} physical appearance should clearly be that of a ${age} year old.`;

  // Add glasses if needed
  if (attributes.hasGlasses) {
    prompt += ` ${pronoun} ${gender === 'non-binary' ? 'wear' : 'wears'} glasses.`;
  }

  // Standard suffix
  prompt += ' Simple gradient background, full body visible, centered composition, high quality, detailed.';

  return prompt;
}

// =============================================================================
// LEONARDO API FUNCTIONS
// =============================================================================

async function generateImage(prompt) {
  const requestBody = {
    prompt: prompt,
    modelId: DEFAULT_MODEL_ID,
    width: DEFAULT_WIDTH,
    height: DEFAULT_HEIGHT,
    num_images: 1,
    public: false,
  };

  console.log('📤 Leonardo API request:');
  console.log(`   Prompt: ${prompt.substring(0, 100)}...`);

  const response = await fetch(`${LEONARDO_BASE_URL}/generations`, {
    method: 'POST',
    headers: {
      'Authorization': `Bearer ${LEONARDO_API_KEY}`,
      'Content-Type': 'application/json',
    },
    body: JSON.stringify(requestBody),
  });

  if (!response.ok) {
    const error = await response.json().catch(() => ({}));
    throw new Error(`Leonardo API error: ${JSON.stringify(error)}`);
  }

  const data = await response.json();
  return {
    generationId: data.sdGenerationJob.generationId,
    apiCreditCost: data.sdGenerationJob.apiCreditCost,
  };
}

async function pollGeneration(generationId) {
  let attempts = 0;

  while (attempts < MAX_POLL_ATTEMPTS) {
    const response = await fetch(`${LEONARDO_BASE_URL}/generations/${generationId}`, {
      headers: {
        'Authorization': `Bearer ${LEONARDO_API_KEY}`,
      },
    });

    if (!response.ok) {
      throw new Error(`Leonardo API poll error: ${response.statusText}`);
    }

    const data = await response.json();
    const generation = data.generations_by_pk;

    if (!generation) {
      throw new Error('Generation not found');
    }

    const progress = Math.min(95, Math.floor((attempts / MAX_POLL_ATTEMPTS) * 100));
    const progressBar = '█'.repeat(Math.floor(progress / 5)) + '░'.repeat(20 - Math.floor(progress / 5));
    process.stdout.write(`\r   [${progressBar}] ${progress}% - ${generation.status}`);

    if (generation.status === 'COMPLETE') {
      console.log('');
      return {
        status: 'COMPLETE',
        images: generation.generated_images || [],
      };
    }

    if (generation.status === 'FAILED') {
      console.log('');
      throw new Error('Image generation failed');
    }

    attempts++;
    await sleep(POLL_INTERVAL_MS);
  }

  throw new Error('Generation timed out');
}

async function downloadImage(imageUrl) {
  const response = await fetch(imageUrl);
  if (!response.ok) {
    throw new Error(`Failed to download image: ${response.statusText}`);
  }
  return await response.arrayBuffer();
}

// =============================================================================
// MAIN SCRIPT
// =============================================================================

async function generateAvatar() {
  console.log('\n========================================');
  console.log('  AVATAR GENERATION SCRIPT (Direct)');
  console.log('========================================\n');

  // Get character ID from args
  const characterId = process.argv[2];
  if (!characterId) {
    console.error('❌ Usage: node scripts/generate-avatar.js <character_id>');
    process.exit(1);
  }

  // Validate environment
  if (!LEONARDO_API_KEY) {
    console.error('❌ LEONARDO_API_KEY not found in .env.local');
    process.exit(1);
  }
  if (!SUPABASE_URL || !SUPABASE_SERVICE_KEY) {
    console.error('❌ Supabase credentials not found in .env.local');
    process.exit(1);
  }
  if (!DB_PASSWORD) {
    console.error('❌ SUPABASE_DB_PASSWORD not found in .env.local');
    process.exit(1);
  }

  console.log(`🎯 Character ID: ${characterId}`);

  // Connect to database to get character details
  const projectRef = 'iolimejvugpcpnmruqww';
  const PORT = process.env.SUPABASE_DB_PORT || 6543;

  const dbClient = new Client({
    host: `db.${projectRef}.supabase.co`,
    port: PORT,
    user: 'postgres',
    password: DB_PASSWORD,
    database: 'postgres',
    ssl: { rejectUnauthorized: false },
  });

  // Initialize Supabase client for storage
  const supabase = createClient(SUPABASE_URL, SUPABASE_SERVICE_KEY);

  try {
    await dbClient.connect();
    console.log('✅ Connected to database\n');

    // Get character profile
    console.log('🔍 Fetching character profile...');
    const { rows } = await dbClient.query(
      `SELECT id, user_id, name, character_type, attributes FROM character_profiles WHERE id = $1`,
      [characterId]
    );

    if (rows.length === 0) {
      console.error(`❌ Character not found: ${characterId}`);
      process.exit(1);
    }

    const character = rows[0];
    console.log(`✅ Found character: ${character.name} (${character.character_type})`);
    console.log(`   User ID: ${character.user_id}`);

    // Build avatar prompt
    console.log('\n📝 Building avatar prompt...');
    const attributes = character.attributes || {};
    const prompt = buildAvatarPrompt(attributes);
    console.log(`   Prompt: ${prompt}`);

    // Generate image with Leonardo
    console.log('\n🚀 Initiating Leonardo generation...');
    const { generationId, apiCreditCost } = await generateImage(prompt);
    console.log(`✅ Generation started!`);
    console.log(`   Generation ID: ${generationId}`);
    console.log(`   API Credit Cost: ${apiCreditCost}`);

    // Poll for completion
    console.log('\n⏳ Waiting for generation...');
    const result = await pollGeneration(generationId);

    if (!result.images || result.images.length === 0) {
      throw new Error('No images generated');
    }

    const imageUrl = result.images[0].url;
    console.log(`✅ Generation complete!`);
    console.log(`   Image URL: ${imageUrl}`);

    // Download the image
    console.log('\n📥 Downloading image...');
    const imageBuffer = await downloadImage(imageUrl);
    console.log(`✅ Downloaded (${(imageBuffer.byteLength / 1024).toFixed(1)} KB)`);

    // Upload to Supabase storage
    console.log('\n📤 Uploading to Supabase storage...');
    const storagePath = `${character.user_id}/${characterId}/${generationId}.png`;

    const { error: uploadError } = await supabase.storage
      .from('avatars')
      .upload(storagePath, imageBuffer, {
        contentType: 'image/png',
        upsert: true,
      });

    if (uploadError) {
      throw new Error(`Upload failed: ${uploadError.message}`);
    }

    // Get public URL
    const { data: { publicUrl } } = supabase.storage
      .from('avatars')
      .getPublicUrl(storagePath);

    console.log(`✅ Uploaded!`);
    console.log(`   Storage path: ${storagePath}`);
    console.log(`   Public URL: ${publicUrl}`);

    // Create avatar_cache entry and get the ID
    console.log('\n💾 Creating avatar_cache entry...');
    const { rows: cacheRows } = await dbClient.query(
      `INSERT INTO avatar_cache (
        character_profile_id,
        leonardo_generation_id,
        leonardo_model_id,
        prompt_used,
        storage_path,
        image_url,
        processing_status,
        is_current
      ) VALUES ($1, $2, $3, $4, $5, $6, 'completed', true)
      RETURNING id`,
      [characterId, generationId, DEFAULT_MODEL_ID, prompt, storagePath, publicUrl]
    );
    const avatarCacheId = cacheRows[0].id;
    console.log(`✅ Avatar cache entry created (ID: ${avatarCacheId})`);

    // Update character profile with avatar_cache_id
    console.log('\n💾 Updating character profile...');
    await dbClient.query(
      `UPDATE character_profiles SET avatar_cache_id = $1, updated_at = NOW() WHERE id = $2`,
      [avatarCacheId, characterId]
    );
    console.log('✅ Character profile updated');

    console.log('\n========================================');
    console.log('  ✅ AVATAR GENERATED SUCCESSFULLY!');
    console.log('========================================');
    console.log(`   Character: ${character.name}`);
    console.log(`   Avatar URL: ${publicUrl}`);
    console.log('');

    return { success: true, imageUrl: publicUrl };

  } catch (error) {
    console.error('\n❌ Error:', error.message);
    process.exit(1);
  } finally {
    await dbClient.end();
  }
}

generateAvatar();
