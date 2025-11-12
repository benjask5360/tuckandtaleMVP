/**
 * Fix Vignette AI Config
 * Updates guidance_scale from 7.5 to 7 (must be integer)
 */

const { createClient } = require('@supabase/supabase-js');

const supabaseUrl = 'https://iolimejvugpcpnmruqww.supabase.co';
const supabaseServiceKey =
  'eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJpc3MiOiJzdXBhYmFzZSIsInJlZiI6ImlvbGltZWp2dWdwY3BubXJ1cXd3Iiwicm9sZSI6InNlcnZpY2Vfcm9sZSIsImlhdCI6MTc2MjM3NDA5NCwiZXhwIjoyMDc3OTUwMDk0fQ.ybv7KgWy0fdRTik1UkX3nAjdgLsBEExpLUrvnG2FRMA';

const supabase = createClient(supabaseUrl, supabaseServiceKey);

async function fixConfig() {
  console.log('🔧 Fixing vignette AI config...\n');

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

  console.log('Current guidance_scale:', config.settings.guidance_scale);

  // Update settings
  const updatedSettings = {
    ...config.settings,
    guidance_scale: 7, // Change from 7.5 to 7
  };

  const { error: updateError } = await supabase
    .from('ai_configs')
    .update({ settings: updatedSettings })
    .eq('name', 'leonardo_lucid_realism_vignette_panorama');

  if (updateError) {
    console.error('❌ Update failed:', updateError.message);
    return;
  }

  console.log('✅ Fixed! guidance_scale is now 7 (integer)');
  console.log('\n🚀 Now try running generateVignettes() again in your browser!');
}

fixConfig();
