/**
 * Add AI Config for Vignette Story Generation
 * Uses gpt-4.1 to generate visual scene descriptions
 */

const { createClient } = require('@supabase/supabase-js');

const supabaseUrl = 'https://iolimejvugpcpnmruqww.supabase.co';
const supabaseServiceKey =
  'eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJpc3MiOiJzdXBhYmFzZSIsInJlZiI6ImlvbGltZWp2dWdwY3BubXJ1cXd3Iiwicm9sZSI6InNlcnZpY2Vfcm9sZSIsImlhdCI6MTc2MjM3NDA5NCwiZXhwIjoyMDc3OTUwMDk0fQ.ybv7KgWy0fdRTik1UkX3nAjdgLsBEExpLUrvnG2FRMA';

const supabase = createClient(supabaseUrl, supabaseServiceKey);

async function addVignetteConfig() {
  console.log('📝 Adding vignette story generation config...\n');

  // Check if it already exists
  const { data: existing } = await supabase
    .from('ai_configs')
    .select('*')
    .eq('purpose', 'vignette_story')
    .single();

  if (existing) {
    console.log('✅ Config already exists:');
    console.log(JSON.stringify(existing, null, 2));
    return;
  }

  // Insert new config
  const { data, error } = await supabase
    .from('ai_configs')
    .insert({
      name: 'gpt4.1_vignette_story',
      purpose: 'vignette_story',
      provider: 'openai',
      model_id: 'gpt-4.1',
      model_name: 'GPT-4.1 (Vignette Stories)',
      model_type: 'text',
      settings: {
        temperature: 0.8, // Creative but consistent
        max_tokens: 2000,
        top_p: 0.95,
        presence_penalty: 0.3, // Encourage variety in scene descriptions
        frequency_penalty: 0.3,
      },
      is_active: true,
      is_default: true,
    })
    .select()
    .single();

  if (error) {
    console.error('❌ Error:', error);
    return;
  }

  console.log('✅ Added vignette story config:');
  console.log(JSON.stringify(data, null, 2));
}

addVignetteConfig();
