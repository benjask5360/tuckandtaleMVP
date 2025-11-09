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

  // Optional customization
  customInstructions?: string;
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
}

// ============================================================================
// STORY RESPONSE TYPES
// ============================================================================

export interface ParsedStory {
  title: string;
  paragraphs: string[];
  moral?: string | null;
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
  };

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
