/**
 * Growth Story Prompt Builder
 * Generates prompts for "Help My Child Grow" mode stories
 * Focus: Educational narratives that teach values, emotions, and life skills
 */

import { BaseStoryPromptBuilder } from './baseStoryPromptBuilder';
import type { PromptBuildContext, GrowthTopic } from '../types/story-types';

export class GrowthStoryPromptBuilder extends BaseStoryPromptBuilder {
  /**
   * System instructions for Growth mode
   * Emphasizes teaching, emotional intelligence, and gentle guidance
   */
  protected getSystemInstructions(): string {
    return `# ROLE: Educational Children's Story Writer

You are an expert children's story writer specializing in educational narratives that teach values, emotions, and life skills.

📖 **CRITICAL STRUCTURE REQUIREMENT:**
You MUST write stories in EXACTLY 8 scenes - no more, no less. Each scene should advance the learning journey through this arc:
- Scenes 1-2: Setup & Context (Introduce character and situation)
- Scenes 3-4: Challenge Emerges (Present the learning opportunity)
- Scenes 5-6: Working Through It (Show struggle and support)
- Scenes 7-8: Growth & Resolution (Apply learning and reflect)

Your stories:

📚 **Teach Through Story**
- Embed learning moments naturally within the narrative
- Show rather than tell - demonstrate concepts through character actions
- Make lessons feel organic, not preachy
- Help children understand and relate to the teaching moment

❤️ **Emotional Intelligence**
- Name and validate emotions clearly
- Show healthy ways to express and cope with feelings
- Demonstrate empathy and perspective-taking
- Normalize struggles while showing paths forward

🌱 **Support Growth**
- Show characters making mistakes and learning from them
- Celebrate small wins and efforts, not just outcomes
- Model problem-solving and resilience
- End with a sense of capability and growth

🎯 **Age-Appropriate Guidance**
- Use clear, concrete examples children can understand
- Break down complex concepts into simple, relatable moments
- Validate the child's experience while gently guiding growth
- Keep the tone warm, supportive, and encouraging

**Your mission:** Create an 8-scene story that helps children grow emotionally, socially, and personally while remaining engaging and enjoyable.`;
  }

  /**
   * Override buildPrompt to add Growth-specific elements
   */
  public async buildPrompt(context: PromptBuildContext): Promise<string> {
    // Get base prompt
    let prompt = await super.buildPrompt(context);

    // Add growth topic guidance
    if (context.growthTopic) {
      prompt += '\n\n' + this.buildGrowthTopicGuidance(context.growthTopic);
    }

    // Add growth-specific story structure
    prompt += '\n\n' + this.buildGrowthStoryStructure();

    // Add emotional validation guidance
    prompt += '\n\n' + this.buildEmotionalGuidance(context);

    return prompt;
  }

  /**
   * Build specific guidance for the growth topic
   */
  private buildGrowthTopicGuidance(topic: GrowthTopic): string {
    let guidance = '## LEARNING FOCUS\n\n';

    guidance += `**Topic:** ${topic.display_name}\n`;

    if (topic.description) {
      guidance += `**Goal:** ${topic.description}\n\n`;
    }

    // Category context
    if (topic.metadata.category) {
      guidance += `**Category:** ${topic.metadata.category}\n\n`;
    }

    // Specific prompt guidance from database
    if (topic.metadata.prompt_guidance) {
      guidance += `**Teaching Approach:**\n${topic.metadata.prompt_guidance}\n\n`;
    }

    // Add general teaching principles
    guidance += `**Teaching Principles:**
- Show the character experiencing the challenge naturally
- Demonstrate the concept through actions and consequences
- Include a supportive friend, family member, or mentor if helpful
- Make the lesson feel like a natural part of the story
- End with the character feeling capable and understood
- Include a gentle moral or takeaway that reinforces the lesson`;

    return guidance;
  }

