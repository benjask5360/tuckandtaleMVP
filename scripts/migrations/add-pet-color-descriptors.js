/**
 * Script to add pet color descriptors to descriptors_attribute table
 * These descriptors will provide rich, species-appropriate color descriptions
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

const petColorDescriptors = [
  // Basic colors with appropriate descriptors for fur/feathers/scales
  { simple_term: 'white', rich_description: 'pristine white fur', attribute_type: 'pet_color' },
  { simple_term: 'black', rich_description: 'sleek black fur', attribute_type: 'pet_color' },
  { simple_term: 'brown', rich_description: 'warm brown fur', attribute_type: 'pet_color' },
  { simple_term: 'gray', rich_description: 'soft gray fur', attribute_type: 'pet_color' },
  { simple_term: 'golden', rich_description: 'lustrous golden fur', attribute_type: 'pet_color' },
  { simple_term: 'orange', rich_description: 'vibrant orange fur', attribute_type: 'pet_color' },
  { simple_term: 'tan', rich_description: 'light tan fur', attribute_type: 'pet_color' },
  { simple_term: 'cream', rich_description: 'creamy beige fur', attribute_type: 'pet_color' },
  { simple_term: 'red', rich_description: 'reddish-brown fur', attribute_type: 'pet_color' },
  { simple_term: 'blue', rich_description: 'blue-gray fur', attribute_type: 'pet_color' },
  { simple_term: 'silver', rich_description: 'shimmering silver fur', attribute_type: 'pet_color' },

  // Pattern-based
  { simple_term: 'spotted', rich_description: 'spotted coat', attribute_type: 'pet_color' },
  { simple_term: 'striped', rich_description: 'striped pattern', attribute_type: 'pet_color' },
  { simple_term: 'brindle', rich_description: 'brindle markings', attribute_type: 'pet_color' },
  { simple_term: 'tabby', rich_description: 'tabby stripes', attribute_type: 'pet_color' },
  { simple_term: 'calico', rich_description: 'calico patches', attribute_type: 'pet_color' },
  { simple_term: 'tuxedo', rich_description: 'tuxedo markings', attribute_type: 'pet_color' },
  { simple_term: 'merle', rich_description: 'merle pattern', attribute_type: 'pet_color' },
  { simple_term: 'piebald', rich_description: 'piebald patches', attribute_type: 'pet_color' },

  // Color combinations
  { simple_term: 'black and white', rich_description: 'black and white coat', attribute_type: 'pet_color' },
  { simple_term: 'brown and white', rich_description: 'brown and white fur', attribute_type: 'pet_color' },
  { simple_term: 'tricolor', rich_description: 'tricolor coat', attribute_type: 'pet_color' },

  // Bird-specific
  { simple_term: 'green', rich_description: 'bright green feathers', attribute_type: 'pet_color' },
  { simple_term: 'blue and yellow', rich_description: 'blue and yellow plumage', attribute_type: 'pet_color' },
  { simple_term: 'red and blue', rich_description: 'red and blue feathers', attribute_type: 'pet_color' },
  { simple_term: 'multicolored', rich_description: 'rainbow-colored plumage', attribute_type: 'pet_color' },

  // Reptile/Fish-specific
  { simple_term: 'green scales', rich_description: 'emerald green scales', attribute_type: 'pet_color' },
  { simple_term: 'yellow', rich_description: 'sunny yellow coloring', attribute_type: 'pet_color' },
  { simple_term: 'iridescent', rich_description: 'iridescent shimmering scales', attribute_type: 'pet_color' },
];

async function addPetColorDescriptors() {
  console.log(`\n📝 Adding ${petColorDescriptors.length} pet color descriptors...\n`);

  let successCount = 0;
  let skipCount = 0;
  let errorCount = 0;

  for (const descriptor of petColorDescriptors) {
    try {
      const { data, error } = await supabase
        .from('descriptors_attribute')
        .insert(descriptor)
        .select();

      if (error) {
        if (error.code === '23505') { // Unique constraint violation
          console.log(`⏭️  Skipped: ${descriptor.simple_term} (already exists)`);
          skipCount++;
        } else {
          console.error(`❌ Error adding ${descriptor.simple_term}:`, error.message);
          errorCount++;
        }
      } else {
        console.log(`✅ Added: ${descriptor.simple_term} → "${descriptor.rich_description}"`);
        successCount++;
      }
    } catch (err) {
      console.error(`❌ Exception adding ${descriptor.simple_term}:`, err.message);
      errorCount++;
    }
  }

  console.log(`\n📊 Summary:`);
  console.log(`   ✅ Successfully added: ${successCount}`);
  console.log(`   ⏭️  Skipped (existing): ${skipCount}`);
  console.log(`   ❌ Errors: ${errorCount}`);
  console.log(`   📝 Total processed: ${petColorDescriptors.length}\n`);
}

addPetColorDescriptors()
  .then(() => {
    console.log('✨ Done!\n');
    process.exit(0);
  })
  .catch((error) => {
    console.error('💥 Fatal error:', error);
    process.exit(1);
  });
