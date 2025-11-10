/**
 * Script to update gender descriptors with enhanced aging descriptions
 * Adds visual aging cues to help AI generate more age-appropriate characters
 */

const { createClient } = require('@supabase/supabase-js');

const supabaseUrl = process.env.NEXT_PUBLIC_SUPABASE_URL || 'https://iolimejvugpcpnmruqww.supabase.co';
const supabaseKey = process.env.SUPABASE_SERVICE_KEY;

if (!supabaseKey) {
  console.error('❌ SUPABASE_SERVICE_KEY environment variable is required');
  process.exit(1);
}

const supabase = createClient(supabaseUrl, supabaseKey, {
  auth: {
    autoRefreshToken: false,
    persistSession: false
  }
});

// Enhanced descriptors with visual aging cues
const enhancedDescriptors = [
  // Middle-aged (45-54) - Add subtle aging hints
  { simple_term: 'male', min_age: 45, max_age: 54, old_description: 'middle-aged man', new_description: 'middle-aged man with distinguished features' },
  { simple_term: 'female', min_age: 45, max_age: 54, old_description: 'middle-aged woman', new_description: 'middle-aged woman with graceful features' },
  { simple_term: 'non-binary', min_age: 45, max_age: 54, old_description: 'middle-aged person', new_description: 'middle-aged person with mature features' },

  // Mature (55-64) - More visible aging
  { simple_term: 'male', min_age: 55, max_age: 64, old_description: 'mature man', new_description: 'mature man with silver-streaked hair and weathered features' },
  { simple_term: 'female', min_age: 55, max_age: 64, old_description: 'mature woman', new_description: 'mature woman with subtle laugh lines and elegant gray highlights' },
  { simple_term: 'non-binary', min_age: 55, max_age: 64, old_description: 'mature person', new_description: 'mature person with distinguished gray hair and refined features' },

  // Senior (65-74) - Clear aging features
  { simple_term: 'male', min_age: 65, max_age: 74, old_description: 'older man', new_description: 'older man with silver-gray hair, gentle wrinkles, and warm experienced features' },
  { simple_term: 'female', min_age: 65, max_age: 74, old_description: 'older woman', new_description: 'older woman with silvered hair, gentle smile lines, and kind aged features' },
  { simple_term: 'non-binary', min_age: 65, max_age: 74, old_description: 'older person', new_description: 'older person with gray hair, gentle wrinkles, and wise features' },

  // Elderly (75-99) - Pronounced aging characteristics
  { simple_term: 'male', min_age: 75, max_age: 99, old_description: 'elderly man', new_description: 'elderly man with white hair, deep smile lines, age spots, and wise kindly features' },
  { simple_term: 'female', min_age: 75, max_age: 99, old_description: 'elderly woman', new_description: 'elderly woman with white hair, gentle wrinkled skin, age spots, and warm grandmotherly features' },
  { simple_term: 'non-binary', min_age: 75, max_age: 99, old_description: 'elderly person', new_description: 'elderly person with white hair, deep wrinkles, age spots, and gentle aged features' },
];

async function updateGenderDescriptors() {
  console.log(`\n📝 Updating ${enhancedDescriptors.length} gender descriptors with enhanced aging features...\n`);

  let successCount = 0;
  let errorCount = 0;

  for (const descriptor of enhancedDescriptors) {
    try {
      // Find and update the specific descriptor
      const { data: existing, error: findError } = await supabase
        .from('descriptors_gender')
        .select('*')
        .eq('simple_term', descriptor.simple_term)
        .eq('min_age', descriptor.min_age)
        .eq('max_age', descriptor.max_age)
        .single();

      if (findError) {
        console.error(`❌ Error finding ${descriptor.simple_term} (${descriptor.min_age}-${descriptor.max_age}):`, findError.message);
        errorCount++;
        continue;
      }

      if (!existing) {
        console.error(`❌ Not found: ${descriptor.simple_term} (${descriptor.min_age}-${descriptor.max_age})`);
        errorCount++;
        continue;
      }

      // Update with enhanced description
      const { error: updateError } = await supabase
        .from('descriptors_gender')
        .update({ rich_description: descriptor.new_description })
        .eq('id', existing.id);

      if (updateError) {
        console.error(`❌ Error updating ${descriptor.simple_term} (${descriptor.min_age}-${descriptor.max_age}):`, updateError.message);
        errorCount++;
      } else {
        console.log(`✅ Updated: ${descriptor.simple_term} (${descriptor.min_age}-${descriptor.max_age})`);
        console.log(`   Old: "${descriptor.old_description}"`);
        console.log(`   New: "${descriptor.new_description}"`);
        successCount++;
      }
    } catch (err) {
      console.error(`❌ Exception updating ${descriptor.simple_term}:`, err.message);
      errorCount++;
    }
  }

  console.log(`\n📊 Summary:`);
  console.log(`   ✅ Successfully updated: ${successCount}`);
  console.log(`   ❌ Errors: ${errorCount}`);
  console.log(`   📝 Total processed: ${enhancedDescriptors.length}\n`);
}

updateGenderDescriptors()
  .then(() => {
    console.log('✨ Done!\n');
    process.exit(0);
  })
  .catch((error) => {
    console.error('💥 Fatal error:', error);
    process.exit(1);
  });
