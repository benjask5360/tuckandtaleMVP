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
  console.log('Avatar prompt - Gender check:', {
    hasGender: !!enhanced.gender,
    genderValue: enhanced.gender,
    hasAge: !!enhanced.age,
    ageValue: enhanced.age
  });

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

      // Combine hair color and length if both present
      if (enhanced.hair && enhanced.hairLength) {
        features.push(`${enhanced.hairLength} ${enhanced.hair} hair`);
      } else if (enhanced.hair) {
        features.push(`${enhanced.hair} hair`);
      } else if (enhanced.hairLength) {
        features.push(`${enhanced.hairLength} hair`);
      }

      if (enhanced.eyes) features.push(`${enhanced.eyes} eyes`);
      if (enhanced.skin) features.push(`${enhanced.skin} skin`);
      if (enhanced.body) features.push(enhanced.body);  // Descriptor already includes "build"
      if (enhanced.glasses && enhanced.glasses.trim()) {
        features.push(enhanced.glasses);  // "wearing glasses"
      }

      if (features.length > 0) {
        prompt += ` with ${features.join(', ')}`;
      }

      prompt += ', friendly expression, warm smile, full body standing, white background, Pixar Disney style, 3D animated character, high quality';
      break;

    case 'pet':
      const petType = enhanced.species || 'pet';
      prompt = `Cute ${petType}`;

      const petFeatures: string[] = [];
      if (enhanced.petColor) petFeatures.push(enhanced.petColor);
      if (enhanced.eyes) petFeatures.push(`${enhanced.eyes} eyes`);

      if (petFeatures.length > 0) {
        prompt += ` with ${petFeatures.join(' and ')}`;
      }

      prompt += ', full body standing, white background, Pixar Disney style, 3D animated character, high quality';
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

      prompt += ', fantastical, whimsical, enchanting, full body standing, white background, Pixar Disney style, 3D animated character, high quality';
      break;

    default:
      // Fallback for any unknown profile type
      prompt = 'Full body standing character, white background, Pixar Disney style, 3D animated character, high quality';
  }

  console.log('Avatar prompt - Final:', prompt);

  // Clean up any double spaces
  prompt = prompt.replace(/\s+/g, ' ').trim();

  return prompt;
}