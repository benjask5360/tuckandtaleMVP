/**
 * V3 Illustration Prompt Builder
 *
 * Generates illustration prompts for V3 stories by calling OpenAI with the complete
 * story text and character information. Returns a cover prompt and one scene prompt
 * per paragraph.
 */

import type {
  V3CharacterInfo,
  V3IllustrationPromptsResponse,
  V3Paragraph,
} from '../types';

/**
 * Build the OpenAI prompt for generating all illustration prompts at once
 */
export function buildIllustrationPromptsPrompt(
  title: string,
  paragraphs: V3Paragraph[],
  characters: V3CharacterInfo[]
): string {
  const paragraphsList = paragraphs
    .map((p, i) => `${i + 1}. ${p.text}`)
    .join('\n');

  // Pass the full appearance description directly - let OpenAI format it correctly
  // Include characterType and background so OpenAI knows ethnicity, pet vs child, etc.
  const charactersList = characters
    .map(c => {
      const bgPrefix = c.background ? `${c.background} ` : '';
      return `- ${c.name} (${bgPrefix}${c.characterType}${c.age ? `, age ${c.age}` : ''}): ${c.appearanceDescription}`;
    })
    .join('\n');

  return `You are creating illustration prompts for a children's bedtime story.

## STORY
Title: ${title}
Paragraphs:
${paragraphsList}

## CHARACTERS
${charactersList}

## INSTRUCTIONS
Create Disney Pixar-style illustration prompts for:
- 1 cover illustration (captures the essence of the entire story, featuring the main character in an iconic pose)
- 1 illustration per paragraph (${paragraphs.length} total)

## ILLUSTRATION PROMPT FORMAT (CRITICAL)
Each prompt must follow this EXACT format as a SINGLE-LINE STRING. Note the spaces around colons in section headers:

Disney pixar illustration. CHARACTERS: {Name1}: {description}; {Name2}: {description} . SETTING : {brief location} . ACTIONS : - {Name1} {action} - {Name2} {action} . STYLE : Disney pixar

CHARACTER DESCRIPTION FORMATS (use based on character type):
- For children/people: "{Name}: {ethnicity}, {color} hair, {color} eyes, {age}-year-old, {clothing description}, {build}"
  Example: "Zaier: African American, brown hair, brown eyes, 3-year-old, colorful t-shirt and shorts, average build"
- For pets: "{Name}: {color} {species/breed} with {eye color} eyes"
  Example: "Penny: orange and white Corgi with brown eyes"
- For magical creatures: "{Name}: {color} {creature type} with {distinctive features}"
  Example: "Sparkle: purple dragon with golden eyes and shimmering scales"

RULES:
- ALWAYS start with "Disney pixar illustration."
- Use semicolons (;) to separate multiple characters in CHARACTERS section
- Use spaces around colons in section headers: " SETTING : " not "SETTING:"
- Keep each prompt under 150 words
- For humans: ALWAYS include ethnicity/background at the START of the description (before hair color)
- For humans: ALWAYS include "{color} hair" and "{color} eyes" (full words, not just colors)
- Keep clothing/appearance IDENTICAL across ALL prompts for each character
- SETTING: 1 short sentence maximum
- ACTIONS: 2-3 brief bullet points with character name and action
- NO adjectives like: magical, wonderful, beautiful, cozy, warm, bright, golden
- NO emotional descriptors like: excited, happy, worried, confidently, eagerly, joyfully
- NEVER use these action words (they trigger content filters): shooting, hitting, fighting, punching, kicking
- Describe ONLY what is visible - no feelings, emotions, or atmosphere
- DO NOT use actual line breaks in the prompt string
- ALWAYS end with " . STYLE : Disney pixar"

## EXAMPLE OUTPUT
For a story with a child (Zaier) and a magical creature (Flicker the firefly):
{
  "coverPrompt": "Disney pixar illustration. CHARACTERS: Zaier: African American, brown hair, brown eyes, 3-year-old, colorful t-shirt and shorts, average build; Flicker: tiny yellow firefly with bright wings . SETTING : Sunny meadow with colorful flowers . ACTIONS : - Zaier stands in grass looking up - Flicker hovers nearby glowing . STYLE : Disney pixar",
  "scenePrompts": [
    { "paragraphIndex": 0, "prompt": "Disney pixar illustration. CHARACTERS: Zaier: African American, brown hair, brown eyes, 3-year-old, colorful t-shirt and shorts, average build . SETTING : Bedroom with morning sunlight . ACTIONS : - Zaier wakes up in bed - Zaier stretches arms . STYLE : Disney pixar" },
    { "paragraphIndex": 1, "prompt": "Disney pixar illustration. CHARACTERS: Zaier: African American, brown hair, brown eyes, 3-year-old, colorful t-shirt and shorts, average build; Flicker: tiny yellow firefly with bright wings . SETTING : Flower-filled meadow . ACTIONS : - Zaier walks through tall grass - Flicker flies beside . STYLE : Disney pixar" }
  ]
}

## OUTPUT FORMAT
Return valid JSON with this exact structure:
{
  "coverPrompt": "Disney pixar illustration. CHARACTERS: ... . SETTING : ... . ACTIONS : ... . STYLE : Disney pixar",
  "scenePrompts": [
    { "paragraphIndex": 0, "prompt": "Disney pixar illustration. CHARACTERS: ... . SETTING : ... . ACTIONS : ... . STYLE : Disney pixar" },
    { "paragraphIndex": 1, "prompt": "Disney pixar illustration. CHARACTERS: ... . SETTING : ... . ACTIONS : ... . STYLE : Disney pixar" }
  ]
}

Important: scenePrompts array must have exactly ${paragraphs.length} items, one for each paragraph, with paragraphIndex matching the paragraph number (0-indexed).`;
}

