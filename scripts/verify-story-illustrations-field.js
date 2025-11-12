/**
 * Script to verify story_illustrations field is ready
 */

import { createClient } from '@supabase/supabase-js';
import * as dotenv from 'dotenv';
import { fileURLToPath } from 'url';
import { dirname, join } from 'path';

const __filename = fileURLToPath(import.meta.url);
const __dirname = dirname(__filename);

// Load environment variables
dotenv.config({ path: join(__dirname, '..', '.env.local') });

const supabaseUrl = process.env.NEXT_PUBLIC_SUPABASE_URL;
const supabaseServiceKey = process.env.SUPABASE_SERVICE_KEY || process.env.SUPABASE_SERVICE_ROLE_KEY;

if (!supabaseUrl || !supabaseServiceKey) {
  console.error('Missing Supabase environment variables');
  process.exit(1);
}

const supabase = createClient(supabaseUrl, supabaseServiceKey, {
  auth: { persistSession: false }
});

async function verifyField() {
  console.log('Verifying story_illustrations field...\n');

  try {
    // Check if column exists
    const { data: testContent, error: testError } = await supabase
      .from('content')
      .select('id, story_illustrations')
      .limit(1);

    if (!testError) {
      console.log('✅ story_illustrations field exists and is accessible');

      // Check AI config
      const { data: aiConfig, error: aiConfigError } = await supabase
        .from('ai_configs')
        .select('*')
        .eq('purpose', 'story_illustration')
        .single();

      if (aiConfig) {
        console.log('✅ AI config for story_illustration exists');
        console.log('   Provider:', aiConfig.provider);
        console.log('   Model:', aiConfig.model_name);
        console.log('   Aspect Ratio:', aiConfig.settings?.aspectRatio);
      } else {
        console.log('⚠️ AI config for story_illustration missing');
      }

      console.log('\n✅ System is ready for story illustration generation and splicing!');

    } else {
      console.log('❌ story_illustrations field not found');
      console.log('\n===========================================');
      console.log('MANUAL SQL REQUIRED');
      console.log('===========================================\n');
      console.log('Please run this SQL in your Supabase dashboard:');
      console.log(`
ALTER TABLE content
ADD COLUMN IF NOT EXISTS story_illustrations jsonb;

COMMENT ON COLUMN content.story_illustrations IS
'Array of illustration objects for stories. Each object contains type (grid_3x3, scene_0-8), URL, generation timestamp, and metadata.';

CREATE INDEX IF NOT EXISTS idx_content_story_illustrations_type
ON content USING gin ((story_illustrations));
      `);
      console.log('===========================================\n');
    }

  } catch (error) {
    console.error('Error:', error);
  }
}

verifyField().catch(console.error);