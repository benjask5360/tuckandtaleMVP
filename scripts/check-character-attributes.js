const { createClient } = require('@supabase/supabase-js');

const supabaseUrl = 'https://iolimejvugpcpnmruqww.supabase.co';
const supabaseServiceKey = 'eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJpc3MiOiJzdXBhYmFzZSIsInJlZiI6ImlvbGltZWp2dWdwY3BubXJ1cXd3Iiwicm9sZSI6InNlcnZpY2Vfcm9sZSIsImlhdCI6MTc2MjM3NDA5NCwiZXhwIjoyMDc3OTUwMDk0fQ.ybv7KgWy0fdRTik1UkX3nAjdgLsBEExpLUrvnG2FRMA';

async function checkCharacterAttributes() {
  const supabase = createClient(supabaseUrl, supabaseServiceKey);

  console.log('=== Checking Character Attributes ===\n');

  // Get the most recently updated character
  const { data: characters, error } = await supabase
    .from('character_profiles')
    .select('id, name, character_type, attributes, updated_at')
    .order('updated_at', { ascending: false })
    .limit(5);

  if (error) {
    console.error('Error fetching characters:', error.message);
    return;
  }

  if (!characters || characters.length === 0) {
    console.log('No characters found in database');
    return;
  }

  console.log(`Found ${characters.length} most recent characters:\n`);

  characters.forEach((char, index) => {
    console.log(`${index + 1}. ${char.name} (${char.character_type})`);
    console.log(`   ID: ${char.id}`);
    console.log(`   Updated: ${char.updated_at}`);
    console.log('   Attributes:', JSON.stringify(char.attributes, null, 2));

    if (char.attributes?.hairType) {
      console.log(`   ✓ HAS hairType: ${char.attributes.hairType}`);
    } else {
      console.log('   ✗ NO hairType in attributes');
    }

    if (char.attributes?.hairLength) {
      console.log(`   ✓ HAS hairLength: ${char.attributes.hairLength}`);
    }

    console.log('');
  });
}

checkCharacterAttributes().catch(error => {
  console.error('Fatal error:', error);
  process.exit(1);
});