/**
 * Prompt Builders - Main Export File
 * Clean API for all prompt building functionality
 */

// Core mapping and validation (used by all builders)
export {
  mapSelectionsToEnhanced,
  validateRequiredDescriptors
} from './descriptorMapper';

// Shared description builder
export { buildCharacterDescription } from './descriptionBuilder';

// Specialized prompt builders
export { generateAvatarPrompt } from './avatarPromptBuilder';

export {
  generateAIPrompt,
  generateStoryPrompt
} from './storyPromptBuilder';

// Re-export relevant types for convenience
export type {
  ProfileType,
  CharacterSelections,
  EnhancedDescriptors,
  PromptGenerationOptions,
  GeneratedPrompt,
} from '../descriptors/types';