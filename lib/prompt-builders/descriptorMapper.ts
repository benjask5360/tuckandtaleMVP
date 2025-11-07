/**
 * Descriptor Mapper Module
 * Universal descriptor mapping and validation logic
 * Maps user selections (simple terms) to enhanced descriptors for AI generation
 */

import {
  ProfileType,
  CharacterSelections,
  EnhancedDescriptors,
} from '../descriptors/types';
import { getDescriptorsBySimpleTerms } from '../descriptors/retrieval';

/**
 * Map simple character selections to enhanced descriptors
 * This is the core function that converts user-friendly terms to AI-ready descriptions
 *
 * @param profileType - The type of profile (child, storybook_character, pet, magical_creature)
 * @param selections - User's simple selections (e.g., "black" hair, age 6, "male")
 * @returns Enhanced descriptors with rich descriptions (e.g., "jet black" hair, "young boy")
 */
export async function mapSelectionsToEnhanced(
  profileType: ProfileType,
  selections: CharacterSelections
): Promise<EnhancedDescriptors> {
  const enhanced: EnhancedDescriptors = {};

  // Prepare batch fetch mappings
  const fetchMappings = [];

  // Map physical attributes
  if (selections.hairColor) {
    fetchMappings.push({
      table: 'descriptors_attribute',
      term: selections.hairColor,
      filters: { attribute_type: 'hair' }
    });
  }

  if (selections.eyeColor) {
    fetchMappings.push({
      table: 'descriptors_attribute',
      term: selections.eyeColor,
      filters: { attribute_type: 'eyes' }
    });
  }

  if (selections.skinTone) {
    fetchMappings.push({
      table: 'descriptors_attribute',
      term: selections.skinTone,
      filters: { attribute_type: 'skin' }
    });
  }

  if (selections.bodyType) {
    fetchMappings.push({
      table: 'descriptors_attribute',
      term: selections.bodyType,
      filters: { attribute_type: 'body' }
    });
  }

  // Map age
  if (selections.age !== undefined) {
    fetchMappings.push({
      table: 'descriptors_age',
      term: selections.age.toString(),
      filters: { age_value: selections.age }
    });
  }

  // Map gender (age-aware)
  // Gender lookup now requires age to select the appropriate age-aware descriptor
  if (selections.gender && selections.age !== undefined) {
    fetchMappings.push({
      table: 'descriptors_gender',
      term: selections.gender,
      filters: {
        // Query will use: WHERE min_age <= age AND max_age >= age
        _age_lookup: selections.age
      }
    });
  } else if (selections.gender) {
    // Fallback if age not provided - use default adult descriptor
    fetchMappings.push({
      table: 'descriptors_gender',
      term: selections.gender,
      filters: {
        _age_lookup: 25 // Default to adult descriptor
      }
    });
  }

  // Map pet-specific
  if (profileType === 'pet' && selections.species) {
    const petFilters: any = { species: selections.species };
    if (selections.breed) {
      petFilters.breed = selections.breed;
    }
    fetchMappings.push({
      table: 'descriptors_pet',
      term: selections.breed || selections.species,
      filters: petFilters
    });
  }

  // Map magical creature
  if (profileType === 'magical_creature' && selections.creatureType) {
    fetchMappings.push({
      table: 'descriptors_magical',
      term: selections.creatureType,
      filters: { creature_type: selections.creatureType }
    });
  }

  // Batch fetch all descriptors
  const descriptors = await getDescriptorsBySimpleTerms(fetchMappings);

  // Process fetched descriptors
  Object.entries(descriptors).forEach(([key, descriptor]) => {
    if (!descriptor) return;

    if (key.startsWith('descriptors_attribute_')) {
      switch (descriptor.attribute_type) {
        case 'hair':
          enhanced.hair = descriptor.rich_description;
          break;
        case 'eyes':
          enhanced.eyes = descriptor.rich_description;
          break;
        case 'skin':
          enhanced.skin = descriptor.rich_description;
          break;
        case 'body':
          enhanced.body = descriptor.rich_description;
          break;
      }
    } else if (key.startsWith('descriptors_age_')) {
      enhanced.age = descriptor.rich_description;
    } else if (key.startsWith('descriptors_gender_')) {
      enhanced.gender = descriptor.rich_description;
    } else if (key.startsWith('descriptors_pet_')) {
      enhanced.species = descriptor.rich_description;
    } else if (key.startsWith('descriptors_magical_')) {
      enhanced.creature = descriptor.rich_description;
    }
  });

  return enhanced;
}

/**
 * Validate that all required descriptors are present
 * Useful for form validation before generation
 *
 * @param profileType - The type of profile being validated
 * @param selections - User's selections to validate
 * @returns Validation result with list of missing required fields
 */
export async function validateRequiredDescriptors(
  profileType: ProfileType,
  selections: CharacterSelections
): Promise<{ valid: boolean; missing: string[] }> {
  const missing: string[] = [];

  switch (profileType) {
    case 'child':
      // Required: age, at least one physical attribute
      if (selections.age === undefined) {
        missing.push('age');
      }
      if (!selections.hairColor && !selections.eyeColor && !selections.skinTone) {
        missing.push('at least one physical attribute (hair, eyes, or skin)');
      }
      break;

    case 'storybook_character':
      // Required: at least one physical attribute
      if (!selections.hairColor && !selections.eyeColor && !selections.skinTone) {
        missing.push('at least one physical attribute (hair, eyes, or skin)');
      }
      break;

    case 'pet':
      // Required: species
      if (!selections.species) {
        missing.push('species');
      }
      break;

    case 'magical_creature':
      // Required: creature type
      if (!selections.creatureType) {
        missing.push('creature type');
      }
      break;
  }

  return {
    valid: missing.length === 0,
    missing,
  };
}