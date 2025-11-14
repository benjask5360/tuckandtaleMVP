/**
 * Get Story ID Script
 * Fetches a random story from the database for testing vignettes
 */

const { createClient } = require('@supabase/supabase-js');

// Hard-coded credentials from .env.local
const supabaseUrl = 'https://api.tuckandtale.com';
const supabaseServiceKey =
  'eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJpc3MiOiJzdXBhYmFzZSIsInJlZiI6ImlvbGltZWp2dWdwY3BubXJ1cXd3Iiwicm9sZSI6InNlcnZpY2Vfcm9sZSIsImlhdCI6MTc2MjM3NDA5NCwiZXhwIjoyMDc3OTUwMDk0fQ.ybv7KgWy0fdRTik1UkX3nAjdgLsBEExpLUrvnG2FRMA';

const supabase = createClient(supabaseUrl, supabaseServiceKey, {
  auth: {
    autoRefreshToken: false,
    persistSession: false,
  },
});

async function getStoryId() {
  console.log('🔍 Fetching stories from database...\n');

  try {
    const { data: stories, error } = await supabase
      .from('content')
      .select('id, title, created_at, user_id')
      .eq('content_type', 'story')
      .order('created_at', { ascending: false })
      .limit(5);

    if (error) {
      console.error('❌ Error fetching stories:', error.message);
      return;
    }

    if (!stories || stories.length === 0) {
      console.log('⚠️  No stories found in database.');
      console.log('💡 Create a story first using the app, then try again.');
      return;
    }

    console.log(`✅ Found ${stories.length} recent stories:\n`);

    stories.forEach((story, index) => {
      console.log(`${index + 1}. "${story.title}"`);
      console.log(`   ID: ${story.id}`);
      console.log(`   Created: ${new Date(story.created_at).toLocaleDateString()}`);
      console.log('');
    });

    const firstStory = stories[0];
    console.log('━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━');
    console.log('🎯 COPY THIS COMMAND FOR BROWSER CONSOLE:');
    console.log('━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━\n');
    console.log(`generateVignettes("${firstStory.id}")`);
    console.log('\n━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━');
    console.log(`\n📖 This will generate vignettes for: "${firstStory.title}"`);
  } catch (error) {
    console.error('❌ Unexpected error:', error);
  }
}

getStoryId();
