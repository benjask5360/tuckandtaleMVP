/**
 * V3 Story Prompt Builder
 *
 * Generates prompts for StoryEngine V3.
 * - Fun mode: Single clean prompt block, no appearance data
 * - Growth mode: Same clean structure, focused on behavior teaching
 */

import type { V3GenerationRequest, V3CharacterInfo } from '../types';

export class V3StoryPromptBuilder {
  /**
   * Build the complete story prompt for V3 engine
   */
  public buildPrompt(request: V3GenerationRequest): string {
    // Fun mode gets a single clean prompt block
    if (request.mode === 'fun') {
      return this.buildFunModePrompt(request);
    }

    // Growth mode uses the same clean structure
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
   * Get paragraph count for Growth mode (same as Fun mode)
   */
  private getGrowthParagraphCount(lengthName: string): number {
    const lengthLower = lengthName.toLowerCase();
    if (lengthLower === 'short') return 5;
    if (lengthLower === 'long') return 10;
    return 7; // medium
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
   * Build the Growth mode prompt - single clean block, same structure as Fun mode
   */
  private buildGrowthModePrompt(request: V3GenerationRequest): string {
    const hero = request.characters.find(c => c.role === 'hero') || request.characters[0];
    const supporting = request.characters.filter(c => c !== hero);
    const paragraphCount = this.getGrowthParagraphCount(request.length.name);

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

    // Build the behavior line
    let behaviorLine = '';
    if (request.growthTopic) {
      behaviorLine = `\nBehavior to teach: ${request.growthTopic.displayName}`;
      if (request.growthTopic.description) {
        behaviorLine += `\n${request.growthTopic.description}`;
      }
      behaviorLine += '\n';
    }

    // Build the single clean prompt
    let prompt = `Write a short behavior story starring ${hero.name}, a ${hero.age}-year-old ${heroType}.
${supportingLine}${behaviorLine}
Genre: ${request.genre.displayName}
Tone: ${request.tone.displayName}${request.tone.description ? ` - ${request.tone.description}` : ''}
Length: ${paragraphCount} paragraphs, each substantial enough to illustrate (roughly 60-80 words per paragraph)

What makes a good behavior story:
- Get to the challenge fast - by paragraph 2, not a long setup
- Show the behavior in action 2-3 times (not told, shown)
- Use realistic situations: playground arguments, sibling fights, bedtime struggles
- Physical sensations make it real: tight fists, deep breaths, counting to 5
- End with natural resolution - no "and ${hero.name} learned that..." preaching

Don't describe ${hero.name}'s appearance - that's handled separately.`;

    // Add custom instructions if present
    if (request.customInstructions) {
      prompt += `\n\nAdditional guidance: ${request.customInstructions}`;
    }

    prompt += `

Output as JSON:
{
  "title": "...",
  "paragraphs": ["...", "..."]
}`;

    // Log for debugging
    console.log('\n' + '='.repeat(80));
    console.log('V3 GROWTH MODE PROMPT');
    console.log('='.repeat(80));
    console.log(prompt);
    console.log('='.repeat(80) + '\n');

    return prompt;
  }

}
