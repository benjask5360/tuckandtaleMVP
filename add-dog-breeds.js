/**
 * Script to add more dog breeds to descriptors_pet table
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

const dogBreeds = [
  // Corgis
  { species: 'dog', breed: 'corgi', simple_term: 'corgi', rich_description: 'adorable corgi', size_category: 'small', temperament: ["playful", "smart", "affectionate"] },
  { species: 'dog', breed: 'pembroke welsh corgi', simple_term: 'pembroke corgi', rich_description: 'pembroke welsh corgi', size_category: 'small', temperament: ["intelligent", "friendly", "loyal"] },
  { species: 'dog', breed: 'cardigan welsh corgi', simple_term: 'cardigan corgi', rich_description: 'cardigan welsh corgi', size_category: 'small', temperament: ["intelligent", "devoted", "adaptable"] },

  // Small/Toy Breeds
  { species: 'dog', breed: 'chihuahua', simple_term: 'chihuahua', rich_description: 'chihuahua', size_category: 'tiny', temperament: ["sassy", "devoted", "alert"] },
  { species: 'dog', breed: 'shih tzu', simple_term: 'shih tzu', rich_description: 'shih tzu', size_category: 'small', temperament: ["affectionate", "playful", "outgoing"] },
  { species: 'dog', breed: 'maltese', simple_term: 'maltese', rich_description: 'maltese', size_category: 'tiny', temperament: ["gentle", "playful", "charming"] },
  { species: 'dog', breed: 'french bulldog', simple_term: 'frenchie', rich_description: 'french bulldog', size_category: 'small', temperament: ["playful", "adaptable", "smart"] },
  { species: 'dog', breed: 'boston terrier', simple_term: 'boston terrier', rich_description: 'boston terrier', size_category: 'small', temperament: ["friendly", "bright", "amusing"] },
  { species: 'dog', breed: 'cavalier king charles spaniel', simple_term: 'cavalier', rich_description: 'cavalier king charles spaniel', size_category: 'small', temperament: ["affectionate", "gentle", "graceful"] },
  { species: 'dog', breed: 'pug', simple_term: 'pug', rich_description: 'pug', size_category: 'small', temperament: ["charming", "mischievous", "loving"] },

  // Medium Breeds
  { species: 'dog', breed: 'border collie', simple_term: 'border collie', rich_description: 'border collie', size_category: 'medium', temperament: ["intelligent", "energetic", "alert"] },
  { species: 'dog', breed: 'australian shepherd', simple_term: 'aussie', rich_description: 'australian shepherd', size_category: 'medium', temperament: ["smart", "energetic", "loyal"] },
  { species: 'dog', breed: 'cocker spaniel', simple_term: 'cocker spaniel', rich_description: 'cocker spaniel', size_category: 'medium', temperament: ["gentle", "happy", "smart"] },
  { species: 'dog', breed: 'brittany spaniel', simple_term: 'brittany', rich_description: 'brittany spaniel', size_category: 'medium', temperament: ["energetic", "happy", "bright"] },
  { species: 'dog', breed: 'boxer', simple_term: 'boxer', rich_description: 'boxer', size_category: 'large', temperament: ["playful", "energetic", "loyal"] },

  // Large Breeds
  { species: 'dog', breed: 'rottweiler', simple_term: 'rottweiler', rich_description: 'rottweiler', size_category: 'large', temperament: ["loyal", "confident", "courageous"] },
  { species: 'dog', breed: 'doberman', simple_term: 'doberman', rich_description: 'doberman pinscher', size_category: 'large', temperament: ["loyal", "alert", "intelligent"] },
  { species: 'dog', breed: 'great dane', simple_term: 'great dane', rich_description: 'great dane', size_category: 'giant', temperament: ["friendly", "patient", "dependable"] },
  { species: 'dog', breed: 'bernese mountain dog', simple_term: 'bernese', rich_description: 'bernese mountain dog', size_category: 'giant', temperament: ["calm", "affectionate", "intelligent"] },
  { species: 'dog', breed: 'saint bernard', simple_term: 'saint bernard', rich_description: 'saint bernard', size_category: 'giant', temperament: ["gentle", "friendly", "calm"] },
  { species: 'dog', breed: 'mastiff', simple_term: 'mastiff', rich_description: 'mastiff', size_category: 'giant', temperament: ["dignified", "courageous", "good-natured"] },

  // Working/Herding Breeds
  { species: 'dog', breed: 'australian cattle dog', simple_term: 'cattle dog', rich_description: 'australian cattle dog', size_category: 'medium', temperament: ["alert", "intelligent", "loyal"] },
  { species: 'dog', breed: 'shetland sheepdog', simple_term: 'sheltie', rich_description: 'shetland sheepdog', size_category: 'small', temperament: ["intelligent", "playful", "energetic"] },
  { species: 'dog', breed: 'collie', simple_term: 'collie', rich_description: 'collie', size_category: 'large', temperament: ["loyal", "graceful", "proud"] },

  // Terriers
  { species: 'dog', breed: 'jack russell terrier', simple_term: 'jack russell', rich_description: 'jack russell terrier', size_category: 'small', temperament: ["energetic", "fearless", "intelligent"] },
  { species: 'dog', breed: 'bull terrier', simple_term: 'bull terrier', rich_description: 'bull terrier', size_category: 'medium', temperament: ["playful", "charming", "mischievous"] },
  { species: 'dog', breed: 'scottish terrier', simple_term: 'scottie', rich_description: 'scottish terrier', size_category: 'small', temperament: ["independent", "confident", "spirited"] },
  { species: 'dog', breed: 'west highland terrier', simple_term: 'westie', rich_description: 'west highland white terrier', size_category: 'small', temperament: ["confident", "friendly", "hardy"] },

  // Sporting/Hunting Breeds
  { species: 'dog', breed: 'english springer spaniel', simple_term: 'springer spaniel', rich_description: 'english springer spaniel', size_category: 'medium', temperament: ["friendly", "obedient", "cheerful"] },
  { species: 'dog', breed: 'vizsla', simple_term: 'vizsla', rich_description: 'vizsla', size_category: 'medium', temperament: ["affectionate", "gentle", "energetic"] },
  { species: 'dog', breed: 'weimaraner', simple_term: 'weimaraner', rich_description: 'weimaraner', size_category: 'large', temperament: ["friendly", "fearless", "alert"] },
  { species: 'dog', breed: 'pointer', simple_term: 'pointer', rich_description: 'pointer', size_category: 'large', temperament: ["even-tempered", "alert", "hard-driving"] },

  // Asian Breeds
  { species: 'dog', breed: 'shiba inu', simple_term: 'shiba', rich_description: 'shiba inu', size_category: 'small', temperament: ["alert", "confident", "spirited"] },
  { species: 'dog', breed: 'akita', simple_term: 'akita', rich_description: 'akita', size_category: 'large', temperament: ["dignified", "courageous", "profoundly loyal"] },
  { species: 'dog', breed: 'chow chow', simple_term: 'chow', rich_description: 'chow chow', size_category: 'medium', temperament: ["dignified", "serious", "aloof"] },

  // Other Popular Breeds
  { species: 'dog', breed: 'dalmatian', simple_term: 'dalmatian', rich_description: 'dalmatian', size_category: 'large', temperament: ["energetic", "playful", "sensitive"] },
  { species: 'dog', breed: 'basset hound', simple_term: 'basset', rich_description: 'basset hound', size_category: 'medium', temperament: ["patient", "low-key", "charming"] },
  { species: 'dog', breed: 'newfoundland', simple_term: 'newfoundland', rich_description: 'newfoundland', size_category: 'giant', temperament: ["sweet", "patient", "devoted"] },
  { species: 'dog', breed: 'rhodesian ridgeback', simple_term: 'ridgeback', rich_description: 'rhodesian ridgeback', size_category: 'large', temperament: ["dignified", "intelligent", "strong-willed"] },
  { species: 'dog', breed: 'samoyed', simple_term: 'samoyed', rich_description: 'fluffy samoyed', size_category: 'large', temperament: ["friendly", "gentle", "adaptable"] },
  { species: 'dog', breed: 'alaskan malamute', simple_term: 'malamute', rich_description: 'alaskan malamute', size_category: 'large', temperament: ["affectionate", "loyal", "playful"] }
];

async function addDogBreeds() {
  console.log(`\n📝 Adding ${dogBreeds.length} dog breeds to descriptors_pet table...\n`);

  let successCount = 0;
  let skipCount = 0;
  let errorCount = 0;

  for (const breed of dogBreeds) {
    try {
      const { data, error } = await supabase
        .from('descriptors_pet')
        .insert(breed)
        .select();

      if (error) {
        if (error.code === '23505') { // Unique constraint violation
          console.log(`⏭️  Skipped: ${breed.breed} (already exists)`);
          skipCount++;
        } else {
          console.error(`❌ Error adding ${breed.breed}:`, error.message);
          errorCount++;
        }
      } else {
        console.log(`✅ Added: ${breed.breed}`);
        successCount++;
      }
    } catch (err) {
      console.error(`❌ Exception adding ${breed.breed}:`, err.message);
      errorCount++;
    }
  }

  console.log(`\n📊 Summary:`);
  console.log(`   ✅ Successfully added: ${successCount}`);
  console.log(`   ⏭️  Skipped (existing): ${skipCount}`);
  console.log(`   ❌ Errors: ${errorCount}`);
  console.log(`   📝 Total processed: ${dogBreeds.length}\n`);
}

addDogBreeds()
  .then(() => {
    console.log('✨ Done!\n');
    process.exit(0);
  })
  .catch((error) => {
    console.error('💥 Fatal error:', error);
    process.exit(1);
  });
