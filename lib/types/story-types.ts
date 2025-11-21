/**
 * Story Generation Types
 * Type definitions for the story generation system
 */

// ============================================================================
// STORY PARAMETER TYPES
// ============================================================================

export type StoryParameterType = 'genre' | 'tone' | 'length' | 'growth_topic';

export interface StoryParameter {
  id: string;
  type: StoryParameterType;
  name: string;
  display_name: string;
  description: string | null;
  metadata: Record<string, any>;
  is_active: boolean;
  display_order: number;
  created_at: string;
  updated_at: string;
}

export interface StoryGenre extends StoryParameter {
  type: 'genre';
}

export interface StoryTone extends StoryParameter {
  type: 'tone';
}

export interface StoryLength extends StoryParameter {
  type: 'length';
  metadata: {
    paragraph_count_min: number;
    paragraph_count_max: number;
    word_count_min: number;
    word_count_max: number;
    estimated_reading_minutes: number;
  };
}

export interface GrowthTopic extends StoryParameter {
  type: 'growth_topic';
  metadata: {
    category: string;
    prompt_guidance: string;
  };
}

// Grouped parameters for frontend use
export interface StoryParametersGrouped {
  genre: StoryGenre[];
  tone: StoryTone[];
  length: StoryLength[];
  growth_topic: GrowthTopic[];
}

// ============================================================================
// CHARACTER TYPES FOR STORY GENERATION
// ============================================================================

export interface StoryCharacter {
  id?: string; // UUID if linked character
  name: string;
  profileType?: 'child' | 'storybook_character' | 'pet' | 'magical_creature';
  role?: 'hero' | 'sidekick' | 'pet' | 'friend' | 'family' | 'other';
  description?: string; // Generated description
  attributes?: Record<string, any>; // Full attributes if linked
}

export interface AdHocCharacter {
  name: string;
  role?: string;
}

// ============================================================================
// STORY GENERATION REQUEST TYPES
// ============================================================================

export type StoryMode = 'fun' | 'growth';

export interface StoryGenerationParams {
  // Characters
  heroId: string; // Required: child character ID
  characterIds: string[]; // Optional: additional linked character IDs
  adHocCharacters: AdHocCharacter[]; // Optional: user-typed characters

  // Story parameters
  mode: StoryMode;
  genreId: string;
  toneId: string;
  lengthId: string;
  growthTopicId?: string; // Required if mode === 'growth'
  moralLessonId?: string; // Optional moral lesson

  // Optional customization
  customInstructions?: string;
  includeIllustrations?: boolean; // Flag to generate illustration prompt
  useBetaEngine?: boolean; // @deprecated - No longer used. Beta engine is now the default and only engine.
}

export interface StoryGenerationRequest {
  characters: StoryCharacter[];
  genre: StoryGenre;
  tone: StoryTone;
  length: StoryLength;
  growthTopic?: GrowthTopic;
  mode: StoryMode;
  customInstructions?: string;
  heroAge: number; // For age-appropriate content
  includeIllustrations?: boolean; // Whether to generate illustration prompt
}

// ============================================================================
// STORY ILLUSTRATION TYPES (Legacy - for old engine stories only)
// ============================================================================

// @deprecated - Old engine illustration types. Kept for backward compatibility with existing stories.
export type IllustrationType = 'grid_3x3' | 'scene_0' | 'scene_1' | 'scene_2' | 'scene_3' | 'scene_4' | 'scene_5' | 'scene_6' | 'scene_7' | 'scene_8';

// @deprecated - Old engine illustration structure. Kept for backward compatibility with existing stories.
export interface StoryIllustration {
  type: IllustrationType;
  url: string;
  generated_at: string;
  source?: 'generated' | 'spliced_from_grid';
  metadata?: {
    model?: string;
    tokens_used?: number;
    aspect_ratio?: string;
    [key: string]: any;
  };
}

// ============================================================================
// STORY RESPONSE TYPES
// ============================================================================

// @deprecated - Old engine response format. Kept for backward compatibility with existing stories.
// New stories use the Beta engine format defined in lib/story-engine-v2/types/beta-story-types.ts
export interface ParsedStory {
  title: string;
  paragraphs: string[];
  moral?: string | null;
  illustration_prompt?: string; // @deprecated - Old engine field for 3x3 grid illustration
}

