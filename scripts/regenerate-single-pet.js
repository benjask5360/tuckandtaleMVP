// Test script to regenerate a single pet's description with full logging
const { generateAIPrompt } = require('../lib/descriptors/prompt-builder');

async function testSinglePet() {
  // Test data from Rocky (first pet)
  const profileType = 'pet';
  const selections = {
    breed: "Hound dog",
    species: "dog",
    eyeColor: "brown",
    primaryColor: "light brown, solid color"
  };

  console.log('Testing pet description generation with:');
  console.log(JSON.stringify(selections, null, 2));
  console.log('\n' + '='.repeat(80) + '\n');

  try {
    const result = await generateAIPrompt({
      profileType,
      selections,
      style: 'concise'
    });

    console.log('\n' + '='.repeat(80));
    console.log('RESULT:');
    console.log('='.repeat(80));
    console.log('Generated description:', result.prompt);
    console.log('='.repeat(80));

  } catch (error) {
    console.error('❌ Error:', error.message);
    console.error(error.stack);
  }
}

testSinglePet();
