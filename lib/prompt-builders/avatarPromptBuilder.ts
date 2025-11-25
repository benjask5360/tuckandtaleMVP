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

      // Add numeric age if available - use hyphenated format
      let ageDescriptor = baseChar;
      let numericAge: number | undefined;
      if (selections.age !== undefined && selections.age !== null) {
        numericAge = selections.age;
        const ageNum = selections.age;
        ageDescriptor = selections.age === 1 ? `one-year-old ${baseChar}` : `${ageNum}-year-old ${baseChar}`;
      }

      // Add age-related features for elderly/mature characters
      let ageFeatures = '';
      if (numericAge !== undefined && numericAge >= 60) {
        if (numericAge >= 70) {
          ageFeatures = ' with gentle wrinkles and warm features';
        } else if (numericAge >= 60) {
          ageFeatures = ' with subtle laugh lines and mature features';
        }
      }

      // Determine pronoun based on gender descriptor
      let pronoun = 'They have';
      let pronounSubject = 'Their';
      if (enhanced.gender) {
        // Check for female descriptors (more comprehensive check)
        if (enhanced.gender.includes('girl') || enhanced.gender.includes('woman') || enhanced.gender.includes('female')) {
          pronoun = 'She has';
          pronounSubject = 'Her';
        } else if (enhanced.gender.includes('boy') || enhanced.gender.includes('man') || enhanced.gender.includes('male')) {
          pronoun = 'He has';
          pronounSubject = 'His';
        }
      }

      const backgroundPrefix = enhanced.background ? `${enhanced.background} ` : '';
      prompt = `Disney Pixar style standing avatar of a friendly ${backgroundPrefix}${ageDescriptor}${ageFeatures}, wearing age-appropriate, modest clothing. ${pronoun} the following characteristics:`;

      // Build characteristics list with bullet points for clarity
      const characteristics: string[] = [];

      // Special handling for bald - skip hair color and type
      if (enhanced.hairLength === 'bald') {
        characteristics.push('A bald head');
      } else {
        // Build hair description with type, length, and color
        const hairParts: string[] = [];
        if (enhanced.hairType) hairParts.push(enhanced.hairType);
        if (enhanced.hairLength) hairParts.push(enhanced.hairLength);
        if (enhanced.hair) hairParts.push(enhanced.hair);

        if (hairParts.length > 0) {
          characteristics.push(`${hairParts.join(' ')} hair`);
        }
      }

      // IMPORTANT: Eye color should be emphasized
      if (enhanced.eyes) characteristics.push(`${enhanced.eyes} eyes (IMPORTANT: eyes must be ${enhanced.eyes})`);
      if (enhanced.skin) characteristics.push(`${enhanced.skin} skin tone`);
      if (enhanced.body) characteristics.push(enhanced.body);  // Descriptor already includes "build"
      if (enhanced.glasses && enhanced.glasses.trim()) {
        characteristics.push(enhanced.glasses);  // "wearing glasses"
      }

      if (characteristics.length > 0) {
        prompt += '\n' + characteristics.map(c => `- ${c}`).join('\n');
      }

      // Add explicit age appearance reinforcement for better age distinction
      if (numericAge !== undefined) {
        prompt += `\n${pronounSubject} physical appearance should clearly be that of a ${numericAge} year old.`;
      }

      prompt += '\nWhite background, high quality.';
      break;

    case 'pet':
      const petType = enhanced.species || 'pet';
      prompt = `Disney Pixar style standing pet avatar of a happy ${petType} with the following characteristics:`;

      const petCharacteristics: string[] = [];
      if (enhanced.petColor) petCharacteristics.push(`${enhanced.petColor} coloring`);
      if (enhanced.eyes) petCharacteristics.push(`${enhanced.eyes} eyes`);

      if (petCharacteristics.length > 0) {
        prompt += '\n' + petCharacteristics.map(c => `- ${c}`).join('\n');
      }

      prompt += '\nWhite background, high quality.';
      break;

    case 'magical_creature':
      const creatureType = enhanced.creature || 'creature';
      prompt = `Disney Pixar style standing magical creature avatar of a happy and enchanting ${creatureType} with the following characteristics:`;

      const creatureCharacteristics: string[] = [];
      if (enhanced.magicalColor) creatureCharacteristics.push(`${enhanced.magicalColor} coloring`);
      if (enhanced.hair) creatureCharacteristics.push(`${enhanced.hair} features`);
      if (enhanced.eyes) creatureCharacteristics.push(`${enhanced.eyes} eyes`);

      if (creatureCharacteristics.length > 0) {
        prompt += '\n' + creatureCharacteristics.map(c => `- ${c}`).join('\n');
      }

      prompt += '\nWhite background, high quality.';
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
