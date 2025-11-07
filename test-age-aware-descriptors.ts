/**
 * Test script to verify age-aware gender descriptors
 * Run with: npx ts-node test-age-aware-descriptors.ts
 */

import { createClient } from '@supabase/supabase-js';

const supabaseUrl = 'http://127.0.0.1:54321';
// Use service_role key to bypass RLS for testing
const supabaseKey = 'eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJpc3MiOiJzdXBhYmFzZS1kZW1vIiwicm9sZSI6InNlcnZpY2Vfcm9sZSIsImV4cCI6MTk4MzgxMjk5Nn0.EGIM96RAZx35lJzdJsyH-qQwv8Hdp7fsn3W0YpN81IU';

const supabase = createClient(supabaseUrl, supabaseKey);

async function testAgeAwareGenderDescriptors() {
  console.log('Testing Age-Aware Gender Descriptors\n');
  console.log('=====================================\n');

  const testCases = [
    { age: 6, gender: 'male', expected: 'young boy' },
    { age: 25, gender: 'male', expected: 'man' },
    { age: 45, gender: 'male', expected: 'middle-aged man' },
    { age: 66, gender: 'male', expected: 'older man' },
    { age: 99, gender: 'male', expected: 'elderly man' },
    { age: 6, gender: 'female', expected: 'young girl' },
    { age: 25, gender: 'female', expected: 'woman' },
    { age: 45, gender: 'female', expected: 'middle-aged woman' },
    { age: 66, gender: 'female', expected: 'older woman' },
    { age: 99, gender: 'female', expected: 'elderly woman' },
  ];

  for (const testCase of testCases) {
    const { age, gender, expected } = testCase;

    // Query for gender descriptor where age falls within range
    const { data, error } = await supabase
      .from('descriptors_gender')
      .select('*')
      .eq('simple_term', gender)
      .lte('min_age', age)
      .gte('max_age', age)
      .eq('is_active', true)
      .single();

    if (error) {
      console.error(`❌ Age ${age}, Gender ${gender}: Error - ${error.message}`);
      continue;
    }

    const result = data?.rich_description;
    const pass = result === expected;
    const icon = pass ? '✅' : '❌';

    console.log(`${icon} Age ${age}, Gender ${gender}: "${result}" ${!pass ? `(expected: "${expected}")` : ''}`);
  }

  console.log('\n=====================================');
  console.log('\nAll Gender Descriptors by Age:');
  console.log('-------------------------------------\n');

  const { data: allDescriptors } = await supabase
    .from('descriptors_gender')
    .select('*')
    .eq('simple_term', 'male')
    .order('min_age');

  if (allDescriptors) {
    allDescriptors.forEach((desc: any) => {
      console.log(`Ages ${desc.min_age}-${desc.max_age}: "${desc.rich_description}" (${desc.age_stage})`);
    });
  }

  console.log('\n=====================================');
  console.log('\nAge Range Check:');
  console.log('-------------------------------------\n');

  const { data: ageData } = await supabase
    .from('descriptors_age')
    .select('age_value')
    .order('age_value');

  if (ageData) {
    const ages = ageData.map((d: any) => d.age_value);
    const minAge = Math.min(...ages);
    const maxAge = Math.max(...ages);
    console.log(`Age descriptors available: ${minAge} to ${maxAge}`);
    console.log(`Total age descriptors: ${ages.length}`);
  }
}

testAgeAwareGenderDescriptors().then(() => {
  console.log('\nTest complete!');
  process.exit(0);
}).catch(err => {
  console.error('Test failed:', err);
  process.exit(1);
});
