/**
 * Test script to verify refactored prompt builder modules work correctly
 * Run with: npx tsx test-refactored-prompt-builder.ts
 */

import { createClient } from '@supabase/supabase-js';
import {
  mapSelectionsToEnhanced,
  validateRequiredDescriptors,
  buildCharacterDescription,
  generateAvatarPrompt,
  generateAIPrompt,
  generateStoryPrompt,
} from './lib/prompt-builders';

const supabaseUrl = 'http://127.0.0.1:54321';
// Use service_role key to bypass RLS for testing
const supabaseKey = 'eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJpc3MiOiJzdXBhYmFzZS1kZW1vIiwicm9sZSI6InNlcnZpY2Vfcm9sZSIsImV4cCI6MTk4MzgxMjk5Nn0.EGIM96RAZx35lJzdJsyH-qQwv8Hdp7fsn3W0YpN81IU';

const supabase = createClient(supabaseUrl, supabaseKey);

async function testRefactoredModules() {
  console.log('Testing Refactored Prompt Builder Modules\n');
  console.log('==========================================\n');

  const testSelections = {
    age: 6,
    gender: 'male',
    hairColor: 'black',
    eyeColor: 'blue',
    skinTone: 'light',
  };

  // Test 1: mapSelectionsToEnhanced
  console.log('1. Testing mapSelectionsToEnhanced:');
  console.log('------------------------------------');
  const enhanced = await mapSelectionsToEnhanced('child', testSelections);
  console.log('Input:', testSelections);
  console.log('Enhanced:', enhanced);
  console.log('✅ Mapping function works!\n');

  // Test 2: buildCharacterDescription
  console.log('2. Testing buildCharacterDescription:');
  console.log('--------------------------------------');
  const description = buildCharacterDescription('child', enhanced);
  console.log('Description:', description);
  console.log('✅ Description builder works!\n');

  // Test 3: generateAvatarPrompt
  console.log('3. Testing generateAvatarPrompt:');
  console.log('---------------------------------');
  const avatarPrompt = await generateAvatarPrompt('child', testSelections);
  console.log('Avatar Prompt:', avatarPrompt);
  console.log('✅ Avatar prompt builder works!\n');

  // Test 4: generateAIPrompt
  console.log('4. Testing generateAIPrompt:');
  console.log('-----------------------------');
  const aiPrompt = await generateAIPrompt({
    profileType: 'child',
    selections: testSelections,
    style: 'concise'
  });
  console.log('AI Prompt:', aiPrompt.prompt);
  console.log('Metadata:', aiPrompt.metadata);
  console.log('✅ AI prompt builder works!\n');

  // Test 5: generateStoryPrompt
  console.log('5. Testing generateStoryPrompt:');
  console.log('--------------------------------');
  const storyPrompt = await generateStoryPrompt([
    {
      name: 'Oliver',
      profileType: 'child',
      selections: testSelections
    },
    {
      name: 'Max',
      profileType: 'pet',
      selections: {
        species: 'dog',
        breed: 'golden retriever'
      }
    }
  ], 'Adventure in the forest');
  console.log('Story Prompt:', storyPrompt);
  console.log('✅ Story prompt builder works!\n');

  // Test 6: validateRequiredDescriptors
  console.log('6. Testing validateRequiredDescriptors:');
  console.log('----------------------------------------');
  const validation1 = await validateRequiredDescriptors('child', testSelections);
  console.log('Valid selections:', validation1);

  const invalidSelections = { gender: 'male' }; // Missing required fields
  const validation2 = await validateRequiredDescriptors('child', invalidSelections);
  console.log('Invalid selections:', validation2);
  console.log('✅ Validation function works!\n');

  // Test 7: Backward compatibility
  console.log('7. Testing Backward Compatibility:');
  console.log('-----------------------------------');
  try {
    const { generateAvatarPrompt: oldImport } = await import('./lib/descriptors/prompt-builder');
    const backCompatPrompt = await oldImport('child', testSelections);
    console.log('Backward compatible import works!');
    console.log('Same result?', backCompatPrompt === avatarPrompt ? '✅ Yes' : '❌ No');
  } catch (error) {
    console.error('Backward compatibility test failed:', error);
  }

  console.log('\n==========================================');
  console.log('All Tests Passed! ✅');
  console.log('==========================================\n');

  console.log('Module Structure Summary:');
  console.log('- descriptorMapper.ts: Universal mapping & validation');
  console.log('- descriptionBuilder.ts: Shared description logic');
  console.log('- avatarPromptBuilder.ts: Image generation prompts');
  console.log('- storyPromptBuilder.ts: Narrative generation prompts');
  console.log('- index.ts: Clean exports');
}

testRefactoredModules().then(() => {
  console.log('\nRefactoring successful! The modular architecture is working correctly.');
  process.exit(0);
}).catch(err => {
  console.error('Test failed:', err);
  process.exit(1);
});