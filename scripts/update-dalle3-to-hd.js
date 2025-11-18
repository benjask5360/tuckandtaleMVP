#!/usr/bin/env node

/**
 * Update DALL-E 3 Config to HD Quality
 * Changes quality from 'standard' to 'hd'
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

async function updateToHD() {
  console.log('\n🚀 Updating DALL-E 3 to HD Quality');
  console.log('━'.repeat(50));

  try {
    // Update the DALL-E 3 config to use HD quality
    const { data, error } = await supabase
      .from('ai_configs')
      .update({
        settings: {
          size: '1024x1024',
          quality: 'hd',
          style: 'vivid'
        }
      })
      .eq('purpose', 'story_illustration')
      .eq('provider', 'openai')
      .select();

    if (error) {
      console.error('❌ Error updating config:', error);
      process.exit(1);
    }

    console.log('✅ DALL-E 3 config updated to HD quality:', data);
    console.log('\n📊 New settings:');
    console.log('  - Size: 1024x1024');
    console.log('  - Quality: hd');
    console.log('  - Style: vivid');
    console.log('  - Cost: $0.08 per image (was $0.04 with standard)');
    console.log('\n✅ Update completed successfully!');
    console.log('━'.repeat(50));

  } catch (error) {
    console.error('\n❌ Update failed:', error);
    process.exit(1);
  }
}

updateToHD();
