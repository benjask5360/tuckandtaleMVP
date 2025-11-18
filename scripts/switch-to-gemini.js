#!/usr/bin/env node

/**
 * Switch Story Illustration back to Google Gemini
 */

require('dotenv').config({ path: '.env.local' });
const { createClient } = require('@supabase/supabase-js');

const supabaseUrl = process.env.NEXT_PUBLIC_SUPABASE_URL;
const supabaseServiceKey = process.env.SUPABASE_SERVICE_KEY;

if (!supabaseUrl || !supabaseServiceKey) {
  console.error('❌ Missing environment variables');
  process.exit(1);
}

const supabase = createClient(supabaseUrl, supabaseServiceKey);

async function switchToGemini() {
  console.log('\n🔄 Switching Story Illustration to Google Gemini');
  console.log('━'.repeat(50));

  try {
    // Step 1: Activate Gemini config
    console.log('\n1️⃣ Activating Google Gemini config...');
    const { data: geminiData, error: geminiError } = await supabase
      .from('ai_configs')
      .update({ is_active: true, is_default: true })
      .eq('purpose', 'story_illustration')
      .eq('provider', 'google')
      .select();

    if (geminiError) {
      console.error('❌ Error activating Gemini:', geminiError);
      process.exit(1);
    }

    console.log('✅ Gemini config activated:', geminiData);

    // Step 2: Deactivate DALL-E config
    console.log('\n2️⃣ Deactivating DALL-E 3 config...');
    const { data: dalleData, error: dalleError } = await supabase
      .from('ai_configs')
      .update({ is_active: false, is_default: false })
      .eq('purpose', 'story_illustration')
      .eq('provider', 'openai')
      .select();

    if (dalleError) {
      console.error('❌ Error deactivating DALL-E:', dalleError);
      process.exit(1);
    }

    console.log('✅ DALL-E 3 config deactivated:', dalleData);

    // Step 3: Verify changes
    console.log('\n3️⃣ Verifying changes...');
    const { data: verifyData, error: verifyError } = await supabase
      .from('ai_configs')
      .select('*')
      .eq('purpose', 'story_illustration')
      .order('provider');

    if (verifyError) {
      console.error('❌ Error verifying:', verifyError);
    } else {
      console.log('\n📊 Current story_illustration configs:');
      verifyData.forEach(config => {
        console.log(`  - ${config.name} (${config.provider}): active=${config.is_active}, default=${config.is_default}`);
      });
    }

    console.log('\n✅ Successfully switched to Google Gemini!');
    console.log('━'.repeat(50));

  } catch (error) {
    console.error('\n❌ Switch failed:', error);
    process.exit(1);
  }
}

switchToGemini();
