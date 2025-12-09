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

Write imaginative bedtime stories that feel FRESH and SPECIFIC.

**Be specific, not generic:**
- Instead of "sparkled," write: "glowed orange like a sunset" or "shimmered like soap bubbles"
- Instead of "magical forest," create: "a library where books whisper secrets" or "a backyard where shadows come alive at dusk"
- Ground fantasy in real sensory details: smells, sounds, textures

**Avoid overused patterns:**
- No made-up food names (Giggleberries, Laughlemons, Snugglefluff)
- No generic quests (find magical item → meet wizard → return home)
- No "everything sparkles/glows" — be precise about WHAT and HOW

**Keep it engaging and bedtime-ready:**
- Lively pacing with clear scene breaks
- Moments of humor, friendship, or gentle excitement
- Calm, satisfying ending (no cliffhangers)

**Character descriptions:**
- Do NOT describe character appearances (handled separately)
- Simply refer to them by name
- You MAY describe new characters you create in the story

Make it memorable. Make it specific. Make it theirs.`;
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
      params += `\n**BEHAVIOR TO TEACH:** ${request.growthTopic.displayName}\n`;
      if (request.growthTopic.description) {
        params += `${request.growthTopic.description}\n`;
      }
      params += `\nShow this behavior in action 2-3 times. Use realistic situations the child actually faces.\n`;
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

    instructions += '**STORY STRUCTURE:**\n';
    if (request.mode === 'growth') {
      instructions += '- Paragraphs 1-2: Child in realistic setting, challenge appears quickly\n';
      instructions += '- Paragraphs 3-5: Show the new behavior 2-3 times with increasing success\n';
      instructions += '- Final paragraphs: Natural resolution (no explaining, no "Emma learned that...")\n\n';
    } else {
      instructions += '- Opening: Introduce character and unique situation\n';
      instructions += '- Middle: Story developments with specific details\n';
      instructions += '- Ending: Satisfying, calming conclusion\n\n';
    }

    instructions += '**TITLE REQUIREMENTS:**\n';
    instructions += '- Create a strong, engaging, kid-friendly title\n';
    instructions += '- The title should capture the essence of the story\n';
    instructions += '- AVOID the cliché pattern "[Name] and the [Noun]" (e.g., "Emma and the Magic Garden")\n';
    instructions += '- Instead, try creative alternatives: action phrases, questions, playful wordplay, or evocative imagery\n';
    instructions += '- Examples of GOOD titles: "The Night the Stars Came Down", "How Lily Learned to Roar", "Moonbeam Wishes"\n\n';

    if (request.mode === 'growth') {
      instructions += '**IMPORTANT: Do NOT include a "moral" field.**\n';
      instructions += 'The behavior demonstration is the lesson.\n';
    } else if (request.moralLesson) {
      instructions += '**MORAL (optional):**\n';
      instructions += '- Include 1-2 sentence moral based on the lesson requested\n';
      instructions += '- Make it natural, not preachy\n';
    } else {
      instructions += '**MORAL (optional):**\n';
      instructions += '- You may include a brief moral if one naturally emerges\n';
    }

    return instructions;
  }
}
