/**
 * Add Nano Banana (Gemini 2.5 Flash Image) to ai_configs for story_vignette_panorama
 *
 * This script:
 * 1. Fetches platform models from Leonardo API to get Nano Banana model ID (or uses manual ID)
 * 2. Adds Nano Banana configuration to ai_configs
 * 3. Sets it as the default for story_vignette_panorama
 * 4. Keeps Phoenix 1.0 active but removes its default status
 *
 * MANUAL MODEL ID:
 * If Nano Banana is not in the API platform models list, you can manually set the ID here:
 */

// Set this to the Nano Banana model ID if it's not found automatically
// Get it from: https://app.leonardo.ai → Finetune Models → Platform Models → Nano Banana → View More
const MANUAL_NANO_BANANA_MODEL_ID = null; // Set to the UUID if needed

const { createClient } = require('@supabase/supabase-js');

const supabaseUrl = process.env.NEXT_PUBLIC_SUPABASE_URL;
const supabaseServiceKey = process.env.SUPABASE_SERVICE_KEY;
const leonardoApiKey = process.env.LEONARDO_API_KEY;

if (!supabaseUrl || !supabaseServiceKey) {
  console.error('❌ Missing Supabase credentials!');
  console.error('Required: NEXT_PUBLIC_SUPABASE_URL, SUPABASE_SERVICE_KEY');
  process.exit(1);
}

if (!leonardoApiKey) {
  console.error('❌ Missing Leonardo API key!');
  console.error('Required: LEONARDO_API_KEY');
  process.exit(1);
}

const supabase = createClient(supabaseUrl, supabaseServiceKey);

/**
 * Fetch platform models from Leonardo API
 */
async function fetchLeonardoPlatformModels() {
  console.log('🔍 Fetching platform models from Leonardo API...\n');

  try {
    const response = await fetch('https://cloud.leonardo.ai/api/rest/v1/platformModels', {
      method: 'GET',
      headers: {
        'Authorization': `Bearer ${leonardoApiKey}`,
        'Content-Type': 'application/json',
      },
    });

    if (!response.ok) {
      const errorText = await response.text();
      throw new Error(`Leonardo API error (${response.status}): ${errorText}`);
    }

    const data = await response.json();

    // Debug: Print all models to find Nano Banana
    console.log('📋 All available models:');
    const models = data.custom_models || data.platform_models || data;
    models.forEach(m => {
      console.log(`   - ${m.name} (${m.id})`);
      if (m.description) {
        console.log(`     Description: ${m.description.substring(0, 100)}...`);
      }
    });
    console.log('');

    return models;
  } catch (error) {
    console.error('❌ Failed to fetch Leonardo platform models:', error.message);
    throw error;
  }
}

/**
 * Find Nano Banana model in the platform models list
 */
function findNanoBananaModel(models) {
  console.log('🔍 Searching for Nano Banana model...\n');

  // Search for variations of the name
  const searchTerms = [
    'nano banana',
    'nanobanana',
    'gemini 2.5 flash',
    'gemini-2.5-flash',
    'gemini 2.5',
  ];

  let nanoBanana = null;

  for (const model of models) {
    const modelName = (model.name || '').toLowerCase();
    const modelDescription = (model.description || '').toLowerCase();

    for (const term of searchTerms) {
      if (modelName.includes(term) || modelDescription.includes(term)) {
        nanoBanana = model;
        break;
      }
    }

    if (nanoBanana) break;
  }

  if (!nanoBanana) {
    console.log('📋 Available models:');
    models.slice(0, 10).forEach(m => {
      console.log(`   - ${m.name} (${m.id})`);
    });
    console.log(`   ... and ${models.length - 10} more\n`);
  }

  return nanoBanana;
}

/**
 * Add Nano Banana configuration to ai_configs
 */
