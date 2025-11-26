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

  // Map pet color (primaryColor) separately - will be used for fur/feathers/scales
  if (profileType === 'pet' && selections.primaryColor) {
    console.log('Pet color mapping:', {
      primaryColor: selections.primaryColor,
      profileType,
      willFetch: true
    });
    fetchMappings.push({
      table: 'descriptors_attribute',
      term: selections.primaryColor,
      filters: { attribute_type: 'pet_color' }
    });
  } else if (profileType === 'pet') {
    console.log('Pet detected but no primaryColor:', {
      selections,
      hasPrimaryColor: !!selections.primaryColor
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

  if (selections.hairLength) {
    fetchMappings.push({
      table: 'descriptors_attribute',
      term: selections.hairLength,
      filters: { attribute_type: 'hair_length' }
    });
  }

  if (selections.hairType) {
    fetchMappings.push({
      table: 'descriptors_attribute',
      term: selections.hairType,
      filters: { attribute_type: 'hair_type' }
    });
  }

  if (selections.hasGlasses !== undefined) {
    // Convert boolean to string for descriptor lookup
    const glassesTerm = selections.hasGlasses ? 'true' : 'false';
    fetchMappings.push({
      table: 'descriptors_attribute',
      term: glassesTerm,
      filters: { attribute_type: 'glasses' }
    });
  }

  if (selections.background) {
    fetchMappings.push({
      table: 'descriptors_attribute',
      term: selections.background,
      filters: { attribute_type: 'background' }
    });
  }

  // Map age
  if (selections.age !== undefined && selections.age !== null) {
    fetchMappings.push({
      table: 'descriptors_age',
      term: selections.age.toString(),
      filters: { age_value: selections.age }
    });
  }

  // Map gender (age-aware)
  // Gender lookup now requires age to select the appropriate age-aware descriptor
  if (selections.gender && selections.age !== undefined && selections.age !== null) {
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

  // Map magical creature color
  if (profileType === 'magical_creature' && selections.color) {
    fetchMappings.push({
      table: 'descriptors_attribute',
      term: selections.color,
      filters: { attribute_type: 'magical_color' }
    });
  }

  // Map magical creature type
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
          enhanced.hair = descriptor.simple_term;
          break;
        case 'hair_length':
          enhanced.hairLength = descriptor.rich_description;
          break;
        case 'hair_type':
          enhanced.hairType = descriptor.simple_term;
          break;
        case 'eyes':
          enhanced.eyes = descriptor.simple_term;
          break;
        case 'skin':
          enhanced.skin = descriptor.simple_term;
          break;
        case 'body':
          enhanced.body = descriptor.simple_term;
          break;
        case 'glasses':
          enhanced.glasses = descriptor.simple_term;
          break;
        case 'pet_color':
          enhanced.petColor = descriptor.simple_term;
          break;
        case 'magical_color':
          enhanced.magicalColor = descriptor.simple_term;
          break;
        case 'background':
          enhanced.background = descriptor.rich_description;
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

  // Fallback logic: Use raw input if no descriptor was found
  // This ensures custom user inputs are preserved in prompts

  if (selections.hairColor && !enhanced.hair) {
    console.log('Hair color fallback - using raw input:', selections.hairColor);
    enhanced.hair = selections.hairColor;
  }

  if (selections.hairLength && !enhanced.hairLength) {
    console.log('Hair length fallback - using raw input:', selections.hairLength);
    enhanced.hairLength = selections.hairLength;
  }

  if (selections.eyeColor && !enhanced.eyes) {
    console.log('Eye color fallback - using raw input:', selections.eyeColor);
    enhanced.eyes = selections.eyeColor;
  }

  if (selections.skinTone && !enhanced.skin) {
    console.log('Skin tone fallback - using raw input:', selections.skinTone);
    enhanced.skin = selections.skinTone;
  }

  if (selections.bodyType && !enhanced.body) {
    console.log('Body type fallback - using raw input:', selections.bodyType);
    enhanced.body = selections.bodyType;
  }

  if (selections.background && !enhanced.background) {
    // Use raw input for custom "Other" values, truncate to 50 chars for safety
    const truncatedBackground = selections.background.slice(0, 50);
    console.log('Background fallback - using raw input:', truncatedBackground);
    enhanced.background = truncatedBackground;
  }

  if (profileType === 'pet' && selections.primaryColor && !enhanced.petColor) {
    console.log('🐾 Pet color fallback - using raw input:', selections.primaryColor);
    enhanced.petColor = selections.primaryColor;
  }

  // For pets: ALWAYS prioritize user-entered breed over generic species lookup
  // This ensures custom breeds (like "Golden Retriever") appear in descriptions
  if (profileType === 'pet') {
    console.log('🐾 Pet descriptor mapping - checking breed/species:', {
      breed: selections.breed,
      species: selections.species,
      currentEnhancedSpecies: enhanced.species,
      willUseBreed: !!selections.breed,
      willUseSpecies: !selections.breed && !!selections.species
    });

    if (selections.breed) {
      // Always use the specific breed if provided by user
      console.log('🐾 Pet breed - using user input:', selections.breed);
      enhanced.species = selections.breed;
    } else if (selections.species && !enhanced.species) {
      // Fall back to species only if no breed was specified
      console.log('🐾 Pet species fallback - using raw input:', selections.species);
      enhanced.species = selections.species;
    }

    // Final check for debugging
    if (!enhanced.species) {
      console.error('❌ PET SPECIES MISSING after fallback logic!', {
        selectionsBreed: selections.breed,
        selectionsSpecies: selections.species,
        enhancedSpecies: enhanced.species
      });
    }
    if (!enhanced.petColor) {
      console.error('❌ PET COLOR MISSING after fallback logic!', {
        selectionsPrimaryColor: selections.primaryColor,
        enhancedPetColor: enhanced.petColor
      });
    }
  }

  // For magical creatures: if no color descriptor found, use raw input
  if (profileType === 'magical_creature') {
    console.log('✨ Magical creature descriptor mapping - checking color/type:', {
      color: selections.color,
      creatureType: selections.creatureType,
      currentEnhancedMagicalColor: enhanced.magicalColor,
      currentEnhancedCreature: enhanced.creature,
      willUseColor: !!selections.color,
      willUseCreatureType: !!selections.creatureType
    });

    if (selections.color && !enhanced.magicalColor) {
      console.log('✨ Magical color fallback - using raw input:', selections.color);
      enhanced.magicalColor = selections.color;
    }

    if (selections.creatureType && !enhanced.creature) {
      console.log('✨ Creature type fallback - using raw input:', selections.creatureType);
      enhanced.creature = selections.creatureType;
    }

    // Final check for debugging
    if (!enhanced.creature) {
      console.error('❌ MAGICAL CREATURE TYPE MISSING after fallback logic!', {
        selectionsCreatureType: selections.creatureType,
        enhancedCreature: enhanced.creature
      });
    }
    if (!enhanced.magicalColor) {
      console.error('❌ MAGICAL CREATURE COLOR MISSING after fallback logic!', {
        selectionsColor: selections.color,
        enhancedMagicalColor: enhanced.magicalColor
      });
    }
  }

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