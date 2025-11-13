const { createClient } = require('@supabase/supabase-js');

const supabaseUrl = 'https://iolimejvugpcpnmruqww.supabase.co';
const supabaseServiceKey = 'eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJpc3MiOiJzdXBhYmFzZSIsInJlZiI6ImlvbGltZWp2dWdwY3BubXJ1cXd3Iiwicm9sZSI6InNlcnZpY2Vfcm9sZSIsImlhdCI6MTc2MjM3NDA5NCwiZXhwIjoyMDc3OTUwMDk0fQ.ybv7KgWy0fdRTik1UkX3nAjdgLsBEExpLUrvnG2FRMA';

const supabase = createClient(supabaseUrl, supabaseServiceKey);

async function checkSchema() {
  console.log('Checking descriptor tables schema...\n');

  // Check descriptors_gender columns
  console.log('1. Checking descriptors_gender table...');
  const { data: genderData, error: genderError } = await supabase
    .from('descriptors_gender')
    .select('*')
    .limit(1);

  if (!genderError && genderData && genderData.length > 0) {
    console.log('  descriptors_gender columns:', Object.keys(genderData[0]));
  } else {
    console.log('  Error or no data:', genderError?.message);
  }

  // Check descriptors_attribute for existing attribute types
  console.log('\n2. Checking descriptors_attribute attribute types...');
  const { data: attrData, error: attrError } = await supabase
    .from('descriptors_attribute')
    .select('attribute_type')
    .order('attribute_type');

  if (!attrError && attrData) {
    const uniqueTypes = [...new Set(attrData.map(d => d.attribute_type))];
    console.log('  Existing attribute types:', uniqueTypes);
  }

  // Check descriptor_mappings columns
  console.log('\n3. Checking descriptor_mappings table...');
  const { data: mappingData, error: mappingError } = await supabase
    .from('descriptor_mappings')
    .select('*')
    .limit(1);

  if (!mappingError && mappingData && mappingData.length > 0) {
    console.log('  descriptor_mappings columns:', Object.keys(mappingData[0]));
  } else {
    console.log('  Error or no data:', mappingError?.message);
  }

  // Check for hair_length values
  console.log('\n4. Current hair_length values:');
  const { data: hairLengthData } = await supabase
    .from('descriptors_attribute')
    .select('simple_term, rich_description, sort_order')
    .eq('attribute_type', 'hair_length')
    .order('sort_order');

  if (hairLengthData) {
    hairLengthData.forEach(item => {
      console.log(`  - ${item.simple_term}: "${item.rich_description}" (sort: ${item.sort_order})`);
    });
  }

  // Check if hair_type exists
  console.log('\n5. Checking for hair_type attribute:');
  const { data: hairTypeData } = await supabase
    .from('descriptors_attribute')
    .select('simple_term, rich_description')
    .eq('attribute_type', 'hair_type');

  if (hairTypeData && hairTypeData.length > 0) {
    console.log('  hair_type values found:', hairTypeData.map(d => d.simple_term));
  } else {
    console.log('  No hair_type attribute found');
  }
}

checkSchema().catch(error => {
  console.error('Fatal error:', error);
  process.exit(1);
});