/**
 * Base Story Prompt Builder
 * Abstract class providing shared functionality for all story prompt builders
 * Extended by Fun and Growth story builders
 */

import { createClient } from '@/lib/supabase/server';
import { mapSelectionsToEnhanced } from './descriptorMapper';
import { buildCharacterDescription } from './descriptionBuilder';
import type {
  PromptBuildContext,
  StoryCharacter,
  CharacterContext,
  StoryLength,
} from '../types/story-types';
import type { ProfileType, CharacterSelections } from '../descriptors/types';

export abstract class BaseStoryPromptBuilder {
  /**
   * Get mode-specific system instructions
   * Must be implemented by child classes
   */
  protected abstract getSystemInstructions(): string;

  /**
   * Build the complete story prompt
   * Main entry point for prompt generation
   */
  public async buildPrompt(context: PromptBuildContext): Promise<string> {
    const systemInstructions = this.getSystemInstructions();
    const characterContext = this.organizeCharacters(context.characters);
    const characterDescriptions = await this.buildCharacterContext(characterContext);
    const storyParameters = this.buildStoryParameters(context);
    const formatInstructions = this.formatResponseInstructions(context.length, context.includeIllustrations);

    // Assemble the complete prompt
    let prompt = systemInstructions;
    prompt += '\n\n' + characterDescriptions;
    prompt += '\n\n' + storyParameters;

    if (context.customInstructions) {
      prompt += '\n\n' + this.buildCustomInstructions(context.customInstructions);
    }

    prompt += '\n\n' + formatInstructions;

    return prompt;
  }

  /**
   * Organize characters into hero and supporting cast
   */
  protected organizeCharacters(characters: StoryCharacter[]): CharacterContext {
    const hero = characters.find(c => c.role === 'hero') || characters[0];
    // Filter by reference instead of id to handle ad-hoc characters with undefined ids
    const supporting = characters.filter(c => c !== hero);

    return { hero, supporting };
  }

  /**
   * Build character context section of prompt
   * Fetches character data and generates descriptions
   */
  protected async buildCharacterContext(context: CharacterContext): Promise<string> {
    let characterText = '## CHARACTERS\n\n';

    // Build hero description
    const heroDescription = await this.buildSingleCharacterDescription(context.hero);
    characterText += `**${context.hero.name}** (the hero of our story):\n${heroDescription}\n`;

    // Build supporting character descriptions
    if (context.supporting.length > 0) {
      characterText += '\n**Supporting Characters:**\n';

      for (const char of context.supporting) {
        const description = await this.buildSingleCharacterDescription(char);
        const roleLabel = char.role ? ` (${char.role})` : '';
        characterText += `- **${char.name}${roleLabel}**: ${description}\n`;
      }
    }

    return characterText;
  }

  /**
   * Build description for a single character
   * Handles both linked characters (with full data) and ad-hoc characters (name only)
   */
  protected async buildSingleCharacterDescription(character: StoryCharacter): Promise<string> {
    // If character has no ID, it's an ad-hoc character (user-typed)
    if (!character.id) {
      return character.description || `${character.name}`;
    }

    // If character already has a description, use it
    if (character.description) {
      return character.description;
    }

    // Fetch and build description from character profile
    try {
      const supabase = await createClient();
      const { data: profile, error } = await supabase
        .from('character_profiles')
        .select('character_type, attributes, appearance_description')
        .eq('id', character.id)
        .single();

      if (error || !profile) {
        return character.name; // Fallback to name only
      }

      // Use existing appearance description if available
      if (profile.appearance_description) {
        return profile.appearance_description;
      }

      // Build description from attributes
      const profileType = profile.character_type as ProfileType;
      const selections = profile.attributes as CharacterSelections;

      const enhanced = await mapSelectionsToEnhanced(profileType, selections);
      const description = buildCharacterDescription(profileType, enhanced);

      return description;
    } catch (error) {
      console.error('Error building character description:', error);
      return character.name; // Fallback
    }
  }

  /**
   * Build story parameters section
   * Includes genre, tone, length, and age-appropriateness
   */
  protected buildStoryParameters(context: PromptBuildContext): string {
    let params = '## STORY REQUIREMENTS\n\n';

    // Genre
    params += `**Genre:** ${context.genre.display_name}\n`;
    if (context.genre.description) {
      params += `(${context.genre.description})\n`;
    }

    // Tone/Style
    params += `\n**Tone/Style:** ${context.tone.display_name}\n`;
    if (context.tone.description) {
      params += `(${context.tone.description})\n`;
    }

    // Length specifications - Always 8 scenes
    const lengthMeta = context.length.metadata;
    params += `\n**Length:** ${context.length.display_name}\n`;
    params += `- Target: ${lengthMeta.word_count_min}-${lengthMeta.word_count_max} words\n`;
    params += `- Structure: Exactly 8 scenes/paragraphs\n`;
    params += `- Scene length varies by story length (${Math.round(lengthMeta.word_count_min/8)}-${Math.round(lengthMeta.word_count_max/8)} words per scene)\n`;

    // Age-appropriateness
    params += `\n**Age Appropriateness:** `;
    if (context.heroAge) {
      params += `Suitable for a ${context.heroAge}-year-old child. `;
      params += `Use age-appropriate vocabulary, themes, and concepts.\n`;
    } else {
      params += `Create a family-friendly story suitable for young children.\n`;
    }

    return params;
  }

  /**
   * Build custom instructions section
   */
  protected buildCustomInstructions(instructions: string): string {
    return `## ADDITIONAL GUIDANCE\n\n${instructions}`;
  }

