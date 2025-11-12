/**
 * Script to update story length parameters to 8 scenes
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

const supabase = createClient(supabaseUrl, supabaseServiceKey);

async function updateStoryLengths() {
  console.log('Updating story length parameters to 8 scenes...\n');

  // Define the updates
  const updates = [
    {
      name: 'short',
      metadata: {
        paragraph_count_min: 8,
        paragraph_count_max: 8,
        word_count_min: 400,
        word_count_max: 480,
        estimated_reading_minutes: 3
      }
    },
    {
      name: 'medium',
      metadata: {
        paragraph_count_min: 8,
        paragraph_count_max: 8,
        word_count_min: 640,
        word_count_max: 800,
        estimated_reading_minutes: 5
      }
    },
    {
      name: 'long',
      metadata: {
        paragraph_count_min: 8,
        paragraph_count_max: 8,
        word_count_min: 960,
        word_count_max: 1200,
        estimated_reading_minutes: 8
      }
    }
  ];

  // Apply each update
  for (const update of updates) {
    console.log(`Updating ${update.name} story length...`);

    const { data, error } = await supabase
      .from('story_parameters')
      .update({ metadata: update.metadata })
      .eq('type', 'length')
      .eq('name', update.name)
      .select();

    if (error) {
      console.error(`Error updating ${update.name}:`, error);
    } else {
      console.log(`✓ Updated ${update.name} story length`);
      console.log(`  - Scenes: 8`);
      console.log(`  - Words: ${update.metadata.word_count_min}-${update.metadata.word_count_max}`);
      console.log(`  - Reading time: ~${update.metadata.estimated_reading_minutes} minutes\n`);
    }
  }

  // Verify the updates
  console.log('Verifying updates...');
  const { data: lengths, error: fetchError } = await supabase
    .from('story_parameters')
    .select('name, metadata')
    .eq('type', 'length')
    .order('name');

  if (fetchError) {
    console.error('Error fetching updated lengths:', fetchError);
  } else {
    console.log('\nCurrent story lengths:');
    lengths.forEach(length => {
      console.log(`\n${length.name}:`);
      console.log(`  Paragraphs: ${length.metadata.paragraph_count_min}-${length.metadata.paragraph_count_max}`);
      console.log(`  Words: ${length.metadata.word_count_min}-${length.metadata.word_count_max}`);
      console.log(`  Reading time: ${length.metadata.estimated_reading_minutes} minutes`);
    });
  }

  console.log('\n✓ Story length update complete!');
}

updateStoryLengths().catch(console.error);