export interface Story {
  id: string;
  user_id: string;
  content_type: 'story';

  // Content
  title: string;
  body: string; // Full text (paragraphs joined)

  // Metadata
  theme: string; // Genre name
  age_appropriate_for: number[];
  duration_minutes?: number;

  // Generation details
  generation_prompt: string;
  generation_metadata: {
    mode: StoryMode;
    genre: string;
    tone: string;
    length: string;
    growth_topic?: string;
    moral?: string;
    paragraphs: string[];
    characters_used?: string[]; // Character IDs
    ai_config_name?: string;
    include_illustrations?: boolean; // Whether illustrations were requested
  };

  // Illustration fields (Legacy - for old engine stories only)
  include_illustrations?: boolean; // Flag indicating if illustrations were requested
  story_illustration_prompt?: string; // @deprecated - Old engine: OpenAI-generated prompt for 3x3 grid
  story_illustrations?: StoryIllustration[]; // @deprecated - Old engine: Array of generated illustration objects

  // User engagement
  is_favorite: boolean;
  read_count: number;
  last_accessed_at: string | null;

  // Timestamps
  created_at: string;
  updated_at: string;
  deleted_at: string | null;

  // Relationships (when joined)
  content_characters?: ContentCharacter[];
}

export interface ContentCharacter {
  id: string;
  content_id: string;
  character_profile_id: string | null;
  role: string | null;
  character_name_in_content: string | null;
  created_at: string;

  // Joined data
  character_profile?: {
    id: string;
    name: string;
    character_type: string;
    attributes: Record<string, any>;
    appearance_description: string | null;
  } | null;
}

// ============================================================================
// STORY GENERATION TRACKING TYPES
// ============================================================================

export type GenerationStatus = 'pending' | 'processing' | 'completed' | 'failed';

export interface StoryGenerationTracking {
  id: string;
  user_id: string;
  content_id: string | null;
  generation_id: string | null;
  ai_config_id: string | null;

  processing_status: GenerationStatus;
  error_message: string | null;

  prompt_used: string;
  generation_params: StoryGenerationParams;

  tokens_used: number | null;
  estimated_cost: number | null;
  response_metadata: Record<string, any>;

  started_at: string;
  completed_at: string | null;
  created_at: string;
}

// ============================================================================
// STORY GENERATION USAGE TYPES
// ============================================================================

export interface StoryGenerationUsage {
  id: string;
  user_id: string;
  month_year: string; // 'YYYY-MM'
  daily_count: number;
  monthly_count: number;
  last_generated_at: string;
  last_daily_reset_at: string; // Date string
  subscription_tier: string;
  created_at: string;
  updated_at: string;
}

export interface UsageLimits {
  allowed: boolean;
  dailyRemaining: number;
  monthlyRemaining: number;
  tier: string;
  dailyLimit: number | null; // null = unlimited
  monthlyLimit: number | null; // null = unlimited
}

// ============================================================================
// API RESPONSE TYPES
// ============================================================================

export interface GenerateStoryResponse {
  success: boolean;
  story: Story;
  limits: UsageLimits;
}

export interface StoryErrorResponse {
  error: string;
  message?: string;
  limits?: UsageLimits;
}

export interface StoryParametersResponse {
  genre: StoryGenre[];
  tone: StoryTone[];
  length: StoryLength[];
  growth_topic: GrowthTopic[];
}

// ============================================================================
// PROMPT BUILDER TYPES
// ============================================================================

export interface PromptBuildContext {
  characters: StoryCharacter[];
  genre: StoryGenre;
  tone: StoryTone;
  length: StoryLength;
  growthTopic?: GrowthTopic;
  mode: StoryMode;
  customInstructions?: string;
  heroAge: number;
  includeIllustrations?: boolean; // Whether to generate illustration prompt
}

export interface CharacterContext {
  hero: StoryCharacter;
  supporting: StoryCharacter[];
}

// ============================================================================
// UTILITY TYPES
// ============================================================================

export interface StoryFilters {
  favorites?: boolean;
  characterId?: string;
  genre?: string;
  mode?: StoryMode;
}

export interface StorySort {
  field: 'created_at' | 'read_count' | 'title';
  direction: 'asc' | 'desc';
}
