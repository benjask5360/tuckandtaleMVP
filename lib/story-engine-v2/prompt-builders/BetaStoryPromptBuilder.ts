/**
 * Beta Story Prompt Builder
 * Generates prompts for Beta Story Engine with per-scene Disney Pixar illustration prompts
 * Works for both Fun and Growth modes
 */

import { createClient } from '@/lib/supabase/server';
import { mapSelectionsToEnhanced } from '@/lib/prompt-builders/descriptorMapper';
import { buildCharacterDescription } from '@/lib/prompt-builders/descriptionBuilder';
import type { BetaStoryGenerationRequest, CharacterInfo } from '../types/beta-story-types';
import type { ProfileType, CharacterSelections } from '@/lib/descriptors/types';

export class BetaStoryPromptBuilder {
  /**
   * Build the complete story prompt for Beta engine
   */
  public async buildPrompt(request: BetaStoryGenerationRequest): Promise<string> {
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
    console.log('BETA STORY GENERATION PROMPT');
    console.log('='.repeat(80));
    console.log(prompt);
    console.log('='.repeat(80) + '\n');

    return prompt;
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

📖 **CRITICAL STRUCTURE REQUIREMENT:**
You MUST write stories in EXACTLY 8 scenes - no more, no less. Each scene should advance the story naturally through this arc:
- Scenes 1-2: Opening & Setup
- Scenes 3-4: Adventure Begins
- Scenes 5-6: Peak Adventure/Challenge
- Scenes 7-8: Resolution & Happy Ending

Your stories:

✨ **Spark Wonder & Imagination**
- Create magical moments and delightful surprises
- Use vivid, sensory descriptions that bring scenes to life
- Encourage children to dream big and explore their creativity

🎭 **Entertain & Engage**
- Keep the pace lively and the plot engaging
- Include moments of humor, excitement, or gentle suspense
- Create memorable scenes that children will want to revisit

❤️ **Warm & Heartfelt**
- End on a positive, uplifting note
- Show friendship, kindness, and courage naturally
- Make children feel safe, happy, and inspired

🌙 **Perfect for Bedtime**
- Balance excitement with a gentle, calming conclusion
- Create a satisfying story arc with a clear resolution
- Leave children feeling content and ready for sweet dreams

**Your mission:** Create a delightful 8-scene story that entertains, inspires, and brings joy to young readers.`;
  }

  /**
   * System instructions for Growth mode
   */
  private getGrowthModeInstructions(): string {
    return `# ROLE: Educational Children's Story Writer

You are an expert children's story writer specializing in educational stories that help children learn and grow emotionally.

📖 **CRITICAL STRUCTURE REQUIREMENT:**
You MUST write stories in EXACTLY 8 scenes - no more, no less. Each scene should guide the child through a learning journey:
- Scenes 1-2: Introduce the child and situation
- Scenes 3-4: Present the challenge or learning opportunity
- Scenes 5-6: Work through the challenge with support
- Scenes 7-8: Resolution and reflection on what was learned

Your stories:

🌱 **Teach & Guide**
- Address the specified growth topic naturally within the story
- Show the hero learning and growing through experience
- Provide positive examples and gentle guidance

💖 **Emotionally Supportive**
- Validate the child's feelings and experiences
- Show that challenges are normal and can be overcome
- Build confidence and emotional intelligence

🎯 **Age-Appropriate Learning**
- Use concepts and vocabulary suitable for the child's age
- Break down complex emotions into understandable experiences
- Provide practical examples children can relate to

✨ **Engaging & Entertaining**
- Make learning fun through an engaging story
- Balance educational content with enjoyment
- Create memorable characters children can learn from

**Your mission:** Create an 8-scene educational story that helps children learn important life skills while being entertained.`;
  }

  /**
   * Build character context section
   */
  private async buildCharacterContext(characters: CharacterInfo[]): Promise<string> {
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
        // Use relationship if available (for siblings), otherwise use role
        const label = char.relationship
          ? ` (${char.relationship})`
          : (char.role ? ` (${char.role})` : '');
        characterText += `- **${char.name}${label}**: ${desc}\n`;
      }
    }

    return characterText;
  }

  /**
   * Get character appearance description
   */
  private async getCharacterAppearance(character: CharacterInfo): Promise<string> {
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
  private buildStoryParameters(request: BetaStoryGenerationRequest): string {
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

    // Length
    const lengthMeta = request.length.metadata;
    const wordMin = lengthMeta?.wordsMin || lengthMeta?.word_count_min || 400;
    const wordMax = lengthMeta?.wordsMax || lengthMeta?.word_count_max || 600;

    params += `\n**Length:** ${request.length.displayName}\n`;
    params += `- Target: ${wordMin}-${wordMax} words\n`;
    params += `- Structure: Exactly 8 scenes/paragraphs\n`;
    params += `- Scene length: ${Math.round(wordMin/8)}-${Math.round(wordMax/8)} words per scene\n`;

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
   * Build response format instructions with Disney Pixar per-scene prompts
   */
  private buildResponseFormatInstructions(request: BetaStoryGenerationRequest): string {
    const lengthMeta = request.length.metadata;
    const wordMin = lengthMeta?.wordsMin || lengthMeta?.word_count_min || 400;
    const wordMax = lengthMeta?.wordsMax || lengthMeta?.word_count_max || 600;
    const wordsPerScene = `${Math.round(wordMin/8)}-${Math.round(wordMax/8)}`;

    // Get character names and appearance for example
    const hero = request.characters.find(c => c.role === 'hero') || request.characters[0];
    const heroName = hero.name;

    let instructions = '## OUTPUT FORMAT\n\n';
    instructions += '**CRITICAL: You MUST create exactly 8 scenes. No more, no less.**\n';
    instructions += '**CRITICAL: Keep illustration prompts CONCISE (max 150-200 words each) to fit within token limits.**\n\n';

    instructions += 'Please respond with a JSON object in the following format:\n\n';
    instructions += '```json\n';
    instructions += '{\n';
    instructions += '  "title": "The Magical Adventure",\n';
    instructions += '  "scenes": [\n';
    instructions += '    {\n';
    instructions += '      "paragraph": "Once upon a time, in a cozy little house, there lived a curious child who loved to explore...",\n';
    instructions += `      "charactersInScene": ["${heroName}"],\n`;
    instructions += '      "illustrationPrompt": "Disney pixar illustration. CHARACTERS: ' + heroName + ': curly brown hair, bright green eyes, 8-year-old, blue striped pajamas, small build. SETTING: Bedroom at night, moonlight through window. ACTIONS: - ' + heroName + ' sits up in bed - ' + heroName + ' looks at window. STYLE: Disney pixar"\n';
    instructions += '    },\n';
    instructions += '    // ... 6 more scenes ...\n';
    instructions += '    {\n';
    instructions += '      "paragraph": "And from that day forward, our hero knew that every adventure brings new discoveries...",\n';
    instructions += `      "charactersInScene": ["${heroName}"],\n`;
    instructions += '      "illustrationPrompt": "Disney pixar illustration. CHARACTERS: ' + heroName + ': curly brown hair, bright green eyes, 8-year-old, blue striped pajamas, small build. SETTING: Bedroom in morning, sunlight. ACTIONS: - ' + heroName + ' stands by window - ' + heroName + ' looks out. STYLE: Disney pixar"\n';
    instructions += '    }\n';
    instructions += '  ],\n';
    instructions += '  "moral": "Curiosity and courage help us discover wonderful things",\n';
    instructions += '  "coverIllustrationPrompt": "Disney pixar illustration. CHARACTERS: ' + heroName + ': curly brown hair, bright green eyes, 8-year-old, blue striped pajamas, small build. SETTING: Scene from story. ACTIONS: - ' + heroName + ' stands at center. STYLE: Disney pixar"\n';
    instructions += '}\n';
    instructions += '```\n\n';

    instructions += '**IMPORTANT REQUIREMENTS:**\n';
    instructions += '- You MUST include exactly 8 scenes in the scenes array\n';
    instructions += `- Each scene paragraph should be approximately ${wordsPerScene} words\n`;
    instructions += `- Total story length: ${wordMin}-${wordMax} words\n`;
    instructions += '- Each scene must have: paragraph, charactersInScene, illustrationPrompt\n';
    instructions += '- charactersInScene: Array of character names appearing in this specific scene\n';
    instructions += '- Each scene flows naturally into the next\n\n';

    instructions += '**ILLUSTRATION PROMPT FORMAT (CRITICAL):**\n';
    instructions += '⚠️ IMPORTANT: Each illustrationPrompt must be a SINGLE-LINE STRING in the JSON (no actual line breaks).\n\n';
    instructions += 'The prompt should follow this structure, but all on ONE line:\n\n';
    instructions += '```\n';
    instructions += 'Disney pixar illustration. CHARACTERS: {Name}: {hair color}, {eye color}, {age}, {clothing}, {size/build}. SETTING: {location and atmosphere}. ACTIONS: - {Action 1} - {Action 2} STYLE: Disney pixar\n';
    instructions += '```\n\n';
    instructions += 'Example (as a single-line string):\n';
    instructions += `"Disney pixar illustration. CHARACTERS: ${heroName}: curly brown hair, bright green eyes, 8-year-old, blue striped pajamas, small build. SETTING: Bedroom at night, moonlight. ACTIONS: - ${heroName} sits up in bed - ${heroName} looks at window. STYLE: Disney pixar"\n\n`;

    instructions += '**ILLUSTRATION PROMPT GUIDELINES:**\n';
    instructions += '- ⚠️ CRITICAL: Write the entire illustrationPrompt as ONE continuous string (no line breaks)\n';
    instructions += '- ⚠️ CRITICAL: Keep each illustrationPrompt CONCISE (max 150-200 words)\n';
    instructions += '- ⚠️ CRITICAL: ALWAYS include HAIR COLOR and EYE COLOR for EVERY character in EVERY scene\n';
    instructions += '- ⚠️ CRITICAL: Each character has their OWN appropriate clothing that stays IDENTICAL across ALL 8 scenes + cover\n';
    instructions += '- Character description format: "{hair color}, {eye color}, {age}, {specific clothing}, {build}"\n';
    instructions += '- Copy the EXACT hair color, eye color from the CHARACTERS section above\n';
    instructions += '- Give each character age-appropriate and gender-appropriate clothing\n';
    instructions += '- Clothing must be SPECIFIC and IDENTICAL for that character across all scenes:\n';
    instructions += '  - Good examples: "blue striped pajamas", "red hoodie and jeans", "yellow sundress with white flowers"\n';
    instructions += '  - Bad examples: "pajamas" (too vague), "casual clothes" (changes between scenes)\n';
    instructions += '- DO NOT vary a character\'s clothing between scenes - each character wears their same outfit in all 8 scenes\n';
    instructions += '- Keep character descriptions SHORT and CONSISTENT\n';
    instructions += '- Keep SETTING to 1 SHORT sentence maximum (e.g., "Forest clearing, oak trees" NOT "Magical forest bathed in golden sunlight")\n';
    instructions += '- Limit ACTIONS to 2-3 brief bullet points - just the action, no adverbs\n';
    instructions += '- DO NOT add poetic or flowery language - be direct and visual\n';
    instructions += '- NO adjectives like "magical", "wonderful", "beautiful", "cozy", "warm", "bright", "golden" unless describing actual color\n';
    instructions += '- NO emotional descriptors like "excited", "happy", "worried", "confidently", "eagerly", "joyfully"\n';
    instructions += '- Describe ONLY what is visible - no feelings, emotions, or atmosphere\n';
    instructions += '- Each scene should visually match what happens in the paragraph\n';
    instructions += '- Always end with "STYLE: Disney pixar"\n';
    instructions += '- DO NOT use actual line breaks (\\n) in the illustrationPrompt string\n\n';

    instructions += '**COVER ILLUSTRATION PROMPT:**\n';
    instructions += '- Should capture the essence of the entire story\n';
    instructions += '- Feature the hero prominently in a central, iconic pose\n';
    instructions += '- Use the EXACT SAME format as scene illustration prompts\n';
    instructions += '- Start with "Disney pixar illustration" (NOT "book cover" - that creates text)\n';
    instructions += '- End with "STYLE: Disney pixar" (NOT "storybook cover")\n';
    instructions += '- Keep clothing, hair color, and eye color IDENTICAL to all scene prompts\n';

    return instructions;
  }
}