async function addNanoBananaConfig() {
  console.log('🚀 Starting Nano Banana configuration setup...\n');
  console.log('━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━\n');

  try {
    // Step 1: Fetch Leonardo platform models
    const models = await fetchLeonardoPlatformModels();
    console.log(`✅ Found ${models.length} platform models\n`);

    // Step 2: Find Nano Banana
    let nanoBanana = findNanoBananaModel(models);

    if (!nanoBanana && MANUAL_NANO_BANANA_MODEL_ID) {
      console.log('⚠️  Could not find Nano Banana in API, using manual model ID\n');
      nanoBanana = {
        id: MANUAL_NANO_BANANA_MODEL_ID,
        name: 'Nano Banana (Gemini 2.5 Flash Image)',
        description: 'Google Gemini 2.5 Flash Image model for image generation and editing',
      };
    }

    if (!nanoBanana) {
      console.error('❌ Could not find Nano Banana model in Leonardo platform models');
      console.log('\n💡 Manual Action Required:');
      console.log('   1. Visit https://app.leonardo.ai');
      console.log('   2. Go to Finetune Models → Platform Models');
      console.log('   3. Find Nano Banana and click "View More" to see the Model ID');
      console.log('   4. Update the MANUAL_NANO_BANANA_MODEL_ID constant at the top of this script');
      console.log('   5. Run this script again\n');
      process.exit(1);
    }

    console.log(`✅ Found Nano Banana model:`);
    console.log(`   Name: ${nanoBanana.name}`);
    console.log(`   ID: ${nanoBanana.id}`);
    console.log(`   Description: ${nanoBanana.description || 'N/A'}\n`);

    // Step 3: Check if Nano Banana config already exists
    const { data: existingConfig } = await supabase
      .from('ai_configs')
      .select('*')
      .eq('model_id', nanoBanana.id)
      .eq('purpose', 'story_vignette_panorama')
      .single();

    if (existingConfig) {
      console.log('⚠️  Nano Banana configuration already exists');
      console.log(`   Config name: ${existingConfig.name}\n`);

      // Just make it default if it isn't already
      if (!existingConfig.is_default) {
        console.log('🔄 Setting existing Nano Banana config as default...\n');

        // Remove default from Phoenix 1.0
        await supabase
          .from('ai_configs')
          .update({ is_default: false })
          .eq('purpose', 'story_vignette_panorama')
          .neq('id', existingConfig.id);

        // Set Nano Banana as default
        await supabase
          .from('ai_configs')
          .update({ is_default: true })
          .eq('id', existingConfig.id);

        console.log('✅ Nano Banana is now the default for story_vignette_panorama\n');
      } else {
        console.log('✅ Nano Banana is already the default\n');
      }

      return;
    }

    // Step 4: Prepare Nano Banana configuration
    // Based on research: 720p resolution (1:1 aspect ratio = 1280x1280 or 1024x1024)
    // Cost: 40 tokens per generation
    const nanoBananaConfig = {
      name: 'leonardo_nano_banana_vignette_panorama',
      purpose: 'story_vignette_panorama',
      provider: 'leonardo',
      model_id: nanoBanana.id,
      model_name: nanoBanana.name || 'Nano Banana (Gemini 2.5 Flash Image)',
      model_type: 'image',
      settings: {
        width: 1280,  // 720p @ 1:1 aspect ratio (closest to 1680 Phoenix was using)
        height: 1280,
        num_images: 1,
        public: false,
        negative_prompt: 'bad anatomy, blurry, low quality, pixelated, distorted, text, captions, watermark, realistic photo, separate images, borders, frames, inconsistent character, different faces',
        // Note: Nano Banana may not support all Leonardo parameters like alchemy, contrast
        // These will be ignored by the API if not supported
      },
      is_active: true,
      is_default: true,
    };

    console.log('📝 Configuration to be added:');
    console.log(JSON.stringify(nanoBananaConfig, null, 2));
    console.log('');

    // Step 5: Remove default status from Phoenix 1.0
    console.log('🔄 Updating Phoenix 1.0 to non-default...\n');

    const { error: updateError } = await supabase
      .from('ai_configs')
      .update({ is_default: false })
      .eq('purpose', 'story_vignette_panorama')
      .eq('is_default', true);

    if (updateError) {
      console.warn('⚠️  Could not update Phoenix 1.0:', updateError.message);
    } else {
      console.log('✅ Phoenix 1.0 is now non-default (still active)\n');
    }

    // Step 6: Insert Nano Banana configuration
    console.log('➕ Adding Nano Banana configuration...\n');

    const { data: insertedConfig, error: insertError } = await supabase
      .from('ai_configs')
      .insert(nanoBananaConfig)
      .select()
      .single();

    if (insertError) {
      throw new Error(`Failed to insert Nano Banana config: ${insertError.message}`);
    }

    console.log('✅ Successfully added Nano Banana configuration!');
    console.log(`   Config ID: ${insertedConfig.id}`);
    console.log(`   Config Name: ${insertedConfig.name}`);
    console.log(`   Model ID: ${insertedConfig.model_id}`);
    console.log(`   Resolution: ${insertedConfig.settings.width}x${insertedConfig.settings.height}`);
    console.log(`   Is Default: ${insertedConfig.is_default}\n`);

    // Step 7: Verify configuration
    console.log('🔍 Verifying all story_vignette_panorama configs...\n');

    const { data: allConfigs } = await supabase
      .from('ai_configs')
      .select('name, model_name, is_active, is_default')
      .eq('purpose', 'story_vignette_panorama')
      .order('is_default', { ascending: false });

    console.log('📋 Current configurations:');
    allConfigs?.forEach(config => {
      const status = config.is_default ? '⭐ DEFAULT' : config.is_active ? '✓ Active' : '✗ Inactive';
      console.log(`   ${status} | ${config.name} (${config.model_name})`);
    });
    console.log('');

    console.log('━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━');
    console.log('✅ Nano Banana setup complete!\n');
    console.log('💡 Next steps:');
    console.log('   1. Test vignette generation to verify Nano Banana works');
    console.log('   2. Compare quality with Phoenix 1.0 results');
    console.log('   3. Adjust resolution (1280x1280) if needed based on results\n');

  } catch (error) {
    console.error('❌ Error:', error.message);
    console.error('\nStack trace:', error.stack);
    process.exit(1);
  }
}

// Run the script
addNanoBananaConfig();
