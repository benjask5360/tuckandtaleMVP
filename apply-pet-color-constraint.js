/**
 * Script to update the descriptors_attribute constraint to allow pet_color
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

async function updateConstraint() {
  console.log('\n📝 Updating descriptors_attribute constraint to allow pet_color...\n');

  try {
    // Drop the existing constraint
    const { error: dropError } = await supabase.rpc('exec_sql', {
      query: `
        ALTER TABLE public.descriptors_attribute
        DROP CONSTRAINT IF EXISTS descriptors_attribute_attribute_type_check;
      `
    });

    if (dropError) {
      console.error('❌ Error dropping constraint:', dropError);
      throw dropError;
    }

    console.log('✅ Dropped existing constraint');

    // Add the new constraint with pet_color
    const { error: addError } = await supabase.rpc('exec_sql', {
      query: `
        ALTER TABLE public.descriptors_attribute
        ADD CONSTRAINT descriptors_attribute_attribute_type_check
        CHECK (attribute_type IN ('hair', 'eyes', 'skin', 'body', 'hair_length', 'glasses', 'pet_color'));
      `
    });

    if (addError) {
      console.error('❌ Error adding new constraint:', addError);
      throw addError;
    }

    console.log('✅ Added new constraint with pet_color support\n');
    console.log('✨ Done! Now run: node add-pet-color-descriptors.js\n');
  } catch (error) {
    console.error('💥 Fatal error:', error);
    process.exit(1);
  }
}

updateConstraint()
  .then(() => process.exit(0))
  .catch((error) => {
    console.error('💥 Fatal error:', error);
    process.exit(1);
  });
