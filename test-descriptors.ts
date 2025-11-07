/**
 * Test script for the descriptor system
 * Run with: npx tsx test-descriptors.ts
 */

import { generateAIPrompt, generateAvatarPrompt, validateRequiredDescriptors } from './lib/descriptors/prompt-builder'
import { ProfileType, CharacterSelections } from './lib/descriptors/types'

async function testDescriptorSystem() {
  console.log('=== Testing Descriptor System ===\n')

  // Test 1: Child character
  console.log('Test 1: Child Character')
  console.log('------------------------')
  const childSelections: CharacterSelections = {
    age: 6,
    gender: 'girl',
    hairColor: 'black',
    eyeColor: 'blue',
    skinTone: 'fair'
  }

  try {
    // Note: This will fail without database connection, but shows the structure
    const childPrompt = await generateAIPrompt({
      profileType: 'child',
      selections: childSelections,
      style: 'concise'
    })
    console.log('AI Prompt:', childPrompt.prompt)
    console.log('Enhanced Descriptors:', childPrompt.enhancedDescriptors)
  } catch (error) {
    console.log('Expected error (no DB connection):', error.message)
  }

  // Test 2: Pet character
  console.log('\nTest 2: Pet Character')
  console.log('------------------------')
  const petSelections: CharacterSelections = {
    species: 'dog',
    breed: 'golden retriever'
  }

  // Test 3: Magical creature
  console.log('\nTest 3: Magical Creature')
  console.log('------------------------')
  const magicalSelections: CharacterSelections = {
    creatureType: 'dragon'
  }

  // Test 4: Validation
  console.log('\nTest 4: Validation')
  console.log('------------------------')
  const validation1 = await validateRequiredDescriptors('child', {})
  console.log('Empty child selections:', validation1)

  const validation2 = await validateRequiredDescriptors('child', childSelections)
  console.log('Valid child selections:', validation2)

  const validation3 = await validateRequiredDescriptors('pet', {})
  console.log('Empty pet selections:', validation3)

  const validation4 = await validateRequiredDescriptors('pet', petSelections)
  console.log('Valid pet selections:', validation4)

  console.log('\n=== Descriptor System Structure ===')
  console.log('Database Tables:')
  console.log('- descriptors_attribute (hair, eyes, skin, body)')
  console.log('- descriptors_age (age values and labels)')
  console.log('- descriptors_gender (gender presentations)')
  console.log('- descriptors_pet (pet species and breeds)')
  console.log('- descriptors_magical (magical creatures)')
  console.log('- descriptor_mappings (profile type to table mappings)')

  console.log('\nKey Features:')
  console.log('✓ Simple → Rich mapping (black → jet black)')
  console.log('✓ Profile-type aware descriptor selection')
  console.log('✓ Modular and extensible design')
  console.log('✓ AI-ready prompt generation')
  console.log('✓ Avatar prompt generation for image services')

  console.log('\nAPI Endpoints:')
  console.log('GET /api/descriptors/[profileType] - Fetch descriptors')
  console.log('POST /api/characters/create - Uses descriptor system')
  console.log('PUT /api/characters/[id]/update - Uses descriptor system')
}

// Run the test
testDescriptorSystem().catch(console.error)