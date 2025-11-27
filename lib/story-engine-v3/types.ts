/**
 * StoryEngine V3 Type Definitions
 *
 * Phase 1: Text-only story generation with illustration types defined for future phases.
 */

// =============================================================================
// Core V3 Story Structure
// =============================================================================

/**
 * The primary V3 story structure returned from generation
 */
export type V3Story = {
  title: string;
  length: 'short' | 'medium' | 'long';
  paragraphs: V3Paragraph[];
};

/**
 * A single paragraph in a V3 story
 */
export interface V3Paragraph {
  id: string;
  text: string;
}

// =============================================================================
// OpenAI Response Format
// =============================================================================

/**
 * Raw response structure from OpenAI (what we request from the model)
 */
export interface V3StoryOpenAIResponse {
  title: string;
  paragraphs: string[];
  moral?: string;
}

// =============================================================================
// Generation Request/Response
// =============================================================================

/**
 * Parameters for generating a V3 story
 */
export interface V3StoryGenerationParams {
  heroId: string;
  characterIds?: string[];
  mode: 'fun' | 'growth';
  genreId: string;
  toneId: string;
  lengthId: string;
  growthTopicId?: string;
  moralLessonId?: string;
  customInstructions?: string;
  includeIllustrations?: boolean;
}

/**
 * Character information used for prompt building
 */
export interface V3CharacterInfo {
  id: string;
  name: string;
  appearanceDescription: string;
  characterType: 'child' | 'pet' | 'storybook_character' | 'magical_creature';
  age?: number;
  role?: 'hero' | 'sidekick' | 'friend' | 'family' | 'pet';
  relationship?: string; // e.g., "Emma's brother"
  background?: string; // e.g., "Asian", "Black or African American" - from rich_description
}

/**
 * Story parameter (genre, tone, length, etc.) fetched from database
 */
export interface V3StoryParameter {
  id: string;
  name: string;
  displayName: string;
  description?: string;
  metadata?: Record<string, unknown>;
}

/**
 * Internal request structure used by the generation service
 */
export interface V3GenerationRequest {
  mode: 'fun' | 'growth';
  characters: V3CharacterInfo[];
  genre: V3StoryParameter;
  tone: V3StoryParameter;
  length: V3StoryParameter & {
    metadata?: {
      targetParagraphs?: number;
      wordsPerParagraph?: number;
      wordsMin?: number;
      wordsMax?: number;
      word_count_min?: number;
      word_count_max?: number;
    };
  };
  growthTopic?: V3StoryParameter;
  moralLesson?: V3StoryParameter;
  customInstructions?: string;
}

/**
 * Result returned from successful story generation
 */
export interface V3GenerationResult {
  storyId: string;
  story: V3Story;
  usage: {
    monthlyRemaining: number;
    monthlyLimit: number;
  };
}

// =============================================================================
// Database Storage Format
// =============================================================================

/**
 * V3 generation metadata stored in content.generation_metadata JSONB
 */
export interface V3GenerationMetadata {
  // V3-specific structure
  v3_story: V3Story;

  // Standard metadata (compatible with V2)
  mode: 'fun' | 'growth';
  genre_display: string;
  tone_display: string;
  length_display: string;
  growth_topic_display?: string;
  moral?: string;
  paragraphs: string[]; // Flat array for compatibility
  characters: V3CharacterInfo[];

  // Illustration settings
  include_illustrations?: boolean;

  // Generation tracking
  ai_config_name?: string;
}

// =============================================================================
// Illustration Types (Phase 2)
// =============================================================================

/**
 * Status of an individual illustration generation
 */
export type V3IllustrationItemStatus = 'pending' | 'generating' | 'success' | 'failed';

/**
 * Overall status of illustration generation for a story
 */
export type V3IllustrationOverallStatus = 'pending' | 'generating' | 'complete' | 'partial' | 'failed';

/**
 * Cover illustration status (stored in v3_illustration_status.cover)
 */
export interface V3CoverIllustrationStatus {
  status: V3IllustrationItemStatus;
  prompt?: string;
  tempUrl?: string;        // Leonardo CDN URL (temporary, 24h)
  imageUrl?: string;       // Supabase permanent URL
  error?: string;
  attempts?: number;
}

/**
 * Scene illustration status (stored in v3_illustration_status.scenes[])
 */
export interface V3SceneIllustrationStatus {
  paragraphIndex: number;
  status: V3IllustrationItemStatus;
  prompt?: string;
  tempUrl?: string;        // Leonardo CDN URL (temporary, 24h)
  imageUrl?: string;       // Supabase permanent URL
  error?: string;
  attempts?: number;
}

/**
 * Complete illustration status stored in content.v3_illustration_status JSONB
 */
export interface V3IllustrationStatusData {
  overall: V3IllustrationOverallStatus;
  cover: V3CoverIllustrationStatus;
  scenes: V3SceneIllustrationStatus[];
}

/**
 * OpenAI response format for illustration prompt generation
 */
export interface V3IllustrationPromptsResponse {
  coverPrompt: string;
  scenePrompts: Array<{
    paragraphIndex: number;
    prompt: string;
  }>;
}

/**
 * Result of generating a single illustration (with moderation retry)
 */
export interface V3IllustrationGenerationResult {
  success: boolean;
  imageType: 'cover' | 'scene';
  paragraphIndex?: number;
  leonardoUrl?: string;
  generationId?: string;
  creditsUsed?: number;
  error?: string;
  attempts: number;
}

// Legacy types for backward compatibility
export type V3IllustrationStatus = V3IllustrationItemStatus;

export interface V3SceneIllustration {
  paragraphId: string;
  prompt: string;
  status: V3IllustrationItemStatus;
  imageUrl?: string;
  tempUrl?: string;
  errorMessage?: string;
}

export interface V3CoverIllustration {
  prompt: string;
  status: V3IllustrationItemStatus;
  imageUrl?: string;
  tempUrl?: string;
  errorMessage?: string;
}

export interface V3IllustrationPlan {
  cover: V3CoverIllustration;
  scenes: V3SceneIllustration[];
}

// =============================================================================
// Validation
// =============================================================================

/**
 * Result of validating a V3 story response
 */
export interface V3ValidationResult {
  isValid: boolean;
  errors: string[];
  warnings: string[];
  story?: V3StoryOpenAIResponse;
}

// =============================================================================
// Constants
// =============================================================================

/**
 * Paragraph count ranges by story length
 */
export const V3_PARAGRAPH_COUNTS = {
  short: { min: 6, max: 7 },
  medium: { min: 8, max: 9 },
  long: { min: 10, max: 12 },
} as const;

/**
 * Engine version identifier
 */
export const V3_ENGINE_VERSION = 'v3' as const;
