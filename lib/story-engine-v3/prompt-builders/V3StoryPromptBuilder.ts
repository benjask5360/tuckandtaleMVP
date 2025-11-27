/**
 * V3 Story Prompt Builder
 *
 * Generates prompts for StoryEngine V3 with simplified output format.
 * Key differences from V2:
 * - No illustration prompts in the response (text-only Phase 1)
 * - Variable paragraph count based on length (not fixed 8)
 * - Simpler JSON output format
 */

import { createClient } from '@/lib/supabase/server';
import { mapSelectionsToEnhanced } from '@/lib/prompt-builders/descriptorMapper';
import { buildCharacterDescription } from '@/lib/prompt-builders/descriptionBuilder';
import type { V3GenerationRequest, V3CharacterInfo } from '../types';
import type { ProfileType, CharacterSelections } from '@/lib/descriptors/types';

export class V3StoryPromptBuilder {
  /**
   * Build the complete story prompt for V3 engine
   */
  public async buildPrompt(request: V3GenerationRequest): Promise<string> {
    const systemInstructions = this.getSystemInstructions(request.mode);
    const characterDescriptions = await this.buildCharacterContext(request.characters);
    const storyParameters = this.buildStoryParameters(request);
    const formatInstructions = this.buildResponseFormatInstructions(request);

    // Assemble the complete prompt
    let prompt = systemInstructions;
    prompt += '\n\n' + characterDescriptions;
    prompt += '\n\n' + storyParameters;

    if (request.customInstructions) {
      prompt += '\n\n' + this.buildCustomInstructions(request.customInstructions);
    }

    prompt += '\n\n' + formatInstructions;

    // Log the full prompt for debugging
    console.log('\n' + '='.repeat(80));
    console.log('V3 STORY GENERATION PROMPT');
    console.log('='.repeat(80));
    console.log(prompt);
    console.log('='.repeat(80) + '\n');

    return prompt;
  }

  /**
   * Get paragraph count range based on length
   */
  private getParagraphRange(lengthName: string): { min: number; max: number } {
    const lengthLower = lengthName.toLowerCase();
    if (lengthLower === 'short') {
      return { min: 6, max: 7 };
    } else if (lengthLower === 'long') {
      return { min: 10, max: 12 };
    }
    // Default to medium
    return { min: 8, max: 9 };
  }

  /**
   * Get system instructions based on mode (Fun or Growth)
   */
  private getSystemInstructions(mode: 'fun' | 'growth'): string {
    if (mode === 'growth') {
      return this.getGrowthModeInstructions();
    }
    return this.getFunModeInstructions();
  }

  /**
   * System instructions for Fun mode
   */
  private getFunModeInstructions(): string {
    return `# ROLE: Creative Children's Story Writer

You are an expert children's story writer specializing in imaginative, engaging bedtime stories.

Your stories:

**Spark Wonder & Imagination**
- Create magical moments and delightful surprises
- Use vivid, sensory descriptions that bring scenes to life
- Encourage children to dream big and explore their creativity

**Entertain & Engage**
- Keep the pace lively and the plot engaging
- Include moments of humor, excitement, or gentle suspense
- Create memorable scenes that children will want to revisit

**Warm & Heartfelt**
- End on a positive, uplifting note
- Show friendship, kindness, and courage naturally
- Make children feel safe, happy, and inspired

**Perfect for Bedtime**
- Balance excitement with a gentle, calming conclusion
- Create a satisfying story arc with a clear resolution
- Leave children feeling content and ready for sweet dreams

**Character Descriptions in Narrative**
- Do NOT include detailed physical descriptions (hair color, eye color, body type, etc.) for the provided characters
- Simply refer to them by name - physical details will be shown in illustrations later
- You MAY describe new characters you create within the story (e.g., a wizard they meet)

**Your mission:** Create a delightful story that entertains, inspires, and brings joy to young readers.`;
  }

