/**
 * Story Prompt Builder Module
 * Generates prompts for story generation and general AI use
 * Handles multi-character scenarios and narrative context
 */

import {
  ProfileType,
  CharacterSelections,
  PromptGenerationOptions,
  GeneratedPrompt,
} from '../descriptors/types';
import { mapSelectionsToEnhanced } from './descriptorMapper';
import { buildCharacterDescription } from './descriptionBuilder';

/**
 * Generate a complete AI prompt from character selections
 * This is the main function for general AI generation
 *
 * @param options - Prompt generation options including profile type, selections, and style
 * @returns A generated prompt with enhanced descriptors and metadata
 */
export async function generateAIPrompt(
  options: PromptGenerationOptions
): Promise<GeneratedPrompt> {
  const { profileType, selections, style = 'concise' } = options;

  // Map selections to enhanced descriptors
  const enhancedDescriptors = await mapSelectionsToEnhanced(profileType, selections);

  // Build the character description
  const characterDescription = buildCharacterDescription(profileType, enhancedDescriptors);

  // Build the complete prompt based on style
  let prompt = characterDescription;

  if (style === 'detailed') {
    // Add more context for detailed generation
    prompt = `Create a detailed character description for: ${characterDescription}. ` +
      `Include personality traits, distinguishing features, and unique characteristics.`;
  } else if (style === 'creative') {
    // Add creative instructions
    prompt = `Imagine and describe: ${characterDescription}. ` +
      `Be creative with their appearance, mannerisms, and what makes them special.`;
  }

  // Store full description for reference
  enhancedDescriptors.fullDescription = characterDescription;

  return {
    prompt,
    enhancedDescriptors,
    metadata: {
      profileType,
      wordCount: prompt.split(' ').length,
      timestamp: new Date().toISOString(),
    },
  };
}

/**
 * Generate a story prompt that incorporates character descriptions
 * Used for story generation with character context
 *
 * @param characters - Array of characters with their names, types, and selections
 * @param storyTheme - Optional theme for the story
 * @returns A prompt string for story generation
 */
export async function generateStoryPrompt(
  characters: Array<{
    name: string;
    profileType: ProfileType;
    selections: CharacterSelections;
  }>,
  storyTheme?: string
): Promise<string> {
  const characterDescriptions = await Promise.all(
    characters.map(async (char) => {
      const enhanced = await mapSelectionsToEnhanced(char.profileType, char.selections);
      const description = buildCharacterDescription(char.profileType, enhanced);
      return `${char.name}: ${description}`;
    })
  );

  let prompt = 'Write a children\'s story featuring the following characters:\n';
  prompt += characterDescriptions.join('\n');

  if (storyTheme) {
    prompt += `\n\nStory theme: ${storyTheme}`;
  }

  prompt += '\n\nMake the story age-appropriate, engaging, and educational.';

  return prompt;
}