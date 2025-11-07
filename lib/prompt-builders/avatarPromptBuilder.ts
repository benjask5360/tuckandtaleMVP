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
  console.log('Avatar prompt - Input:', { profileType, selections });

  const enhanced = await mapSelectionsToEnhanced(profileType, selections);
  console.log('Avatar prompt - Enhanced:', enhanced);

  let prompt = '';

  switch (profileType) {
    case 'child':
    case 'storybook_character':
      // Build base prompt
      let baseChar = 'child';
      if (enhanced.gender) {
        baseChar = enhanced.gender; // e.g., "young boy"
      } else if (enhanced.age) {
        baseChar = `${enhanced.age} child`;
      }

      prompt = `Portrait of a ${baseChar}`;

      // Add physical features
      const features: string[] = [];
      if (enhanced.hair) features.push(`${enhanced.hair} hair`);
      if (enhanced.eyes) features.push(`${enhanced.eyes} eyes`);
      if (enhanced.skin) features.push(`${enhanced.skin} skin`);

      if (features.length > 0) {
        prompt += ` with ${features.join(', ')}`;
      }

      prompt += ', friendly expression, warm smile, children\'s book illustration style, digital art, high quality';
      break;

    case 'pet':
      const petType = enhanced.species || 'pet';
      prompt = `Cute ${petType}`;

      const petFeatures: string[] = [];
      if (enhanced.hair) petFeatures.push(`${enhanced.hair} fur`);
      if (enhanced.eyes) petFeatures.push(`${enhanced.eyes} eyes`);

      if (petFeatures.length > 0) {
        prompt += ` with ${petFeatures.join(' and ')}`;
      }

      prompt += ', full body, friendly pose, children\'s book illustration style, digital art, high quality';
      break;

    case 'magical_creature':
      const creatureType = enhanced.creature || 'creature';
      prompt = `Magical ${creatureType}`;

      const magicFeatures: string[] = [];
      if (enhanced.hair) magicFeatures.push(`${enhanced.hair} features`);
      if (enhanced.eyes) magicFeatures.push(`${enhanced.eyes} eyes`);

      if (magicFeatures.length > 0) {
        prompt += ` with ${magicFeatures.join(' and ')}`;
      }

      prompt += ', fantastical, whimsical, enchanting, children\'s book illustration style, digital art, high quality';
      break;

    default:
      // Fallback for any unknown profile type
      prompt = 'Portrait of a friendly character, children\'s book illustration style, digital art, high quality';
  }

  console.log('Avatar prompt - Final:', prompt);

  // Clean up any double spaces
  prompt = prompt.replace(/\s+/g, ' ').trim();

  return prompt;
}