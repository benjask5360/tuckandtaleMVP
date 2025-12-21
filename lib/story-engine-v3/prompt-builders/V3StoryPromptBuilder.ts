/**
 * V3 Story Prompt Builder
 *
 * Generates prompts for StoryEngine V3.
 * - Fun mode: Single clean prompt block, no appearance data
 * - Growth mode: Structured approach for behavior teaching
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
    // Fun mode gets a single clean prompt block
    if (request.mode === 'fun') {
      return this.buildFunModePrompt(request);
    }

    // Growth mode uses the structured approach
    return this.buildGrowthModePrompt(request);
  }

  /**
   * Get paragraph count for Fun mode
   */
  private getFunParagraphCount(lengthName: string): number {
    const lengthLower = lengthName.toLowerCase();
    if (lengthLower === 'short') return 5;
    if (lengthLower === 'long') return 10;
    return 7; // medium
  }

  /**
   * Get paragraph count range for Growth mode
   */
  private getGrowthParagraphRange(lengthName: string): { min: number; max: number } {
    const lengthLower = lengthName.toLowerCase();
    if (lengthLower === 'short') return { min: 6, max: 7 };
    if (lengthLower === 'long') return { min: 10, max: 12 };
    return { min: 8, max: 9 }; // medium
  }

  /**
   * Build the Fun mode prompt - single clean block, no appearance data
   */
  private buildFunModePrompt(request: V3GenerationRequest): string {
    const hero = request.characters.find(c => c.role === 'hero') || request.characters[0];
    const supporting = request.characters.filter(c => c !== hero);
    const paragraphCount = this.getFunParagraphCount(request.length.name);

    // Determine hero type description
    const heroType = this.getHeroTypeDescription(hero);

    // Build supporting characters line
    let supportingLine = '';
    if (supporting.length > 0) {
      const supportingDescriptions = supporting.map(c => {
        const desc = this.getSupportingCharacterDescription(c, hero);
        return `- ${c.name}, ${desc}`;
      });
      supportingLine = `\nAlso in this story:\n${supportingDescriptions.join('\n')}\n`;
    }

    // Build the single clean prompt
    let prompt = `Write a bedtime story starring ${hero.name}, a ${hero.age}-year-old ${heroType}.
${supportingLine}
Genre: ${request.genre.displayName}
Tone: ${request.tone.displayName}${request.tone.description ? ` - ${request.tone.description}` : ''}
Length: ${paragraphCount} paragraphs, each substantial enough to illustrate (roughly 80-100 words per paragraph)

What makes it memorable:
- One vivid scene they'll remember tomorrow
- Specific sensory details - not just "magical," but what does it smell like, sound like?
- ${hero.name} figures something out or makes a choice on their own
- Humor or warmth that feels earned
- A calm landing

Don't describe ${hero.name}'s appearance - that's handled separately. New characters you create are fair game.`;

    // Add custom instructions if present
    if (request.customInstructions) {
      prompt += `\n\nAdditional guidance: ${request.customInstructions}`;
    }

    prompt += `

Output as JSON:
{
  "title": "...",
  "paragraphs": ["...", "..."],
  "moral": "..." // only if it emerges naturally
}`;

    // Log for debugging
    console.log('\n' + '='.repeat(80));
    console.log('V3 FUN MODE PROMPT');
    console.log('='.repeat(80));
    console.log(prompt);
    console.log('='.repeat(80) + '\n');

    return prompt;
  }

  /**
   * Get a simple type description for the hero (no appearance details)
   * Uses gender + age to produce natural phrasing: "boy", "girl", "man", "woman"
   */
  private getHeroTypeDescription(hero: V3CharacterInfo): string {
    switch (hero.characterType) {
      case 'child':
        return this.getHumanTypeLabel(hero.gender, hero.age);
      case 'pet':
        return hero.species || 'pet';
      case 'magical_creature':
        return 'magical creature';
      case 'storybook_character':
        return 'character';
      default:
        return 'child';
    }
  }

  /**
   * Get natural human type label based on gender and age
   * boy/girl for children, man/woman for adults
   */
  private getHumanTypeLabel(gender?: string, age?: number): string {
    const isAdult = age && age >= 18;
    const normalizedGender = gender?.toLowerCase().trim();

    if (normalizedGender === 'male') {
      return isAdult ? 'man' : 'boy';
    }
    if (normalizedGender === 'female') {
      return isAdult ? 'woman' : 'girl';
    }
    return isAdult ? 'person' : 'child';
  }

  /**
   * Get a natural description for supporting characters
   * Examples: "her corgi", "her little brother", "Grandma Rose" (no desc needed)
   */
  private getSupportingCharacterDescription(char: V3CharacterInfo, hero: V3CharacterInfo): string {
    // Determine possessive pronoun based on hero's gender
    const possessive = hero.gender === 'male' ? 'his' :
                       hero.gender === 'female' ? 'her' : 'their';

    // Pets: use species for natural description
    if (char.characterType === 'pet') {
      if (char.species) {
        return `${possessive} ${char.species}`;
      }
      return `${possessive} pet`;
    }

    // Children: check if sibling relationship exists
    if (char.characterType === 'child') {
      // If relationship contains "brother" or "sister", use it naturally
      if (char.relationship) {
        // Convert "Emma's brother" → "her brother" or "her little brother"
        if (char.relationship.includes('brother')) {
          const modifier = this.getAgeModifier(char.age, hero.age);
          return modifier ? `${possessive} ${modifier} brother` : `${possessive} brother`;
        }
        if (char.relationship.includes('sister')) {
          const modifier = this.getAgeModifier(char.age, hero.age);
          return modifier ? `${possessive} ${modifier} sister` : `${possessive} sister`;
        }
      }
      // Default for child without sibling relationship
      if (char.gender === 'male') return `${possessive} friend`;
      if (char.gender === 'female') return `${possessive} friend`;
      return `${possessive} friend`;
    }

    // Magical creatures and storybook characters
    if (char.characterType === 'magical_creature') {
      return 'a magical creature';
    }
    if (char.characterType === 'storybook_character') {
      return 'a storybook friend';
    }

    // Fallback
    return `${possessive} companion`;
  }

  /**
   * Get age modifier for sibling descriptions: "little" or "big"
   */
  private getAgeModifier(siblingAge?: number, heroAge?: number): string | null {
    if (!siblingAge || !heroAge) return null;
    if (siblingAge < heroAge) return 'little';
    if (siblingAge > heroAge) return 'big';
    return null; // Same age, no modifier
  }

  /**
   * Build the Growth mode prompt - structured approach
   */
  private async buildGrowthModePrompt(request: V3GenerationRequest): Promise<string> {
    const systemInstructions = this.getGrowthModeInstructions();
    const characterDescriptions = await this.buildCharacterContext(request.characters);
    const storyParameters = this.buildGrowthStoryParameters(request);
    const formatInstructions = this.buildGrowthModeFormatInstructions(request);

    let prompt = systemInstructions;
    prompt += '\n\n' + characterDescriptions;
    prompt += '\n\n' + storyParameters;

    if (request.customInstructions) {
      prompt += '\n\n## ADDITIONAL GUIDANCE\n\n' + request.customInstructions;
    }

    prompt += '\n\n' + formatInstructions;

    // Log for debugging
    console.log('\n' + '='.repeat(80));
    console.log('V3 GROWTH MODE PROMPT');
    console.log('='.repeat(80));
    console.log(prompt);
    console.log('='.repeat(80) + '\n');

    return prompt;
  }

  /**
   * System instructions for Growth mode
   */
  private getGrowthModeInstructions(): string {
    return `# ROLE: Behavior Teaching Story Writer

Write clear, SHORT stories that teach one specific behavior through realistic examples.

**Show the exact behavior:**
- If teaching "gentle hands," show the character stopping, taking a breath, and using soft touches
- If teaching "sharing," show the character saying "You can have a turn for 5 minutes"
- Use the child's NAME when demonstrating (e.g., "Emma took three deep breaths")

**Use realistic situations:**
- Playground arguments, bedtime struggles, sibling fights, grocery store tantrums
- Show physical sensations: tight fists, racing heart, deep breaths, counting to 5
- Make it feel like something that happened TODAY, not a fantasy adventure

**Keep it short and clear:**
- One action or feeling per paragraph
- Simple sentences (avoid: "sparkled with wonder," "filled her heart with joy")
- Get to the behavior challenge by paragraph 2 — no long setups

**Avoid these mistakes:**
- Don't preach or explain lessons ("Emma learned that sharing is important")
- Don't use generic advice ("be kind," "try your best")
- Don't add fantasy elements unless directly related to the behavior
- Don't describe character appearances (handled separately)

The behavior IS the lesson. Show it in action 2-3 times. Make it repeatable.`;
  }

  /**
   * Build character context section (Growth mode only - includes appearance)
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
        const label = char.relationship ? ` (${char.relationship})` : '';
        characterText += `- **${char.name}${label}**: ${desc}\n`;
      }
    }

    return characterText;
  }

  /**
   * Get character appearance description (Growth mode only)
   */
  private async getCharacterAppearance(character: V3CharacterInfo): Promise<string> {
    if (character.appearanceDescription) {
      return character.appearanceDescription;
    }

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
   * Build story parameters for Growth mode
   */
  private buildGrowthStoryParameters(request: V3GenerationRequest): string {
    let params = '## STORY REQUIREMENTS\n\n';

    params += `**Genre:** ${request.genre.displayName}\n`;
    if (request.genre.description) {
      params += `(${request.genre.description})\n`;
    }

    params += `\n**Tone:** ${request.tone.displayName}`;
    if (request.tone.description) {
      params += `\n(${request.tone.description})\n`;
    } else {
      params += `\n`;
    }

    const lengthMeta = request.length.metadata;
    const wordMin = lengthMeta?.wordsMin || lengthMeta?.word_count_min || 400;
    const wordMax = lengthMeta?.wordsMax || lengthMeta?.word_count_max || 600;
    const paragraphRange = this.getGrowthParagraphRange(request.length.name);

    params += `\n**Length:** ${request.length.displayName}\n`;
    params += `- Target: ${wordMin}-${wordMax} words total\n`;
    params += `- Structure: ${paragraphRange.min}-${paragraphRange.max} paragraphs\n`;
    params += `- Paragraph length: ${Math.round(wordMin / paragraphRange.min)}-${Math.round(wordMax / paragraphRange.max)} words per paragraph\n`;

    if (request.growthTopic) {
      params += `\n**BEHAVIOR TO TEACH:** ${request.growthTopic.displayName}\n`;
      if (request.growthTopic.description) {
        params += `${request.growthTopic.description}\n`;
      }
      params += `\nShow this behavior in action 2-3 times. Use realistic situations the child actually faces.\n`;
    }

    const heroAge = request.characters.find(c => c.role === 'hero')?.age;
    if (heroAge) {
      params += `\n**For a ${heroAge}-year-old** - use age-appropriate vocabulary and themes.\n`;
    }

    return params;
  }

  /**
   * Structured format instructions for Growth mode
   */
  private buildGrowthModeFormatInstructions(request: V3GenerationRequest): string {
    const lengthMeta = request.length.metadata;
    const wordMin = lengthMeta?.wordsMin || lengthMeta?.word_count_min || 400;
    const wordMax = lengthMeta?.wordsMax || lengthMeta?.word_count_max || 600;
    const paragraphRange = this.getGrowthParagraphRange(request.length.name);
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
    instructions += '  ]\n';
    instructions += '}\n';
    instructions += '```\n\n';

    instructions += '**STORY STRUCTURE REQUIREMENTS:**\n';
    instructions += `- Include ${paragraphRange.min}-${paragraphRange.max} paragraphs in the paragraphs array\n`;
    instructions += `- Each paragraph should be approximately ${wordsPerParagraph} words\n`;
    instructions += `- Total story length: ${wordMin}-${wordMax} words\n`;
    instructions += '- Each paragraph should advance the story naturally\n';
    instructions += '- Create clear paragraph breaks - each paragraph is a distinct scene or moment\n\n';

    instructions += '**STORY STRUCTURE:**\n';
    instructions += '- Paragraphs 1-2: Child in realistic setting, challenge appears quickly\n';
    instructions += '- Paragraphs 3-5: Show the new behavior 2-3 times with increasing success\n';
    instructions += '- Final paragraphs: Natural resolution (no explaining, no "Emma learned that...")\n\n';

    instructions += '**TITLE REQUIREMENTS:**\n';
    instructions += '- Create a strong, engaging, kid-friendly title\n';
    instructions += '- The title should capture the essence of the story\n';
    instructions += '- AVOID the cliché pattern "[Name] and the [Noun]" (e.g., "Emma and the Magic Garden")\n\n';

    instructions += '**IMPORTANT: Do NOT include a "moral" field.**\n';
    instructions += 'The behavior demonstration is the lesson.\n';

    return instructions;
  }
}
