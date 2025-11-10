/**
 * TypeScript types for the descriptor system
 * These types map to the database tables for enhanced avatar and story generation
 */

// =====================================================
// BASE TYPES
// =====================================================

export type AttributeType = 'hair' | 'eyes' | 'skin' | 'body' | 'hair_length' | 'glasses' | 'pet_color';
export type ProfileType = 'child' | 'storybook_character' | 'pet' | 'magical_creature';
export type SizeCategory = 'tiny' | 'small' | 'medium' | 'large' | 'giant';
export type Rarity = 'common' | 'uncommon' | 'rare' | 'legendary';
export type DevelopmentalStage = 'infant' | 'toddler' | 'preschool' | 'early childhood' | 'middle childhood' | 'pre-teen' | 'teen' | 'young adult' | 'adult' | 'middle-aged' | 'mature' | 'senior' | 'elderly';

// =====================================================
// DESCRIPTOR TABLE TYPES
// =====================================================

/**
 * Physical attribute descriptor (hair, eyes, skin, body)
 */
export interface DescriptorAttribute {
  id: string;
  attribute_type: AttributeType;
  simple_term: string;        // What users see/select (e.g., "black")
  rich_description: string;   // Enhanced for AI (e.g., "jet black")
  hex_color?: string | null;  // Optional color code
  sort_order?: number;
  is_active?: boolean;
  created_at?: string;
  updated_at?: string;
}

/**
 * Age-specific descriptor
 */
export interface DescriptorAge {
  id: string;
  age_value: number;          // Numeric age (e.g., 6)
  rich_description: string;   // Enhanced for AI (e.g., "six-year-old")
  developmental_stage?: string | null;  // Optional categorical stage (infant, toddler, preschool, etc.)
  is_active?: boolean;
  created_at?: string;
  updated_at?: string;
}

/**
 * Gender presentation descriptor (age-aware)
 */
export interface DescriptorGender {
  id: string;
  simple_term: string;        // What users see/select (e.g., "male", "female", "non-binary")
  rich_description: string;   // Enhanced for AI, age-aware (e.g., "young boy", "middle-aged man")
  pronouns?: string | null;
  min_age?: number | null;    // Minimum age for this descriptor
  max_age?: number | null;    // Maximum age for this descriptor
  age_stage?: string | null;  // Human-readable stage (e.g., "young_child", "middle_aged")
  is_active?: boolean;
  created_at?: string;
  updated_at?: string;
}

/**
 * Pet-specific descriptor
 */
export interface DescriptorPet {
  id: string;
  species: string;
  breed?: string | null;
  simple_term: string;        // What users see/select
  rich_description: string;   // Enhanced for AI
  size_category?: SizeCategory | null;
  temperament?: string[] | null;  // Array of temperament traits
  is_active?: boolean;
  created_at?: string;
  updated_at?: string;
}

/**
 * Magical/fantasy creature descriptor
 */
export interface DescriptorMagical {
  id: string;
  creature_type: string;
  simple_term: string;        // What users see/select
  rich_description: string;   // Enhanced for AI
  special_features?: string[] | null;  // Array of special abilities
  rarity?: Rarity | null;
  is_active?: boolean;
  created_at?: string;
  updated_at?: string;
}

/**
 * Mapping between profile types and descriptor tables
 */
export interface DescriptorMapping {
  id: string;
  profile_type: ProfileType;
  descriptor_table: DescriptorTableName;
  is_required?: boolean;
  created_at?: string;
}

// =====================================================
// UTILITY TYPES
// =====================================================

export type DescriptorTableName =
  | 'descriptors_attribute'
  | 'descriptors_age'
  | 'descriptors_gender'
  | 'descriptors_pet'
  | 'descriptors_magical';

export type AnyDescriptor =
  | DescriptorAttribute
  | DescriptorAge
  | DescriptorGender
  | DescriptorPet
  | DescriptorMagical;

/**
 * Combined descriptors for a character profile
 */
export interface CharacterDescriptors {
  attributes?: DescriptorAttribute[];
  age?: DescriptorAge;
  gender?: DescriptorGender;
  pet?: DescriptorPet;
  magical?: DescriptorMagical;
}

/**
 * User selections (simple terms only)
 */
export interface CharacterSelections {
  // Physical attributes
  hairColor?: string;
  hairLength?: string;
  eyeColor?: string;
  skinTone?: string;
  bodyType?: string;
  hasGlasses?: boolean;

  // Demographics
  age?: number;
  gender?: string;

  // Pet-specific
  species?: string;
  breed?: string;

  // Magical-specific
  creatureType?: string;

  // Additional custom attributes
  [key: string]: any;
}

/**
 * Enhanced descriptors for AI generation
 */
export interface EnhancedDescriptors {
  // Enhanced versions for AI prompts
  hair?: string;        // e.g., "jet black"
  hairLength?: string;  // e.g., "shoulder-length"
  eyes?: string;        // e.g., "ocean blue"
  skin?: string;        // e.g., "porcelain"
  body?: string;        // e.g., "athletic"
  glasses?: string;     // e.g., "wearing glasses" or empty
  age?: string;         // e.g., "six-year-old"
  gender?: string;      // e.g., "young girl"
  species?: string;     // For pets
  petColor?: string;    // For pets - e.g., "golden fur", "green scales"
  creature?: string;    // For magical creatures

  // Combined prompt-ready string
  fullDescription?: string;
}

/**
 * Options for fetching descriptors
 */
export interface DescriptorFetchOptions {
  profileType: ProfileType;
  includeInactive?: boolean;
}

/**
 * Response from descriptor API
 */
export interface DescriptorApiResponse {
  descriptors: CharacterDescriptors;
  mappings: DescriptorMapping[];
}

/**
 * AI Prompt generation options
 */
export interface PromptGenerationOptions {
  profileType: ProfileType;
  selections: CharacterSelections;
  includePersonality?: boolean;  // Future: personality descriptors
  includeInterests?: boolean;    // Future: interest descriptors
  style?: 'concise' | 'detailed' | 'creative';
}

/**
 * Generated AI prompt
 */
export interface GeneratedPrompt {
  prompt: string;
  enhancedDescriptors: EnhancedDescriptors;
  metadata?: {
    profileType: ProfileType;
    wordCount: number;
    timestamp: string;
  };
}