  /**
   * System instructions for Growth mode
   */
  private getGrowthModeInstructions(): string {
    return `# ROLE: Educational Children's Story Writer

You are an expert children's story writer specializing in educational stories that help children learn and grow emotionally.

Your stories:

**Teach & Guide**
- Address the specified growth topic naturally within the story
- Show the hero learning and growing through experience
- Provide positive examples and gentle guidance

**Emotionally Supportive**
- Validate the child's feelings and experiences
- Show that challenges are normal and can be overcome
- Build confidence and emotional intelligence

**Age-Appropriate Learning**
- Use concepts and vocabulary suitable for the child's age
- Break down complex emotions into understandable experiences
- Provide practical examples children can relate to

**Engaging & Entertaining**
- Make learning fun through an engaging story
- Balance educational content with enjoyment
- Create memorable characters children can learn from

**Character Descriptions in Narrative**
- Do NOT include detailed physical descriptions (hair color, eye color, body type, etc.) for the provided characters
- Simply refer to them by name - physical details will be shown in illustrations later
- You MAY describe new characters you create within the story (e.g., a wizard they meet)

**Your mission:** Create an educational story that helps children learn important life skills while being entertained.`;
  }

  /**
   * Build character context section
   */
  private async buildCharacterContext(characters: V3CharacterInfo[]): Promise<string> {
    let characterText = '## CHARACTERS\n\n';

    const hero = characters.find(c => c.role === 'hero') || characters[0];
    const supporting = characters.filter(c => c !== hero);

    // Build hero description
    const heroDesc = await this.getCharacterAppearance(hero);
    characterText += `**${hero.name}** (the hero of our story):\n${heroDesc}\n`;

    // Build supporting character descriptions
    if (supporting.length > 0) {
      characterText += '\n**Supporting Characters:**\n';
      for (const char of supporting) {
        const desc = await this.getCharacterAppearance(char);
        // Only include relationship context (e.g., "Emma's brother"), not generic roles
        const label = char.relationship ? ` (${char.relationship})` : '';
        characterText += `- **${char.name}${label}**: ${desc}\n`;
      }
    }

    return characterText;
  }

  /**
   * Get character appearance description
   */
  private async getCharacterAppearance(character: V3CharacterInfo): Promise<string> {
    // If we already have appearance description, use it
    if (character.appearanceDescription) {
      return character.appearanceDescription;
    }

    // Fetch from database
    try {
      const supabase = await createClient();
      const { data: profile, error } = await supabase
        .from('character_profiles')
        .select('character_type, attributes, appearance_description')
        .eq('id', character.id)
        .single();

      if (error || !profile) {
        return character.name;
      }

      if (profile.appearance_description) {
        return profile.appearance_description;
      }

      // Build from attributes
      const profileType = profile.character_type as ProfileType;
      const selections = profile.attributes as CharacterSelections;
      const enhanced = await mapSelectionsToEnhanced(profileType, selections);
      const description = buildCharacterDescription(profileType, enhanced);

      return description;
    } catch (error) {
      console.error('Error fetching character appearance:', error);
      return character.name;
    }
  }

  /**
   * Build story parameters section
   */
  private buildStoryParameters(request: V3GenerationRequest): string {
    let params = '## STORY REQUIREMENTS\n\n';

    // Genre
    params += `**Genre:** ${request.genre.displayName}\n`;
    if (request.genre.description) {
      params += `(${request.genre.description})\n`;
    }

    // Tone/Style
    params += `\n**Tone/Style:** ${request.tone.displayName}\n`;
    if (request.tone.description) {
      params += `(${request.tone.description})\n`;
    }

    // Length with variable paragraph count
    const lengthMeta = request.length.metadata;
    const wordMin = lengthMeta?.wordsMin || lengthMeta?.word_count_min || 400;
    const wordMax = lengthMeta?.wordsMax || lengthMeta?.word_count_max || 600;
    const paragraphRange = this.getParagraphRange(request.length.name);

    params += `\n**Length:** ${request.length.displayName}\n`;
    params += `- Target: ${wordMin}-${wordMax} words total\n`;
    params += `- Structure: ${paragraphRange.min}-${paragraphRange.max} paragraphs\n`;
    params += `- Paragraph length: ${Math.round(wordMin / paragraphRange.min)}-${Math.round(wordMax / paragraphRange.max)} words per paragraph\n`;

    // Growth topic (if Growth mode)
    if (request.mode === 'growth' && request.growthTopic) {
      params += `\n**Growth Topic:** ${request.growthTopic.displayName}\n`;
      if (request.growthTopic.description) {
        params += `(${request.growthTopic.description})\n`;
      }
    }

    // Moral lesson (if provided)
    if (request.moralLesson) {
      params += `\n**Moral Lesson:** ${request.moralLesson.displayName}\n`;
      if (request.moralLesson.description) {
        params += `(${request.moralLesson.description})\n`;
      }
    }

    // Age appropriateness
    const heroAge = request.characters.find(c => c.role === 'hero')?.age;
    params += `\n**Age Appropriateness:** `;
    if (heroAge) {
      params += `Suitable for a ${heroAge}-year-old child. `;
      params += `Use age-appropriate vocabulary, themes, and concepts.\n`;
    } else {
      params += `Create a family-friendly story suitable for young children.\n`;
    }

    return params;
  }

