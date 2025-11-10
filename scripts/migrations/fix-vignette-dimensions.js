/**
 * Fix Vignette Dimensions
 * Updates from 3072x3072 (too large) to 1536x1536 (max allowed by Leonardo)
 * This will give us 512x512 per panel when sliced into 9
 */

const { createClient } = require('@supabase/supabase-js');

const supabaseUrl = 'https://iolimejvugpcpnmruqww.supabase.co';
const supabaseServiceKey =
  'eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJpc3MiOiJzdXBhYmFzZSIsInJlZiI6ImlvbGltZWp2dWdwY3BubXJ1cXd3Iiwicm9sZSI6InNlcnZpY2Vfcm9sZSIsImlhdCI6MTc2MjM3NDA5NCwiZXhwIjoyMDc3OTUwMDk0fQ.ybv7KgWy0fdRTik1UkX3nAjdgLsBEExpLUrvnG2FRMA';

const supabase = createClient(supabaseUrl, supabaseServiceKey);

async function fixDimensions() {
  console.log('🔧 Fixing vignette dimensions...\n');

  // Get current config
  const { data: config, error: fetchError } = await supabase
    .from('ai_configs')
    .select('*')
    .eq('name', 'leonardo_lucid_realism_vignette_panorama')
    .single();

  if (fetchError || !config) {
    console.error('❌ Could not find config:', fetchError?.message);
    return;
  }

  console.log('Current dimensions:', `${config.settings.width}x${config.settings.height}`);
  console.log('Leonardo max allowed: 1536x1536\n');

  // Update settings
  const updatedSettings = {
    ...config.settings,
    width: 1536,
    height: 1536,
    guidance_scale: 7,
  };

  const { error: updateError } = await supabase
    .from('ai_configs')
    .update({ settings: updatedSettings })
    .eq('name', 'leonardo_lucid_realism_vignette_panorama');

  if (updateError) {
    console.error('❌ Update failed:', updateError.message);
    return;
  }

  console.log('✅ Fixed! Dimensions now: 1536x1536');
  console.log('   Each panel will be: 512x512 pixels');
  console.log('\n🚀 Now try running generateVignettes() again in your browser!');
}

fixDimensions();
