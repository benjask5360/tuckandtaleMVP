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
 * Character details needed for illustration prompts
 */
interface IllustrationCharacterDetails {
  name: string;
  hairColor: string;
  eyeColor: string;
  age: number;
  clothing: string;
  build: string;
}

/**
 * Build the OpenAI prompt for generating all illustration prompts at once
 */
export function buildIllustrationPromptsPrompt(
  title: string,
  paragraphs: V3Paragraph[],
  characters: V3CharacterInfo[]
): string {
  // Extract character details from appearance descriptions
  const characterDetails = characters.map(extractCharacterDetails);

  const paragraphsList = paragraphs
    .map((p, i) => `${i + 1}. ${p.text}`)
    .join('\n');

  const charactersList = characterDetails
    .map(c => `${c.name}: ${c.hairColor}, ${c.eyeColor}, ${c.age}-year-old, ${c.clothing}, ${c.build}`)
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
Each prompt must follow this exact format as a SINGLE-LINE STRING:

Disney pixar illustration. CHARACTERS: {Name}: {hair color}, {eye color}, {age}-year-old, {clothing}, {build}. SETTING: {brief location, 1 short sentence}. ACTIONS: - {action1} - {action2}. STYLE: Disney pixar

RULES:
- Keep each prompt under 150 words
- ALWAYS include hair color and eye color for EVERY character in EVERY scene
- Keep clothing IDENTICAL across ALL prompts for each character
- SETTING: 1 short sentence maximum (e.g., "Forest clearing, oak trees")
- ACTIONS: 2-3 brief bullet points maximum - just the action, no adverbs
- NO adjectives like: magical, wonderful, beautiful, cozy, warm, bright, golden
- NO emotional descriptors like: excited, happy, worried, confidently, eagerly, joyfully
- Describe ONLY what is visible - no feelings, emotions, or atmosphere
- DO NOT use actual line breaks in the prompt string
- Start cover prompt with "Disney pixar illustration" (NOT "book cover")
- End all prompts with "STYLE: Disney pixar" (NOT "storybook cover")

## OUTPUT FORMAT
Return valid JSON with this exact structure:
{
  "coverPrompt": "Disney pixar illustration. CHARACTERS: ...",
  "scenePrompts": [
    { "paragraphIndex": 0, "prompt": "Disney pixar illustration. CHARACTERS: ..." },
    { "paragraphIndex": 1, "prompt": "Disney pixar illustration. CHARACTERS: ..." }
  ]
}

Important: scenePrompts array must have exactly ${paragraphs.length} items, one for each paragraph, with paragraphIndex matching the paragraph number (0-indexed).`;
}

/**
 * Extract character details from the appearance description
 */
function extractCharacterDetails(character: V3CharacterInfo): IllustrationCharacterDetails {
  const desc = character.appearanceDescription || '';

  // Default values
  let hairColor = 'brown hair';
  let eyeColor = 'brown eyes';
  let clothing = 'casual clothes';
  let build = 'average build';

  // Try to extract hair color
  const hairMatch = desc.match(/(\w+(?:\s+\w+)?)\s+hair/i);
  if (hairMatch) {
    hairColor = `${hairMatch[1]} hair`;
  }

  // Try to extract eye color
  const eyeMatch = desc.match(/(\w+)\s+eyes/i);
  if (eyeMatch) {
    eyeColor = `${eyeMatch[1]} eyes`;
  }

  // Try to extract clothing
  const clothingPatterns = [
    /wearing\s+(?:a\s+)?([^,.]+)/i,
    /dressed\s+in\s+(?:a\s+)?([^,.]+)/i,
    /in\s+(?:a\s+)?([^,.]+(?:dress|shirt|pajamas|outfit|clothes))/i,
  ];

  for (const pattern of clothingPatterns) {
    const match = desc.match(pattern);
    if (match) {
      clothing = match[1].trim();
      break;
    }
  }

  // Try to extract build
  const buildPatterns = [
    /(small|petite|tiny|average|medium|large|tall|short)\s+(?:build|frame|stature)/i,
    /(slim|slender|athletic|stocky|chubby)/i,
  ];

  for (const pattern of buildPatterns) {
    const match = desc.match(pattern);
    if (match) {
      build = `${match[1]} build`;
      break;
    }
  }

  // Determine build from age if not explicitly stated
  const age = character.age || 6;
  if (build === 'average build' && age < 10) {
    build = 'small build';
  }

  return {
    name: character.name,
    hairColor,
    eyeColor,
    age,
    clothing,
    build,
  };
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
