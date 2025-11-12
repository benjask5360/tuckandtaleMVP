/**
 * Vignette Narrative Prompt Builder
 * Builds context object for OpenAI Vision API to generate story narratives
 */

import { VignetteNarrativeContext } from '@/lib/openai/vision-client';

export interface VignetteNarrativeParams {
  mode: 'fun' | 'growth';
  genre: string;                    // Display name from story_parameters
  tone: string;                     // Display name from story_parameters
  writingStyle: string;             // Display name from story_parameters (tone)
  moralLesson?: string;             // Display name from story_parameters (fun mode)
  moralLessonGuidance?: string;     // Prompt guidance from metadata
  growthCategory?: string;          // Display name from story_parameters (growth mode)
  growthTopic?: string;             // Display name from story_parameters (growth mode)
  growthTopicGuidance?: string;     // Prompt guidance from metadata
  customInstructions?: string;
  storyLength: 'short' | 'medium' | 'long';
  wordCountMin: number;             // From story_parameters metadata
  wordCountMax: number;             // From story_parameters metadata
  characterNames: string[];
  heroAge: number;
}

export class VignetteNarrativePromptBuilder {
  /**
   * Build context for Vision API from vignette parameters
   */
  static buildContext(params: VignetteNarrativeParams): VignetteNarrativeContext {
    // Calculate target word count for 8 panels (cover has no text)
    // Use middle of the range for target
    const totalWordCount = Math.floor((params.wordCountMin + params.wordCountMax) / 2);

    // Build context object
    const context: VignetteNarrativeContext = {
      mode: params.mode,
      genre: params.genre,
      tone: params.tone,
      writingStyle: params.writingStyle,
      storyLength: params.storyLength,
      wordCount: totalWordCount,
      characterNames: params.characterNames,
      heroAge: params.heroAge,
    };

    // Add mode-specific context
    if (params.mode === 'fun') {
      // Fun mode: Include moral lesson
      context.moralLesson = params.moralLesson;

      // Add prompt guidance if available for richer storytelling
      if (params.moralLessonGuidance) {
        const guidanceNote = `\n\nStory guidance: ${params.moralLessonGuidance}`;
        context.customInstructions = params.customInstructions
          ? `${params.customInstructions}${guidanceNote}`
          : guidanceNote.trim();
      } else if (params.customInstructions) {
        context.customInstructions = params.customInstructions;
      }
    } else {
      // Growth mode: Include growth area and specific topic
      context.growthArea = params.growthCategory;
      context.growthTopic = params.growthTopic;

      // Add prompt guidance if available
      if (params.growthTopicGuidance) {
        const guidanceNote = `\n\nGrowth guidance: ${params.growthTopicGuidance}`;
        context.customInstructions = params.customInstructions
          ? `${params.customInstructions}${guidanceNote}`
          : guidanceNote.trim();
      } else if (params.customInstructions) {
        context.customInstructions = params.customInstructions;
      }
    }

    console.log('[Narrative Prompt Builder] Built context:', {
      mode: context.mode,
      genre: context.genre,
      tone: context.tone,
      wordCount: context.wordCount,
      characterCount: context.characterNames.length,
      hasCustomInstructions: !!context.customInstructions,
    });

    return context;
  }

  /**
   * Extract word count range from story length parameter
   */
  static extractWordCountRange(lengthMetadata: any): {
    min: number;
    max: number;
  } {
    return {
      min: lengthMetadata?.word_count_min || 250,
      max: lengthMetadata?.word_count_max || 350,
    };
  }

  /**
   * Extract character names from character profiles
   */
  static extractCharacterNames(characters: Array<{ name: string }>): string[] {
    return characters
      .map((char) => char.name?.trim())
      .filter((name): name is string => !!name && name.length > 0);
  }

  /**
   * Extract hero age from character attributes
   */
  static extractHeroAge(hero: {
    attributes?: { age?: number | string };
  }): number {
    const age = hero.attributes?.age;

    if (typeof age === 'number') {
      return age;
    }

    if (typeof age === 'string') {
      const parsed = parseInt(age, 10);
      if (!isNaN(parsed) && parsed > 0 && parsed < 18) {
        return parsed;
      }
    }

    // Default to 6 years old if not specified
    return 6;
  }
}