  /**
   * Format response instructions (JSON structure)
   */
  protected formatResponseInstructions(length: StoryLength, includeIllustrations?: boolean): string {
    const wordMin = length.metadata.word_count_min;
    const wordMax = length.metadata.word_count_max;
    const wordsPerScene = `${Math.round(wordMin/8)}-${Math.round(wordMax/8)}`;

    let instructions = '## OUTPUT FORMAT\n\n';
    instructions += '**CRITICAL: You MUST create exactly 8 numbered scenes. No more, no less.**\n\n';
    instructions += 'Follow this exact 8-scene structure:\n';
    instructions += '1. **Scene 1:** Opening/Introduction - Set the scene and introduce the hero\n';
    instructions += '2. **Scene 2:** Setup & Context - Establish the world and situation\n';
    instructions += '3. **Scene 3:** The Catalyst - Something happens that starts the adventure\n';
    instructions += '4. **Scene 4:** Rising Action - The journey/challenge begins\n';
    instructions += '5. **Scene 5:** Development - Deepen the conflict or challenge\n';
    instructions += '6. **Scene 6:** Climax - The peak moment or biggest challenge\n';
    instructions += '7. **Scene 7:** Resolution - How the challenge is resolved\n';
    instructions += '8. **Scene 8:** Ending/Reflection - Conclusion and what was learned\n\n';

    instructions += 'Please respond with a JSON object in the following format:\n\n';
    instructions += '```json\n';
    instructions += '{\n';
    instructions += '  "title": "The Story Title",\n';
    instructions += `  "paragraphs": [\n`;
    instructions += '    "Scene 1: [Opening scene text...]",\n';
    instructions += '    "Scene 2: [Setup scene text...]",\n';
    instructions += '    "Scene 3: [Catalyst scene text...]",\n';
    instructions += '    "Scene 4: [Rising action text...]",\n';
    instructions += '    "Scene 5: [Development text...]",\n';
    instructions += '    "Scene 6: [Climax text...]",\n';
    instructions += '    "Scene 7: [Resolution text...]",\n';
    instructions += '    "Scene 8: [Ending text...]"\n';
    instructions += '  ],\n';
    instructions += '  "moral": "Optional lesson or moral (if applicable)"\n';
    instructions += '}\n';
    instructions += '```\n\n';
    instructions += '**IMPORTANT REQUIREMENTS:**\n';
    instructions += '- You MUST include exactly 8 scenes in the paragraphs array\n';
    instructions += '- Do NOT number the scenes in the actual text (the array position handles numbering)\n';
    instructions += `- Each scene should be approximately ${wordsPerScene} words\n`;
    instructions += `- Total story length: ${wordMin}-${wordMax} words\n`;
    instructions += '- Each scene should flow naturally into the next\n';
    instructions += '- Keep pacing appropriate - longer stories have more detailed scenes\n';

    // Add illustration prompt instructions if requested
    if (includeIllustrations) {
      instructions += '\n\n**ILLUSTRATION PROMPT GENERATION:**\n';
      instructions += 'Additionally, create an illustration prompt field in the JSON response:\n\n';
      instructions += '"illustration_prompt": "Create a high-quality, sharp, and detailed 3x3 grid of images progressing from left to right:\\n';
      instructions += '• [All main characters with their descriptions, e.g., Character Name (description with appearance details)]\\n';
      instructions += '• [Brief visual description for scene 1 mentioning character names]\\n';
      instructions += '• [Brief visual description for scene 2 mentioning character names]\\n';
      instructions += '• [Brief visual description for scene 3 mentioning character names]\\n';
      instructions += '• [Brief visual description for scene 4 mentioning character names]\\n';
      instructions += '• [Brief visual description for scene 5 mentioning character names]\\n';
      instructions += '• [Brief visual description for scene 6 mentioning character names]\\n';
      instructions += '• [Brief visual description for scene 7 mentioning character names]\\n';
      instructions += '• [Brief visual description for scene 8 mentioning character names]\\n';
      instructions += 'Disney Pixar 3D animated movie style with stylized cartoon characters (NOT realistic people). Exaggerated proportions, big expressive eyes, smooth toon-shaded rendering, vibrant colors, playful character design, animated feature film quality. Characters should look like Pixar animated characters with charming, whimsical features - not photographic or realistic. Clean CGI animation aesthetic. No text or numbers"\n\n';
      instructions += '**Important:** The illustration prompt should use bullet points (•) with no scene numbers or brackets.\n';
      instructions += 'The first bullet MUST list all characters with their appearance descriptions.\n';
      instructions += 'Each scene description should be concise and visual, mentioning character names.\n';
    }

    return instructions;
  }

  /**
   * Build story opening suggestion
   * Can be used by child classes to suggest opening lines
   */
  protected buildStoryOpening(heroName: string, genre: string): string {
    const openings: Record<string, string[]> = {
      adventure: [
        `One day, ${heroName} discovered something extraordinary...`,
        `${heroName}'s biggest adventure was about to begin...`,
        `It all started when ${heroName} found a mysterious...`,
      ],
      fantasy: [
        `In a world filled with magic, ${heroName} lived...`,
        `${heroName} had always believed in magic, and one day...`,
        `Once upon a time, ${heroName} entered an enchanted...`,
      ],
      friendship: [
        `${heroName} and their friends were having a wonderful day when...`,
        `${heroName} learned something special about friendship when...`,
        `One sunny morning, ${heroName} decided to...`,
      ],
    };

    const genreOpenings = openings[genre.toLowerCase()] || openings['adventure'];
    return genreOpenings[Math.floor(Math.random() * genreOpenings.length)];
  }

  /**
   * Validate that prompt has all required elements
   */
  protected validatePrompt(prompt: string): boolean {
    const requiredElements = [
      'CHARACTERS',
      'STORY REQUIREMENTS',
      'OUTPUT FORMAT',
    ];

    return requiredElements.every(element => prompt.includes(element));
  }
}
