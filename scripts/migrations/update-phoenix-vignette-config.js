/**
 * Update Vignette Panorama Config to Phoenix 1.0
 *
 * Changes:
 * - Model: Lucid Realism → Phoenix 1.0
 * - Resolution: 3072x3072 → 1680x1680
 * - Settings: SDXL params → Phoenix params (alchemy, contrast)
 */

const { createClient } = require('@supabase/supabase-js');

const supabaseUrl = process.env.NEXT_PUBLIC_SUPABASE_URL;
const supabaseKey = process.env.SUPABASE_SERVICE_KEY;

if (!supabaseUrl || !supabaseKey) {
  console.error('❌ Missing environment variables!');
  console.error('Required: NEXT_PUBLIC_SUPABASE_URL, SUPABASE_SERVICE_KEY');
  process.exit(1);
}

const supabase = createClient(supabaseUrl, supabaseKey);

async function updatePhoenixConfig() {
  console.log('🔧 Updating Vignette Panorama Config to Phoenix 1.0...\n');

  // Get current config
  const { data: currentConfig, error: fetchError } = await supabase
    .from('ai_configs')
    .select('*')
    .eq('name', 'leonardo_lucid_realism_vignette_panorama')
    .single();

  if (fetchError || !currentConfig) {
    console.error('❌ Could not find config:', fetchError?.message || 'Config not found');
    process.exit(1);
  }

  console.log('📋 Current Configuration:');
  console.log(`   Model: ${currentConfig.model_name} (${currentConfig.model_id})`);
  console.log(`   Settings:`, JSON.stringify(currentConfig.settings, null, 2));
  console.log();

  // New Phoenix 1.0 settings
  const newSettings = {
    width: 1680,
    height: 1680,
    num_images: 1,
    alchemy: true,           // Quality mode
    contrast: 3.5,           // Medium-High quality (range: 2.5-4.5 for alchemy)
    public: false,
    tiling: false,
    negative_prompt: currentConfig.settings.negative_prompt ||
      "bad anatomy, blurry, low quality, pixelated, distorted, text, captions, watermark, realistic photo, separate images, borders, frames"
  };

  console.log('🎨 New Phoenix 1.0 Configuration:');
  console.log(`   Model: Phoenix 1.0 (de7d3faf-762f-48e0-b3b7-9d0ac3a3fcf3)`);
  console.log(`   Resolution: 1680x1680`);
  console.log(`   Quality Mode: Enabled (alchemy: true)`);
  console.log(`   Contrast: 3.5 (Medium-High)`);
  console.log(`   Settings:`, JSON.stringify(newSettings, null, 2));
  console.log();

  // Update the config
  const { error: updateError } = await supabase
    .from('ai_configs')
    .update({
      model_id: 'de7d3faf-762f-48e0-b3b7-9d0ac3a3fcf3',
      model_name: 'Phoenix 1.0',
      settings: newSettings,
      updated_at: new Date().toISOString()
    })
    .eq('name', 'leonardo_lucid_realism_vignette_panorama');

  if (updateError) {
    console.error('❌ Update failed:', updateError.message);
    process.exit(1);
  }

  // Verify the update
  const { data: updatedConfig, error: verifyError } = await supabase
    .from('ai_configs')
    .select('*')
    .eq('name', 'leonardo_lucid_realism_vignette_panorama')
    .single();

  if (verifyError || !updatedConfig) {
    console.error('❌ Could not verify update:', verifyError?.message);
    process.exit(1);
  }

  console.log('✅ Configuration updated successfully!');
  console.log();
  console.log('📋 Verified Configuration:');
  console.log(`   Model: ${updatedConfig.model_name} (${updatedConfig.model_id})`);
  console.log(`   Settings:`, JSON.stringify(updatedConfig.settings, null, 2));
  console.log();
  console.log('🎉 Vignette panoramas will now use Phoenix 1.0 with Quality mode at 1680x1680!');
}

updatePhoenixConfig().catch(error => {
  console.error('❌ Fatal error:', error);
  process.exit(1);
});
