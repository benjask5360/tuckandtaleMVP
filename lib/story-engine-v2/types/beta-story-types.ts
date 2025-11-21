/**
 * Type definitions for Beta Story Generation Engine
 */

/**
 * Scene represents a single paragraph/moment in the story
 * with its associated illustration prompt and generated image
 */
export interface Scene {
  paragraph: string;
  charactersInScene: string[];  // Names of characters appearing in this scene
  illustrationPrompt: string;   // Disney Pixar formatted prompt for this scene
  illustrationUrl?: string;     // URL after Leonardo generates the image
}

/**
 * Beta Story structure with individual scenes
 */
export interface BetaStory {
  title: string;
  scenes: Scene[];  // 8 scenes (one per paragraph)
  moral?: string;   // Optional moral/lesson
  coverIllustrationPrompt: string;
  coverIllustrationUrl?: string;
  engineVersion: 'beta';
}

/**
 * Raw OpenAI response format for Beta stories
 */
export interface BetaStoryOpenAIResponse {
  title: string;
  scenes: Array<{
    paragraph: string;
    charactersInScene: string[];
    illustrationPrompt: string;
  }>;
  moral?: string;
  coverIllustrationPrompt: string;
}

/**
 * Character information for prompt building
 */
export interface CharacterInfo {
  id: string;
  name: string;
  appearanceDescription: string;
  characterType: 'child' | 'pet' | 'storybook_character' | 'magical_creature';
  age?: number;
  role?: 'hero' | 'sidekick' | 'friend' | 'family' | 'pet';
}

/**
 * Story generation request for Beta engine
 */
export interface BetaStoryGenerationRequest {
  mode: 'fun' | 'growth';
  characters: CharacterInfo[];
  genre: {
    name: string;
    displayName: string;
    description?: string;
  };
  tone: {
    name: string;
    displayName: string;
    description?: string;
  };
  length: {
    name: string;
    displayName: string;
    metadata?: {
      targetParagraphs?: number;
      wordsPerParagraph?: number;
    };
  };
  growthTopic?: {
    name: string;
    displayName: string;
    description?: string;
  };
  moralLesson?: {
    name: string;
    displayName: string;
    description?: string;
  };
  customInstructions?: string;
  includeIllustrations: boolean;
}

/**
 * Validation result for Beta stories
 */
export interface BetaValidationResult {
  isValid: boolean;
  errors: string[];
  warnings: string[];
  story?: BetaStoryOpenAIResponse;
}
