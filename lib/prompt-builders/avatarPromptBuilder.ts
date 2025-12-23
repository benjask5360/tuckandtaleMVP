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
  console.log('Avatar prompt - Background in selections:', selections.background);

  const enhanced = await mapSelectionsToEnhanced(profileType, selections);
  console.log('Avatar prompt - Enhanced:', enhanced);
  console.log('Avatar prompt - Enhanced background:', enhanced.background);
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
      // Get numeric age
      const numericAge = selections.age !== undefined && selections.age !== null ? selections.age : undefined;

      // Determine gender term (boy/girl/child or man/woman/adult)
      let genderTerm = 'child';
      if (enhanced.gender) {
        if (enhanced.gender.includes('girl')) {
          genderTerm = numericAge !== undefined && numericAge >= 18 ? 'woman' : 'girl';
        } else if (enhanced.gender.includes('boy')) {
          genderTerm = numericAge !== undefined && numericAge >= 18 ? 'man' : 'boy';
        } else if (enhanced.gender.includes('woman') || enhanced.gender.includes('female')) {
          genderTerm = 'woman';
        } else if (enhanced.gender.includes('man') || enhanced.gender.includes('male')) {
          genderTerm = 'man';
        }
      } else if (numericAge !== undefined && numericAge >= 18) {
        genderTerm = 'adult';
      }

      // Determine kid or adult for clothing description
      const kidOrAdult = numericAge !== undefined && numericAge >= 18 ? 'adult' : 'kid';

      // Build ethnicity/features phrase
      const ethnicityPhrase = enhanced.background ? `with ${enhanced.background} features` : '';

      // Build age phrase
      let agePhrase = '';
      if (numericAge !== undefined) {
        if (numericAge === 0) {
          agePhrase = 'infant';
        } else if (numericAge === 1) {
          agePhrase = '1-year-old';
        } else {
          agePhrase = `${numericAge}-year-old`;
        }
      }

      // Build the main prompt with new structure
      const mainDescriptor = agePhrase ? `${agePhrase} ${genderTerm}` : genderTerm;
      prompt = `Disney Pixar style standing avatar of a friendly ${mainDescriptor} ${ethnicityPhrase}, dressed like a typical American ${kidOrAdult} in modern casual clothes.`;

      // Determine pronouns based on gender
      let pronoun = 'They have';
      let pronounPossessive = 'Their';
      if (genderTerm === 'girl' || genderTerm === 'woman') {
        pronoun = 'She has';
        pronounPossessive = 'Her';
      } else if (genderTerm === 'boy' || genderTerm === 'man') {
        pronoun = 'He has';
        pronounPossessive = 'His';
      }

      // Build characteristics sentence
      const charParts: string[] = [];

      // Hair description
      if (enhanced.hairLength === 'bald') {
        charParts.push('a bald head');
      } else {
        const hairParts: string[] = [];
        if (enhanced.hairType) hairParts.push(enhanced.hairType);
        if (enhanced.hairLength) hairParts.push(enhanced.hairLength);
        if (enhanced.hair) hairParts.push(enhanced.hair);
        if (hairParts.length > 0) {
          charParts.push(`${hairParts.join(' ')} hair`);
        }
      }

      // Eye color
      if (enhanced.eyes) charParts.push(`${enhanced.eyes} eyes`);

      // Skin tone
      if (enhanced.skin) charParts.push(`a ${enhanced.skin} skin tone`);

      // Build type
      if (enhanced.body) charParts.push(`a ${enhanced.body} build`);

      // Glasses
      if (enhanced.glasses && enhanced.glasses.trim()) {
        charParts.push(enhanced.glasses);
      }

      // Age-related features for elderly
      if (numericAge !== undefined && numericAge >= 70) {
        charParts.push('gentle wrinkles and warm features');
      } else if (numericAge !== undefined && numericAge >= 60) {
        charParts.push('subtle laugh lines and mature features');
      }

      // Build the characteristics sentence with proper grammar
      if (charParts.length > 0) {
        let charSentence = ` ${pronoun} `;
        if (charParts.length === 1) {
          charSentence += charParts[0];
        } else if (charParts.length === 2) {
          charSentence += `${charParts[0]} and ${charParts[1]}`;
        } else {
          const lastPart = charParts.pop();
          charSentence += `${charParts.join(', ')}, and ${lastPart}`;
        }
        prompt += charSentence + '.';
      }

      // Add age reinforcement
      if (numericAge !== undefined) {
        prompt += ` ${pronounPossessive} physical appearance should clearly be that of a ${numericAge} year old.`;
      }

      prompt += ' White background, high quality.';
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
