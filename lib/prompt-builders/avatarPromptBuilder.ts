/**
 * Avatar Prompt Builder Module
 * Generates prompts optimized for image generation (Leonardo AI, DALL-E, etc.)
 * Focuses on visual traits and children's book illustration style
 */

import {
  ProfileType,
  CharacterSelections,
} from '../descriptors/types';
import { mapSelectionsToEnhanced } from './descriptorMapper';

/**
 * Generate an avatar prompt specifically for image generation
 * Optimized for Leonardo AI or similar services
 *
 * @param profileType - The type of profile (child, storybook_character, pet, magical_creature)
 * @param selections - User's character selections
 * @returns A prompt string optimized for avatar/image generation
 */
export async function generateAvatarPrompt(
  profileType: ProfileType,
  selections: CharacterSelections
): Promise<string> {
  const enhanced = await mapSelectionsToEnhanced(profileType, selections);
  const parts: string[] = [];

  switch (profileType) {
    case 'child':
    case 'storybook_character':
      // Portrait style for human characters
      parts.push('Portrait of a');

      if (enhanced.gender) {
        // Gender term is age-aware (e.g., "young boy", "middle-aged man")
        parts.push(enhanced.gender);
      } else if (enhanced.age) {
        parts.push(`${enhanced.age} child`);
      } else {
        parts.push('child');
      }

      // Physical features in order of visual importance
      if (enhanced.hair) {
        parts.push(`with ${enhanced.hair} hair`);
      }
      if (enhanced.eyes) {
        parts.push(`and ${enhanced.eyes} eyes`);
      }
      if (enhanced.skin) {
        parts.push(`, ${enhanced.skin} skin`);
      }

      // Add style modifiers for better image generation
      parts.push(', friendly expression, children\'s book illustration style');
      break;

    case 'pet':
      // Full body for pets
      parts.push('Cute');

      if (enhanced.species) {
        parts.push(enhanced.species);
      } else {
        parts.push('pet');
      }

      if (enhanced.hair) {
        parts.push(`with ${enhanced.hair} fur`);
      }
      if (enhanced.eyes) {
        parts.push(`and ${enhanced.eyes} eyes`);
      }

      parts.push(', full body, friendly, children\'s book illustration style');
      break;

    case 'magical_creature':
      // Fantasy style for magical creatures
      parts.push('Magical');

      if (enhanced.creature) {
        parts.push(enhanced.creature);
      } else {
        parts.push('creature');
      }

      if (enhanced.hair) {
        parts.push(`with ${enhanced.hair} features`);
      }
      if (enhanced.eyes) {
        parts.push(`and ${enhanced.eyes} eyes`);
      }

      parts.push(', fantastical, whimsical, children\'s book illustration style');
      break;
  }

  return parts.join(' ');
}