  /**
   * Build custom instructions section
   */
  private buildCustomInstructions(instructions: string): string {
    return `## ADDITIONAL GUIDANCE\n\n${instructions}`;
  }

  /**
   * Build response format instructions (simplified for V3 - no illustration prompts)
   */
  private buildResponseFormatInstructions(request: V3GenerationRequest): string {
    const lengthMeta = request.length.metadata;
    const wordMin = lengthMeta?.wordsMin || lengthMeta?.word_count_min || 400;
    const wordMax = lengthMeta?.wordsMax || lengthMeta?.word_count_max || 600;
    const paragraphRange = this.getParagraphRange(request.length.name);
    const wordsPerParagraph = `${Math.round(wordMin / paragraphRange.min)}-${Math.round(wordMax / paragraphRange.max)}`;

    let instructions = '## OUTPUT FORMAT\n\n';
    instructions += `**CRITICAL: Write ${paragraphRange.min}-${paragraphRange.max} paragraphs.**\n\n`;

    instructions += 'Please respond with a JSON object in the following format:\n\n';
    instructions += '```json\n';
    instructions += '{\n';
    instructions += '  "title": "A Strong, Kid-Friendly Title",\n';
    instructions += '  "paragraphs": [\n';
    instructions += '    "First paragraph introducing the story and characters...",\n';
    instructions += '    "Second paragraph as the adventure begins...",\n';
    instructions += '    "... more paragraphs developing the story ...",\n';
    instructions += '    "Final paragraph with a satisfying conclusion..."\n';
    instructions += '  ],\n';
    instructions += '  "moral": "A brief statement of the lesson or moral (optional for fun mode)"\n';
    instructions += '}\n';
    instructions += '```\n\n';

    instructions += '**STORY STRUCTURE REQUIREMENTS:**\n';
    instructions += `- Include ${paragraphRange.min}-${paragraphRange.max} paragraphs in the paragraphs array\n`;
    instructions += `- Each paragraph should be approximately ${wordsPerParagraph} words\n`;
    instructions += `- Total story length: ${wordMin}-${wordMax} words\n`;
    instructions += '- Each paragraph should advance the story naturally\n';
    instructions += '- Create clear paragraph breaks - each paragraph is a distinct scene or moment\n\n';

    instructions += '**STORY ARC:**\n';
    if (request.mode === 'growth') {
      instructions += '- Opening paragraphs: Introduce the child and their situation\n';
      instructions += '- Middle paragraphs: Present and work through the challenge\n';
      instructions += '- Closing paragraphs: Resolution and reflection on what was learned\n\n';
    } else {
      instructions += '- Opening paragraphs: Setup and introduction\n';
      instructions += '- Middle paragraphs: Adventure and excitement\n';
      instructions += '- Closing paragraphs: Resolution and happy ending\n\n';
    }

    instructions += '**TITLE REQUIREMENTS:**\n';
    instructions += '- Create a strong, engaging, kid-friendly title\n';
    instructions += '- The title should capture the essence of the story\n';
    instructions += '- Avoid generic titles - make it memorable and specific to this story\n\n';

    instructions += '**MORAL (optional but encouraged):**\n';
    instructions += '- Include a brief moral or lesson that naturally fits the story\n';
    instructions += '- Keep it positive and age-appropriate\n';
    instructions += '- The moral should emerge from the story events, not feel forced\n';

    return instructions;
  }
}