/**
 * Validate the OpenAI response for illustration prompts
 */
export function validateIllustrationPromptsResponse(
  response: unknown,
  expectedParagraphCount: number
): { isValid: boolean; errors: string[]; data?: V3IllustrationPromptsResponse } {
  const errors: string[] = [];

  if (!response || typeof response !== 'object') {
    return { isValid: false, errors: ['Response is not an object'] };
  }

  const resp = response as Record<string, unknown>;

  // Check coverPrompt
  if (!resp.coverPrompt || typeof resp.coverPrompt !== 'string') {
    errors.push('Missing or invalid coverPrompt');
  } else if (!resp.coverPrompt.toLowerCase().includes('disney pixar')) {
    errors.push('coverPrompt missing "Disney pixar" style');
  }

  // Check scenePrompts
  if (!resp.scenePrompts || !Array.isArray(resp.scenePrompts)) {
    errors.push('Missing or invalid scenePrompts array');
  } else {
    if (resp.scenePrompts.length !== expectedParagraphCount) {
      errors.push(`Expected ${expectedParagraphCount} scene prompts, got ${resp.scenePrompts.length}`);
    }

    for (let i = 0; i < resp.scenePrompts.length; i++) {
      const scene = resp.scenePrompts[i] as Record<string, unknown>;

      if (typeof scene.paragraphIndex !== 'number') {
        errors.push(`Scene ${i}: missing paragraphIndex`);
      }

      if (typeof scene.prompt !== 'string') {
        errors.push(`Scene ${i}: missing prompt`);
      } else if (!scene.prompt.toLowerCase().includes('disney pixar')) {
        errors.push(`Scene ${i}: prompt missing "Disney pixar" style`);
      }
    }
  }

  if (errors.length > 0) {
    return { isValid: false, errors };
  }

  return {
    isValid: true,
    errors: [],
    data: resp as unknown as V3IllustrationPromptsResponse,
  };
}

/**
 * Moderation cleanse instructions - progressively more conservative
 * Used when Leonardo rejects a prompt
 */
export const MODERATION_CLEANSE_INSTRUCTIONS = [
  // Attempt 1: Standard cleanse
  `This illustration prompt was flagged for moderation. Rewrite to be more child-friendly while keeping the same scene:

Original: "{prompt}"

Focus on:
- Remove any physical contact between characters
- Simplify actions to non-physical things (looking, pointing, standing, walking)
- Avoid bedrooms/bathrooms - use neutral settings like outdoors, living room
- Keep characters further apart in the scene

Return ONLY the cleaned prompt in the exact same format, no explanation.`,

  // Attempt 2: Remove physical contact
  `This prompt was flagged again. Remove ALL physical contact between characters. Characters must be visually separated in the scene:

Original: "{prompt}"

Return ONLY the cleaned prompt, no explanation.`,

  // Attempt 3: Simplify actions
  `Still flagged. Use ONLY these simple actions: looking, pointing, standing, walking. No touching, hugging, carrying, holding hands, or any physical contact:

Original: "{prompt}"

Return ONLY the cleaned prompt, no explanation.`,

  // Attempt 4: Change setting
  `Still flagged. Move the scene to a neutral OUTDOOR setting (park, garden, field, forest clearing). Characters standing apart, simple actions only:

Original: "{prompt}"

Return ONLY the cleaned prompt, no explanation.`,

  // Attempt 5: Character portrait fallback
  `Final attempt. Show ONLY the main character alone, standing in a neutral outdoor setting (park or garden). No other characters, no actions, just a simple portrait:

Original: "{prompt}"

Return ONLY the cleaned prompt, no explanation.`,
];

/**
 * Build a cleanse prompt for moderation retry
 */
export function buildCleansePrompt(
  originalPrompt: string,
  attemptIndex: number
): string {
  const instruction = MODERATION_CLEANSE_INSTRUCTIONS[attemptIndex];
  if (!instruction) {
    throw new Error(`Invalid cleanse attempt index: ${attemptIndex}`);
  }
  return instruction.replace('{prompt}', originalPrompt);
}
