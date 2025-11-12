/**
 * Fun Story Prompt Builder
 * Generates prompts for "Just for Fun" mode stories
 * Focus: Imaginative, engaging bedtime stories that spark wonder and joy
 */

import { BaseStoryPromptBuilder } from './baseStoryPromptBuilder';
import type { PromptBuildContext } from '../types/story-types';

export class FunStoryPromptBuilder extends BaseStoryPromptBuilder {
  /**
   * System instructions for Fun mode
   * Emphasizes creativity, wonder, and entertainment
   */
  protected getSystemInstructions(): string {
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
   * Override buildPrompt to add Fun-specific enhancements
   */
  public async buildPrompt(context: PromptBuildContext): Promise<string> {
    // Get base prompt from parent class
    let prompt = await super.buildPrompt(context);

    // Add Fun-specific creative spark
    prompt += '\n\n' + this.addCreativeGuidance(context);

    return prompt;
  }

  /**
   * Add creative guidance specific to Fun mode
   */
  private addCreativeGuidance(context: PromptBuildContext): string {
    let guidance = '## CREATIVE GUIDANCE\n\n';

    // Genre-specific fun elements
    const genreName = context.genre.name.toLowerCase();
    const genreGuidance = this.getGenreSpecificGuidance(genreName);
    if (genreGuidance) {
      guidance += genreGuidance + '\n\n';
    }

    // Tone-specific elements
    const toneName = context.tone.name.toLowerCase();
    const toneGuidance = this.getToneSpecificGuidance(toneName);
    if (toneGuidance) {
      guidance += toneGuidance + '\n\n';
    }

    // General creative encouragement
    guidance += '**Creative Freedom:**\n';
    guidance += '- Feel free to add magical elements, talking animals, or unexpected twists\n';
    guidance += '- Use rich, descriptive language that paints vivid pictures\n';
    guidance += '- Include sensory details (sights, sounds, feelings) to immerse readers\n';
    guidance += '- Create memorable moments that will stick with children\n';
    guidance += '- Balance action and emotion for a well-rounded story\n';

    return guidance;
  }

  /**
   * Get genre-specific guidance for Fun mode
   */
  private getGenreSpecificGuidance(genre: string): string | null {
    const guidance: Record<string, string> = {
      adventure: `**Adventure Elements:**
- Include an exciting quest or journey
- Add a challenge or mystery to solve
- Show bravery and resourcefulness
- Create a sense of discovery and achievement`,

      fantasy: `**Fantasy Elements:**
- Embrace magical creatures and enchanted places
- Create wonder through imaginative world-building
- Use magical solutions creatively
- Make the impossible feel possible and delightful`,

      fairy_tale: `**Fairy Tale Magic:**
- Include classic fairy tale elements (magic, transformations, wishes)
- Use repetition and patterns that children love
- Create a clear "good conquers all" resolution
- Add a sprinkle of timeless wisdom`,

      friendship: `**Friendship Focus:**
- Show friends helping each other
- Include moments of connection and understanding
- Demonstrate how friends make life more fun
- Celebrate the joy of companionship`,

      animals: `**Animal Adventures:**
- Give animal characters distinct personalities
- Show the natural world as exciting and welcoming
- Include animal behaviors in fun, creative ways
- Create bonds between human and animal characters`,

      space: `**Space Adventures:**
- Explore the wonder of stars, planets, and galaxies
- Include the thrill of discovery and exploration
- Make space feel both vast and friendly
- Add cosmic creativity and imagination`,

      family: `**Family Fun:**
- Show family members having adventures together
- Include moments of love, laughter, and connection
- Demonstrate how families support each other
- Create warm, cozy family moments`,
    };

    return guidance[genre] || null;
  }

  /**
   * Get tone-specific guidance for Fun mode
   */
  private getToneSpecificGuidance(tone: string): string | null {
    const guidance: Record<string, string> = {
      classic_bedtime: `**Classic Bedtime Tone:**
- Use gentle, soothing language as the story progresses
- Create a calm, peaceful conclusion
- Include comforting imagery (stars, moonlight, cozy places)
- End with a sense of safety and contentment`,

      pixar_adventure: `**Pixar-Style Storytelling:**
- Balance humor with heartfelt moments
- Include witty dialogue and fun character interactions
- Create visual scenes that would be exciting to watch
- Add emotional depth while keeping it light and fun`,

      disney_princess: `**Disney Princess Magic:**
- Include transformation or growth moments
- Add elegance and grace to descriptions
- Create magical, fairy tale-like settings
- End with dreams coming true`,

      funny_silly: `**Funny & Playful Tone:**
- Include humor, wordplay, and silly situations
- Create laugh-out-loud moments
- Use exaggeration for comic effect
- Keep the mood light and joyful throughout`,

      gentle_calming: `**Gentle & Calming Tone:**
- Use soft, peaceful language
- Create serene settings and quiet moments
- Include repetitive, soothing patterns
- Build a sense of security and tranquility`,

      rhyming_seuss: `**Rhyming & Rhythmic Style:**
- Create a strong, playful rhythm
- Use creative rhymes (don't force them, but make them fun)
- Include made-up words or fun sound patterns
- Keep the meter consistent for a bouncy feel`,
    };

    return guidance[tone] || null;
  }

}
