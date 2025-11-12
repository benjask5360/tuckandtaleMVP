/**
 * Direct script to add illustration columns to content table
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
  auth: {
    persistSession: false
  }
});

async function addIllustrationColumns() {
  console.log('Adding illustration columns to content table...\n');

  try {
    // Test connection first
    const { data: testData, error: testError } = await supabase
      .from('content')
      .select('id')
      .limit(1);

    if (testError) {
      console.error('Error connecting to database:', testError);
      return;
    }

    console.log('✓ Connected to database successfully\n');

    // Check existing columns
    const { data: contentData, error: contentError } = await supabase
      .from('content')
      .select('*')
      .limit(1);

    if (!contentError && contentData && contentData.length > 0) {
      const existingColumns = Object.keys(contentData[0]);
      console.log('Current columns:', existingColumns.join(', '), '\n');

      if (existingColumns.includes('story_illustration_prompt')) {
        console.log('✓ story_illustration_prompt column already exists');
      } else {
        console.log('⚠ story_illustration_prompt column needs to be added');
      }

      if (existingColumns.includes('include_illustrations')) {
        console.log('✓ include_illustrations column already exists');
      } else {
        console.log('⚠ include_illustrations column needs to be added');
      }
    }

    console.log('\n===========================================');
    console.log('MANUAL MIGRATION REQUIRED');
    console.log('===========================================\n');
    console.log('Please run the following SQL in your Supabase dashboard:');
    console.log('(Go to SQL Editor in Supabase Dashboard)\n');
    console.log(`-- Add illustration columns to content table

ALTER TABLE content
ADD COLUMN IF NOT EXISTS story_illustration_prompt text;

ALTER TABLE content
ADD COLUMN IF NOT EXISTS include_illustrations boolean DEFAULT false;

-- Add comments
COMMENT ON COLUMN content.story_illustration_prompt IS
'OpenAI-generated prompt for creating story illustrations. Contains a 3x3 grid description with character introductions and 8 scene descriptions in Disney Pixar style.';

COMMENT ON COLUMN content.include_illustrations IS
'Flag indicating whether illustration prompt generation was requested for this story.';
`);

    console.log('\n===========================================\n');

  } catch (error) {
    console.error('Error:', error);
  }
}

addIllustrationColumns().catch(console.error);