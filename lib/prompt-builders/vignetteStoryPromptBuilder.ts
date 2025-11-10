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
  title: string;
  summary: string; // 2-3 sentence overview for Leonardo
  scenes: string[]; // 9 visual scene descriptions
}

/**
 * Generate OpenAI prompt for vignette story creation
 */
export function generateVignetteStoryPrompt(params: VignetteStoryParams): string {
  const { characters, genre, tone, mode, customInstructions, heroAge } = params;

  // Build character list with descriptions
  const characterList = characters
    .map((char) => `- ${char.name}: ${char.description || 'Character in the story'}`)
    .join('\n');

  // Determine story focus based on mode
  const storyFocus =
    mode === 'growth'
      ? 'Focus on emotional growth, learning a valuable lesson, and character development.'
      : 'Focus on fun, adventure, imagination, and delightful moments.';

  // Build the prompt
  const prompt = `You will generate 9 brief scene descriptions for a Leonardo.ai panoramic image prompt.

**Story Setup:**
- Type: ${mode === 'fun' ? 'Fun Adventure' : 'Growth & Learning'}
- Genre: ${genre} | Tone: ${tone} | Age: ${heroAge}
${customInstructions ? `- Special: ${customInstructions}` : ''}

**Characters:**
${characterList}

**CRITICAL INSTRUCTION:**
Each scene must be 10-15 words describing what's happening in that moment. Use simple, clear action language.

**Good Examples:**
- "Theo waking up early and running into his parents' bedroom, full of excitement."
- "His parents smiling sleepily as he jumps onto the bed."
- "They decide to make breakfast together in the kitchen, eggs and pancakes sizzling."

**Bad Examples (too visual/technical):**
- "Bedroom interior, boy near bed, morning light, excited expression"
- "Kitchen setting with stove, characters positioned left, warm lighting"

**Return JSON:**
\`\`\`json
{
  "title": "The Story Title",
  "summary": "Brief description of what the story is about (e.g., 'a young boy named Theo and his loving parents').",
  "scenes": [
    "Brief scene 1 description with simple action and emotion.",
    "Brief scene 2 description.",
    "Brief scene 3 description.",
    "Brief scene 4 description.",
    "Brief scene 5 description.",
    "Brief scene 6 description.",
    "Brief scene 7 description.",
    "Brief scene 8 description.",
    "Brief scene 9 description with emotional resolution."
  ]
}
\`\`\`

${storyFocus} Each scene should be 10-15 words showing what's happening, not technical framing.`;

  return prompt;
}

/**
 * Parse OpenAI response into structured format
 */
export function parseVignetteStoryResponse(response: string): VignetteStoryResponse {
  try {
    // Try to extract JSON from code block if present
    const jsonMatch = response.match(/```json\s*([\s\S]*?)\s*```/) || response.match(/```\s*([\s\S]*?)\s*```/);
    const jsonString = jsonMatch ? jsonMatch[1] : response;

    const parsed = JSON.parse(jsonString);

    // Validate structure
    if (!parsed.title || !parsed.summary || !Array.isArray(parsed.scenes)) {
      throw new Error('Invalid response structure');
    }

    if (parsed.scenes.length !== 9) {
      throw new Error(`Expected 9 scenes, got ${parsed.scenes.length}`);
    }

    return {
      title: parsed.title,
      summary: parsed.summary,
      scenes: parsed.scenes,
    };
  } catch (error) {
    console.error('[Vignette Story] Failed to parse OpenAI response:', error);
    console.error('[Vignette Story] Raw response:', response);
    throw new Error('Failed to parse vignette story response from OpenAI');
  }
}