  /**
   * Build story structure guidance for Growth mode
   */
  private buildGrowthStoryStructure(): string {
    return `## 8-SCENE STRUCTURE FOR GROWTH

Remember: You MUST create exactly 8 scenes. Here's how to distribute the learning journey:

**Scenes 1-2: Setup & Context**
- Scene 1: Introduce the character in their everyday life
- Scene 2: Establish the situation that will lead to the learning moment

**Scenes 3-4: Challenge Emerges**
- Scene 3: Present the specific challenge related to the growth topic
- Scene 4: Show the character's initial struggle or confusion with realistic emotions

**Scenes 5-6: Working Through It**
- Scene 5: Show an attempted solution (that may not work perfectly)
- Scene 6: Moment of realization, support, or new perspective from others

**Scenes 7-8: Growth & Resolution**
- Scene 7: Character tries the new approach and sees positive results
- Scene 8: Reflection showing growth, with a gentle moral that feels encouraging

Each scene should naturally flow into the next while maintaining the educational focus.`;
  }

  /**
   * Build emotional guidance for the story
   */
  private buildEmotionalGuidance(context: PromptBuildContext): string {
    let guidance = '## EMOTIONAL GUIDANCE\n\n';

    guidance += `**Age Considerations (${context.heroAge} years old):**\n`;
    guidance += this.getAgeAppropriateGuidance(context.heroAge);

    guidance += '\n\n**Emotional Validation:**\n';
    guidance += '- Name feelings explicitly when characters experience them\n';
    guidance += '- Show that all feelings are okay, even difficult ones\n';
    guidance += '- Demonstrate healthy ways to express emotions\n';
    guidance += '- Include self-talk or supportive dialogue from others\n';
    guidance += '- Show that making mistakes is part of learning\n';

    guidance += '\n\n**Language to Use:**\n';
    guidance += '- "It\'s okay to feel..." (validating)\n';
    guidance += '- "You can try..." (empowering)\n';
    guidance += '- "Sometimes we all..." (normalizing)\n';
    guidance += '- "Let\'s..." (collaborative problem-solving)\n';
    guidance += '- Clear emotion words: happy, sad, angry, scared, worried, excited, proud\n';

    return guidance;
  }

  /**
   * Get age-appropriate guidance based on hero's age
   */
  private getAgeAppropriateGuidance(age: number): string {
    if (age <= 3) {
      return `- Use very simple language and concrete concepts
- Focus on basic emotions: happy, sad, mad, scared
- Keep the lesson very straightforward
- Use repetition to reinforce concepts
- Include comforting elements and predictability`;
    } else if (age <= 5) {
      return `- Use simple vocabulary with some emotion words
- Include cause-and-effect that's easy to understand
- Show clear choices and consequences
- Model basic problem-solving
- Emphasize feelings and friendship`;
    } else if (age <= 7) {
      return `- Use richer vocabulary and more complex emotions
- Include simple reasoning and thinking through problems
- Show characters considering others' perspectives
- Demonstrate multi-step problem-solving
- Include concepts of fairness, kindness, and responsibility`;
    } else if (age <= 10) {
      return `- Use more sophisticated language and concepts
- Include complex emotions and social situations
- Show internal thought processes and decision-making
- Demonstrate resilience and growth mindset
- Address more complex social dynamics and values`;
    } else {
      return `- Use age-appropriate depth and complexity
- Address relevant pre-teen challenges
- Include nuanced emotional and social concepts
- Show mature problem-solving and perspective-taking
- Honor the child's growing independence and capability`;
    }
  }

  /**
   * Add category-specific guidance
   */
  private getCategoryGuidance(category: string): string | null {
    const guidance: Record<string, string> = {
      'Social Skills': `- Show realistic social interactions
- Demonstrate communication and cooperation
- Include problem-solving with peers
- Model asking for help and offering help`,

      'Emotional Intelligence': `- Name and normalize emotions clearly
- Show healthy coping strategies
- Demonstrate emotional regulation
- Include moments of self-awareness`,

      'Daily Routines': `- Make routines feel positive and empowering
- Show the benefits of the routine
- Include autonomy and choice where possible
- Keep the tone encouraging, not controlling`,

      'Confidence': `- Show the character trying despite fear
- Celebrate effort and courage, not just success
- Include supportive encouragement from others
- Demonstrate that mistakes are learning opportunities`,

      'Character Values': `- Show the value in action, not just words
- Include the positive consequences of good choices
- Make kindness and integrity feel rewarding
- Model the value naturally through the story`,
    };

    return guidance[category] || null;
  }
}
