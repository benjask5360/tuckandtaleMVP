/**
 * One-time script to fix old gender values in character_profiles
 * Converts: 'boy' -> 'male', 'girl' -> 'female', 'prefer_not_to_say' -> 'non-binary'
 */

const { createClient } = require('@supabase/supabase-js');

const supabaseUrl = process.env.NEXT_PUBLIC_SUPABASE_URL;
const supabaseServiceKey = process.env.SUPABASE_SERVICE_KEY;

if (!supabaseUrl || !supabaseServiceKey) {
  console.error('Missing Supabase credentials');
  console.error('NEXT_PUBLIC_SUPABASE_URL:', supabaseUrl);
  console.error('SUPABASE_SERVICE_KEY:', supabaseServiceKey ? 'present' : 'missing');
  process.exit(1);
}

const supabase = createClient(supabaseUrl, supabaseServiceKey);

async function fixGenderValues() {
  console.log('Fetching characters with old gender values...');

  // Get all characters
  const { data: characters, error } = await supabase
    .from('character_profiles')
    .select('id, attributes');

  if (error) {
    console.error('Error fetching characters:', error);
    return;
  }

  console.log(`Found ${characters.length} total characters`);

  let updatedCount = 0;

  for (const character of characters) {
    const gender = character.attributes?.gender;

    if (!gender) continue;

    let newGender = null;
    if (gender === 'boy') newGender = 'male';
    else if (gender === 'girl') newGender = 'female';
    else if (gender === 'prefer_not_to_say') newGender = 'non-binary';

    if (newGender) {
      console.log(`Updating character ${character.id}: ${gender} -> ${newGender}`);

      const updatedAttributes = {
        ...character.attributes,
        gender: newGender
      };

      const { error: updateError } = await supabase
        .from('character_profiles')
        .update({ attributes: updatedAttributes })
        .eq('id', character.id);

      if (updateError) {
        console.error(`Error updating character ${character.id}:`, updateError);
      } else {
        updatedCount++;
      }
    }
  }

  console.log(`\nUpdated ${updatedCount} characters with new gender values`);
}

fixGenderValues()
  .then(() => {
    console.log('Done!');
    process.exit(0);
  })
  .catch((error) => {
    console.error('Script failed:', error);
    process.exit(1);
  });
