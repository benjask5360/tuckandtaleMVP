/**
 * Script to update the stories view to include story_illustrations
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

async function updateStoriesView() {
  console.log('Updating stories view to include story_illustrations...\n');

  console.log('===========================================');
  console.log('MANUAL SQL REQUIRED');
  console.log('===========================================\n');
  console.log('The stories view needs to be updated to include the story_illustrations field.');
  console.log('Please run the following SQL in your Supabase dashboard:\n');
  console.log(`-- Drop existing view
DROP VIEW IF EXISTS stories CASCADE;

-- Recreate the stories view with story_illustrations included
CREATE OR REPLACE VIEW stories AS
SELECT c.*
FROM content c
WHERE c.content_type = 'story'
  AND c.deleted_at IS NULL;

-- Grant permissions on the view
GRANT SELECT ON stories TO authenticated;
GRANT SELECT ON stories TO anon;

-- Add comment to document the view
COMMENT ON VIEW stories IS 'View for accessing story content with illustrations. Filters out deleted stories and includes story_illustrations JSONB field for scene images.';`);

  console.log('\n===========================================\n');
  console.log('After running this SQL, your Story Viewer will be able to display illustrations!');
}

updateStoriesView().catch(console.error);