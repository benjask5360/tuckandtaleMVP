/**
 * Description Builder Module
 * Shared character description building logic
 * Used by both avatar and story prompt builders
 */

import {
  ProfileType,
  EnhancedDescriptors,
} from '../descriptors/types';

/**
 * Build a character description from enhanced descriptors
 * This function is used by both avatar and story builders for consistent descriptions
 *
 * @param profileType - The type of profile (child, storybook_character, pet, magical_creature)
 * @param enhanced - Enhanced descriptors with rich descriptions
 * @returns A complete character description string
 */
export function buildCharacterDescription(
  profileType: ProfileType,
  enhanced: EnhancedDescriptors
): string {
  const parts: string[] = [];

  switch (profileType) {
    case 'child':
    case 'storybook_character':
      // Build description for human characters
      // Note: Gender descriptors are now age-aware (e.g., "young boy", "middle-aged man")
      // So we don't need to include age separately to avoid redundancy

      if (enhanced.gender) {
        // Gender term already includes age context (e.g., "young boy")
        parts.push(`A ${enhanced.gender}`);
      } else if (enhanced.age) {
        // Fallback if gender not provided but age is
        parts.push(`A ${enhanced.age} child`);
      } else {
        parts.push('A child');
      }

      // Add physical attributes
      const attributes: string[] = [];
      if (enhanced.hair) {
        attributes.push(`${enhanced.hair} hair`);
      }
      if (enhanced.eyes) {
        attributes.push(`${enhanced.eyes} eyes`);
      }
      if (enhanced.skin) {
        attributes.push(`${enhanced.skin} skin`);
      }
      if (enhanced.body) {
        attributes.push(`${enhanced.body} build`);
      }

      if (attributes.length > 0) {
        parts.push('with');
        if (attributes.length === 1) {
          parts.push(attributes[0]);
        } else if (attributes.length === 2) {
          parts.push(attributes.join(' and '));
        } else {
          const lastAttribute = attributes.pop();
          parts.push(attributes.join(', ') + ', and ' + lastAttribute);
        }
      }
      break;

    case 'pet':
      // Build description for pets
      // Debug logging to diagnose missing species/color
      console.log('🐾 Building pet description:', {
        petColor: enhanced.petColor,
        species: enhanced.species,
        eyes: enhanced.eyes,
        fullEnhanced: JSON.stringify(enhanced, null, 2)
      });

      // Start with color (if provided) then species/breed
      if (enhanced.petColor && enhanced.species) {
        parts.push(`A ${enhanced.petColor} ${enhanced.species}`);
      } else if (enhanced.species) {
        parts.push(`A ${enhanced.species}`);
      } else {
        parts.push('A pet');
        console.warn('⚠️ Pet description defaulting to generic "A pet" - missing species/color');
      }

      // Add any additional physical attributes if provided
      const petAttributes: string[] = [];
      if (enhanced.eyes) {
        petAttributes.push(`${enhanced.eyes} eyes`);
      }

      if (petAttributes.length > 0) {
        parts.push('with');
        parts.push(petAttributes.join(' and '));
      }
      break;

    case 'magical_creature':
      // Build description for magical creatures
      // Start with color (if provided) then creature type
      if (enhanced.magicalColor && enhanced.creature) {
        parts.push(`A ${enhanced.magicalColor} ${enhanced.creature}`);
      } else if (enhanced.creature) {
        parts.push(`A ${enhanced.creature}`);
      } else {
        parts.push('A magical creature');
      }

      // Add any additional physical attributes if provided
      const magicalAttributes: string[] = [];
      if (enhanced.hair) {
        magicalAttributes.push(`${enhanced.hair} mane`);
      }
      if (enhanced.eyes) {
        magicalAttributes.push(`${enhanced.eyes} eyes`);
      }
      if (enhanced.skin) {
        magicalAttributes.push(`${enhanced.skin} scales`);
      }

      if (magicalAttributes.length > 0) {
        parts.push('with');
        parts.push(magicalAttributes.join(' and '));
      }
      break;
  }

  return parts.join(' ');
}