const { createClient } = require('@supabase/supabase-js');
const { mapSelectionsToEnhanced } = require('../lib/prompt-builders/descriptorMapper');

const supabaseUrl = 'https://iolimejvugpcpnmruqww.supabase.co';
const supabaseServiceKey = 'eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJpc3MiOiJzdXBhYmFzZSIsInJlZiI6ImlvbGltZWp2dWdwY3BubXJ1cXd3Iiwicm9sZSI6InNlcnZpY2Vfcm9sZSIsImlhdCI6MTc2MjM3NDA5NCwiZXhwIjoyMDc3OTUwMDk0fQ.ybv7KgWy0fdRTik1UkX3nAjdgLsBEExpLUrvnG2FRMA';

async function debugHairType() {
  console.log('=== Debugging Hair Type Integration ===\n');

  // Test 1: Check database has hair_type values
  console.log('1. Checking hair_type in database...');
  const supabase = createClient(supabaseUrl, supabaseServiceKey);

  const { data: hairTypes, error } = await supabase
    .from('descriptors_attribute')
    .select('*')
    .eq('attribute_type', 'hair_type')
    .order('sort_order');

  if (error) {
    console.error('  ✗ Database error:', error.message);
  } else if (!hairTypes || hairTypes.length === 0) {
    console.error('  ✗ No hair_type records found in database!');
  } else {
    console.log('  ✓ Found hair_type records:');
    hairTypes.forEach(ht => {
      console.log(`    - ${ht.simple_term}: "${ht.rich_description}"`);
    });
  }

  // Test 2: Check descriptor mapper with hairType selection
  console.log('\n2. Testing descriptor mapper with hairType="curly"...');

  const testSelections = {
    age: 8,
    gender: 'female',
    hairColor: 'brown',
    hairLength: 'medium',
    hairType: 'curly',
    eyeColor: 'brown',
    skinTone: 'medium'
  };

  console.log('  Input selections:', JSON.stringify(testSelections, null, 2));

  try {
    const enhanced = await mapSelectionsToEnhanced('child', testSelections);
    console.log('\n  Enhanced descriptors returned:');
    console.log('    - hair:', enhanced.hair);
    console.log('    - hairLength:', enhanced.hairLength);
    console.log('    - hairType:', enhanced.hairType);
    console.log('    - eyes:', enhanced.eyes);
    console.log('    - skin:', enhanced.skin);
    console.log('    - gender:', enhanced.gender);
    console.log('    - age:', enhanced.age);

    if (enhanced.hairType) {
      console.log('\n  ✓ hairType successfully mapped to:', enhanced.hairType);
    } else {
      console.log('\n  ✗ hairType is MISSING from enhanced descriptors!');
    }
  } catch (error) {
    console.error('  ✗ Error in descriptor mapper:', error.message);
    console.error(error.stack);
  }

  // Test 3: Test the full avatar prompt generation
  console.log('\n3. Testing full avatar prompt generation...');
  const { generateAvatarPrompt } = require('../lib/prompt-builders/avatarPromptBuilder');

  try {
    const prompt = await generateAvatarPrompt('child', testSelections);
    console.log('\n  Generated prompt:');
    console.log('  ', prompt);

    if (prompt.includes('curly')) {
      console.log('\n  ✓ "curly" found in prompt!');
    } else {
      console.log('\n  ✗ "curly" NOT found in prompt!');
    }
  } catch (error) {
    console.error('  ✗ Error generating prompt:', error.message);
    console.error(error.stack);
  }
}

debugHairType().catch(error => {
  console.error('Fatal error:', error);
  process.exit(1);
});