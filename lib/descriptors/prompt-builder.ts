/**
 * AI Prompt Builder - Backward Compatibility Layer
 *
 * This file now re-exports from the new modular prompt-builders directory.
 * The original monolithic code has been split into focused modules:
 * - descriptorMapper.ts: Universal mapping and validation
 * - descriptionBuilder.ts: Shared character descriptions
 * - avatarPromptBuilder.ts: Image generation prompts
 * - storyPromptBuilder.ts: Narrative generation prompts
 *
 * This ensures backward compatibility while providing a cleaner architecture.
 */

// Re-export everything from the new modular location
export {
  // Core mapping and validation
  mapSelectionsToEnhanced,
  validateRequiredDescriptors,

  // Description builder
  buildCharacterDescription,

  // Avatar prompt generation
  generateAvatarPrompt,

  // Story and AI prompt generation
  generateAIPrompt,
  generateStoryPrompt,
} from '../prompt-builders';