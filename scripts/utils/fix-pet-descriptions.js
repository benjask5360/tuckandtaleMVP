/**
 * Fix Pet Appearance Descriptions
 *
 * Regenerates appearance_description for all pet character profiles
 * to include breed and color information properly.
 *
 * Before: "A pet"
 * After: "A golden Corgi dog" or "A black Pug dog with brown eyes"
 */

const { createClient } = require('@supabase/supabase-js');

const supabaseUrl = process.env.NEXT_PUBLIC_SUPABASE_URL;
const supabaseKey = process.env.SUPABASE_SERVICE_KEY;

if (!supabaseUrl || !supabaseKey) {
  console.error('❌ Missing environment variables!');
  console.error('Required: NEXT_PUBLIC_SUPABASE_URL, SUPABASE_SERVICE_KEY');
  process.exit(1);
}

const supabase = createClient(supabaseUrl, supabaseKey);

/**
 * Build pet description from attributes
 * Matches logic in lib/prompt-builders/descriptionBuilder.ts
 */
function buildPetDescription(attributes) {
  const parts = [];

  // Get species/breed
  let species = '';
  if (attributes.breed && attributes.species) {
    species = `${attributes.breed} ${attributes.species}`;
  } else if (attributes.breed) {
    species = attributes.breed;
  } else if (attributes.species) {
    species = attributes.species;
  }

  // Start with color (if provided) then species/breed
  if (attributes.primaryColor && species) {
    parts.push(`A ${attributes.primaryColor} ${species}`);
  } else if (species) {
    parts.push(`A ${species}`);
  } else {
    parts.push('A pet');
  }

  // Add additional attributes
  const petAttributes = [];
  if (attributes.eyeColor) {
    petAttributes.push(`${attributes.eyeColor} eyes`);
  }

  if (petAttributes.length > 0) {
    parts.push('with');
    parts.push(petAttributes.join(' and '));
  }

  return parts.join(' ');
}

async function fixPetDescriptions() {
  console.log('🔍 Fetching all pet profiles...\n');

  // Get all pets
  const { data: pets, error: fetchError } = await supabase
    .from('character_profiles')
    .select('id, name, attributes, appearance_description')
    .eq('character_type', 'pet')
    .is('deleted_at', null);

  if (fetchError) {
    console.error('❌ Error fetching pets:', fetchError);
    process.exit(1);
  }

  console.log(`Found ${pets.length} pet profiles\n`);

  let updatedCount = 0;
  let skippedCount = 0;

  for (const pet of pets) {
    const oldDescription = pet.appearance_description;
    const newDescription = buildPetDescription(pet.attributes || {});

    console.log(`\n📝 ${pet.name}`);
    console.log(`   Attributes:`, JSON.stringify(pet.attributes));
    console.log(`   Old: "${oldDescription}"`);
    console.log(`   New: "${newDescription}"`);

    if (oldDescription === newDescription) {
      console.log(`   ⏭️  Skipped (already correct)`);
      skippedCount++;
      continue;
    }

    // Update the description
    const { error: updateError } = await supabase
      .from('character_profiles')
      .update({ appearance_description: newDescription })
      .eq('id', pet.id);

    if (updateError) {
      console.error(`   ❌ Error updating:`, updateError);
    } else {
      console.log(`   ✅ Updated!`);
      updatedCount++;
    }
  }

  console.log('\n' + '='.repeat(60));
  console.log('✨ Pet description fix complete!');
  console.log('='.repeat(60));
  console.log(`Updated: ${updatedCount}`);
  console.log(`Skipped: ${skippedCount}`);
  console.log(`Total:   ${pets.length}`);
  console.log('='.repeat(60));
}

fixPetDescriptions().catch(error => {
  console.error('❌ Fatal error:', error);
  process.exit(1);
});
