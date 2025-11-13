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

      // Add numeric age if available
      let ageInfo = '';
      if (selections.age !== undefined && selections.age !== null) {
        const ageYears = selections.age === 1 ? '1 year old' : `${selections.age} years old`;
        ageInfo = ` (${ageYears})`;
      }

      prompt = `Disney Pixar style standing avatar of a friendly ${baseChar}${ageInfo}`;

      // Add physical features
      const features: string[] = [];

      // Special handling for bald - skip hair color and type
      if (enhanced.hairLength === 'bald') {
        features.push('bald head');
      } else {
        // Build hair description with type, length, and color
        const hairParts: string[] = [];
        if (enhanced.hairType) hairParts.push(enhanced.hairType);
        if (enhanced.hairLength) hairParts.push(enhanced.hairLength);
        if (enhanced.hair) hairParts.push(enhanced.hair);

        if (hairParts.length > 0) {
          features.push(`${hairParts.join(' ')} hair`);
        }
      }

      if (enhanced.eyes) features.push(`${enhanced.eyes} eyes`);
      if (enhanced.skin) features.push(`${enhanced.skin} skin`);
      if (enhanced.body) features.push(enhanced.body);  // Descriptor already includes "build"
      if (enhanced.glasses && enhanced.glasses.trim()) {
        features.push(enhanced.glasses);  // "wearing glasses"
      }

      if (features.length > 0) {
        prompt += `, ${features.join(', ')}`;
      }

      prompt += ', wearing age-appropriate, modest clothing, white background, high quality';
      break;

    case 'pet':
      const petType = enhanced.species || 'pet';
      prompt = `Disney Pixar style standing pet avatar: happy ${petType}`;

      const petFeatures: string[] = [];
      if (enhanced.petColor) petFeatures.push(enhanced.petColor);
      if (enhanced.eyes) petFeatures.push(`${enhanced.eyes}`);

      if (petFeatures.length > 0) {
        prompt += `, ${petFeatures.join(', ')}`;
      }

      prompt += ', white background, high quality';
      break;

    case 'magical_creature':
      const creatureType = enhanced.creature || 'creature';
      prompt = `Disney Pixar style standing magical creature avatar: happy and enchanting ${creatureType}`;

      const magicFeatures: string[] = [];
      if (enhanced.hair) magicFeatures.push(`${enhanced.hair} features`);
      if (enhanced.eyes) magicFeatures.push(`${enhanced.eyes}`);

      if (magicFeatures.length > 0) {
        prompt += `, ${magicFeatures.join(', ')}`;
      }

      prompt += ', white background, high quality';
      break;

    default:
      // Fallback for any unknown profile type
      prompt = 'Disney Pixar style standing friendly character avatar, white background, high quality';
  }

  console.log('Avatar prompt - Final:', prompt);

  // Clean up any double spaces
  prompt = prompt.replace(/\s+/g, ' ').trim();

  return prompt;
}