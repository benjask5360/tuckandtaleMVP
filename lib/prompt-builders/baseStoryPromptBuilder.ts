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
    const formatInstructions = this.formatResponseInstructions(context.length);

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

    // Length specifications
    const lengthMeta = context.length.metadata;
    params += `\n**Length:** ${context.length.display_name}\n`;
    params += `- Target: ${lengthMeta.word_count_min}-${lengthMeta.word_count_max} words\n`;
    params += `- Paragraphs: ${lengthMeta.paragraph_count_min}-${lengthMeta.paragraph_count_max}\n`;

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
  protected formatResponseInstructions(length: StoryLength): string {
    const paraCount = length.metadata.paragraph_count_max;

    let instructions = '## OUTPUT FORMAT\n\n';
    instructions += 'Please respond with a JSON object in the following format:\n\n';
    instructions += '```json\n';
    instructions += '{\n';
    instructions += '  "title": "The Story Title",\n';
    instructions += `  "paragraphs": [\n`;
    instructions += '    "First paragraph of the story...",\n';
    instructions += '    "Second paragraph...",\n';
    instructions += '    ...\n';
    instructions += '  ],\n';
    instructions += '  "moral": "Optional lesson or moral (if applicable)"\n';
    instructions += '}\n';
    instructions += '```\n\n';
    instructions += `Ensure the story has ${length.metadata.paragraph_count_min}-${paraCount} paragraphs.\n`;
    instructions += 'Each paragraph should be complete and engaging.\n';
    instructions += 'The title should be catchy and appropriate for the story.\n';

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
