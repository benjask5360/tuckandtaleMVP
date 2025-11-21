/**
 * Fix Pet and Magical Creature Appearance Descriptions
 *
 * Regenerates appearance_description for pet and magical_creature profiles
 * to include breed/type and color information properly.
 *
 * Pets - Before: "A pet" | After: "A golden Corgi" or "A black Pug with brown eyes"
 * Magical Creatures - Before: "A magical creature" | After: "A rainbow elf" or "A silver dragon with golden eyes"
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
 * Matches logic in lib/prompt-builders/descriptorMapper.ts and descriptionBuilder.ts
 */
function buildPetDescription(attributes) {
  const parts = [];

  // Get species/breed - PRIORITY: breed over species (don't concatenate!)
  // This matches descriptorMapper.ts lines 263-271
  let species = '';
  if (attributes.breed) {
    species = attributes.breed;  // Use ONLY breed if provided
  } else if (attributes.species) {
    species = attributes.species;  // Fall back to species only if no breed
  }

  // Clean up primaryColor - extract just the color part if it has extra text
  let petColor = attributes.primaryColor;
  if (petColor) {
    // Remove common suffixes like ", solid color" or extra whitespace
    petColor = petColor.replace(/,\s*solid color/i, '').trim();
  }

  // Start with color (if provided) then species/breed
  if (petColor && species) {
    parts.push(`A ${petColor} ${species}`);
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

/**
 * Build magical creature description from attributes
 * Matches logic in lib/prompt-builders/descriptorMapper.ts and descriptionBuilder.ts
 */
function buildMagicalCreatureDescription(attributes) {
  const parts = [];

  // Get creature type - use creatureType directly
  // This matches descriptorMapper.ts lines 305-308
  const creature = attributes.creatureType || '';

  // Get magical color
  const magicalColor = attributes.color ? attributes.color.trim() : '';

  // Start with color (if provided) then creature type
  if (magicalColor && creature) {
    parts.push(`A ${magicalColor} ${creature}`);
  } else if (creature) {
    parts.push(`A ${creature}`);
  } else {
    parts.push('A magical creature');
  }

  // Add additional attributes
  const magicalAttributes = [];
  if (attributes.eyeColor) {
    magicalAttributes.push(`${attributes.eyeColor} eyes`);
  }

  if (magicalAttributes.length > 0) {
    parts.push('with');
    parts.push(magicalAttributes.join(' and '));
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

async function fixMagicalCreatureDescriptions() {
  console.log('\n🔍 Fetching all magical creature profiles...\n');

  // Get all magical creatures
  const { data: creatures, error: fetchError } = await supabase
    .from('character_profiles')
    .select('id, name, attributes, appearance_description')
    .eq('character_type', 'magical_creature')
    .is('deleted_at', null);

  if (fetchError) {
    console.error('❌ Error fetching magical creatures:', fetchError);
    process.exit(1);
  }

  console.log(`Found ${creatures.length} magical creature profiles\n`);

  let updatedCount = 0;
  let skippedCount = 0;

  for (const creature of creatures) {
    const oldDescription = creature.appearance_description;
    const newDescription = buildMagicalCreatureDescription(creature.attributes || {});

    console.log(`\n✨ ${creature.name}`);
    console.log(`   Attributes:`, JSON.stringify(creature.attributes));
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
      .eq('id', creature.id);

    if (updateError) {
      console.error(`   ❌ Error updating:`, updateError);
    } else {
      console.log(`   ✅ Updated!`);
      updatedCount++;
    }
  }

  console.log('\n' + '='.repeat(60));
  console.log('✨ Magical creature description fix complete!');
  console.log('='.repeat(60));
  console.log(`Updated: ${updatedCount}`);
  console.log(`Skipped: ${skippedCount}`);
  console.log(`Total:   ${creatures.length}`);
  console.log('='.repeat(60));
}

async function fixAllDescriptions() {
  try {
    await fixPetDescriptions();
    await fixMagicalCreatureDescriptions();
    console.log('\n🎉 All character descriptions fixed!\n');
  } catch (error) {
    console.error('❌ Fatal error:', error);
    process.exit(1);
  }
}

fixAllDescriptions();
