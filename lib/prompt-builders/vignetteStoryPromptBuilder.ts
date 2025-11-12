/**
 * Vignette Story Prompt Builder
 *
 * Generates OpenAI prompts for creating visual storyboard descriptions
 * optimized for panoramic image generation with Leonardo.ai
 *
 * This is SEPARATE from the text-based story generation system.
 */

import type { StoryCharacter, StoryMode } from '../types/story-types';

export interface VignetteStoryParams {
  characters: StoryCharacter[];
  genre: string;
  tone: string;
  mode: StoryMode;
  customInstructions?: string;
  heroAge: number;
}

export interface VignetteStoryResponse {
  leonardoPrompt: string; // The complete Leonardo.ai prompt as plain text
}

/**
 * Generate OpenAI prompt for creating a Leonardo.ai prompt directly
 */
export function generateVignetteStoryPrompt(params: VignetteStoryParams): string {
  const { characters, genre, mode, customInstructions } = params;

  // Build character descriptions
  const characterDescriptions = characters
    .map((char) => `${char.name}: ${char.description || 'Character in the story'}`)
    .join(', ');

  // Determine story type
  const storyType = mode === 'growth' ? 'Help my child grow' : 'Just for fun';

  // Build growth area/topic if applicable
  let growthSection = '';
  if (mode === 'growth' && customInstructions) {
    growthSection = `Growth Area: Emotional Growth, Topic: ${customInstructions}`;
  } else if (customInstructions) {
    growthSection = `Topic: ${customInstructions}`;
  }

  // Build the prompt with explicit technical requirements for Leonardo
  const prompt = `Generate ONE SINGLE Leonardo.ai prompt that creates a unified panoramic image showing a 9-panel storyboard grid.

Story Information:
- Characters: ${characterDescriptions}
- Story Type: ${storyType}
${growthSection ? '- ' + growthSection + '\n' : ''}- Genre: ${genre}

CRITICAL REQUIREMENTS FOR THE LEONARDO PROMPT:
1. This must be ONE continuous panoramic image (NOT 9 separate images)
2. The image shows 9 connected scenes arranged in exactly 3 rows × 3 columns
3. The SAME character(s) with IDENTICAL appearance, clothing, hair, and features must appear across all 9 panels
4. All panels must flow left-to-right, top-to-bottom telling a cohesive story
5. Seamless composition with no borders, frames, or dividers between panels
6. Disney Pixar storybook style with consistent warm lighting throughout the entire panoramic image
7. Each panel shows a different moment in the story progression

Return ONLY the complete Leonardo.ai prompt as a single string. No JSON, no formatting, no extra commentary.`;

  return prompt;
}

/**
 * Parse OpenAI response - now expects plain text Leonardo prompt
 */
export function parseVignetteStoryResponse(response: string): VignetteStoryResponse {
  try {
    // Clean up the response - remove any markdown code blocks if present
    let cleanedPrompt = response.trim();

    // Remove code block markers if OpenAI wrapped the response
    const codeBlockMatch = cleanedPrompt.match(/```(?:text|plaintext)?\s*([\s\S]*?)\s*```/);
    if (codeBlockMatch) {
      cleanedPrompt = codeBlockMatch[1].trim();
    }

    // Validate we have content
    if (!cleanedPrompt || cleanedPrompt.length === 0) {
      throw new Error('OpenAI returned empty response');
    }

    return {
      leonardoPrompt: cleanedPrompt,
    };
  } catch (error) {
    console.error('[Vignette Story] Failed to parse OpenAI response:', error);
    console.error('[Vignette Story] Raw response:', response);
    throw new Error('Failed to parse vignette story response from OpenAI');
  }
}
