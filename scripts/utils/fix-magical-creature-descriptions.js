/**
 * Fix Magical Creature Appearance Descriptions
 *
 * Regenerates appearance_description for all magical creature character profiles
 * to include creature type and color information properly.
 *
 * Before: "A magical creature"
 * After: "A gold dragon" or "A silver unicorn with sapphire eyes"
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
 * Build magical creature description from attributes
 * Matches logic in lib/prompt-builders/descriptionBuilder.ts
 */
function buildMagicalCreatureDescription(attributes) {
  const parts = [];

  // Get creature type
  const creatureType = attributes.creatureType || '';

  // Start with color (if provided) then creature type
  if (attributes.color && creatureType) {
    parts.push(`A ${attributes.color} ${creatureType}`);
  } else if (creatureType) {
    parts.push(`A ${creatureType}`);
  } else {
    parts.push('A magical creature');
  }

  // Add additional attributes
  const magicalAttributes = [];
  if (attributes.hairColor) {
    magicalAttributes.push(`${attributes.hairColor} mane`);
  }
  if (attributes.eyeColor) {
    magicalAttributes.push(`${attributes.eyeColor} eyes`);
  }
  if (attributes.skinTone) {
    magicalAttributes.push(`${attributes.skinTone} scales`);
  }

  if (magicalAttributes.length > 0) {
    parts.push('with');
    parts.push(magicalAttributes.join(' and '));
  }

  return parts.join(' ');
}

async function fixMagicalCreatureDescriptions() {
  console.log('🔍 Fetching all magical creature profiles...\n');

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

    console.log(`\n📝 ${creature.name}`);
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

fixMagicalCreatureDescriptions().catch(error => {
  console.error('❌ Fatal error:', error);
  process.exit(1);
});
