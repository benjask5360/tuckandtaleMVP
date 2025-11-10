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
  const prompt = `You are a visual storytelling expert creating a 9-panel panoramic storyboard for children.

**Story Requirements:**
- Story Type: ${mode === 'fun' ? 'Fun Adventure' : 'Growth & Learning'}
- Genre: ${genre}
- Tone: ${tone}
- Target Age: ${heroAge} years old
${customInstructions ? `- Special Instructions: ${customInstructions}` : ''}

**Characters:**
${characterList}

**Task:**
Create a ${genre} story with 9 visual scenes for a panoramic storyboard image. ${storyFocus}

**Scene Guidelines:**
- Scene 1: Cover illustration - Establish the main character(s) and setting
- Scenes 2-8: Story progression with clear beginning, middle, and end
- Scene 9: Satisfying conclusion

For each scene, provide a 30-50 word visual description that includes:
- Character positions and actions
- Setting and background details
- Lighting and atmosphere
- Key visual elements
- Emotional tone

**IMPORTANT: Return your response in this exact JSON format:**
\`\`\`json
{
  "title": "The Story Title",
  "summary": "A 2-3 sentence engaging summary of the entire story for visual context.",
  "scenes": [
    "Scene 1: [Visual description for cover illustration]",
    "Scene 2: [Visual description]",
    "Scene 3: [Visual description]",
    "Scene 4: [Visual description]",
    "Scene 5": [Visual description]",
    "Scene 6: [Visual description]",
    "Scene 7: [Visual description]",
    "Scene 8: [Visual description]",
    "Scene 9: [Visual description - conclusion]"
  ]
}
\`\`\`

Create the storyboard now. Remember: Each scene description should be visual and concrete, not narrative prose.`;

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
