/**
 * Descriptor System - Main Export
 * Provides all descriptor functionality for avatar and story generation
 */

// Export all types
export * from './types'

// Export retrieval functions
export {
  getDescriptorMappings,
  getAttributeDescriptors,
  getAgeDescriptors,
  getGenderDescriptors,
  getPetDescriptors,
  getMagicalDescriptors,
  getDescriptorsForProfileType,
  getDescriptorBySimpleTerm,
  getDescriptorsBySimpleTerms,
  getGroupedAttributeDescriptors,
  getUniqueSpecies,
  getUniqueCreatureTypes,
} from './retrieval'

// Export prompt builder functions
export {
  mapSelectionsToEnhanced,
  generateAIPrompt,
  generateAvatarPrompt,
  generateStoryPrompt,
  validateRequiredDescriptors,
} from './prompt-builder'