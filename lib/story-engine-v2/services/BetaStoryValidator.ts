/**
 * Beta Story Validator
 * Validates OpenAI responses for Beta Story Engine
 * Ensures proper structure with scenes and Disney Pixar illustration prompts
 */

import type { BetaStoryOpenAIResponse, BetaValidationResult } from '../types/beta-story-types';

export class BetaStoryValidator {
  /**
   * Validate a Beta story response from OpenAI
   */
  static validate(data: any, options: { requireIllustrations?: boolean } = {}): BetaValidationResult {
    const errors: string[] = [];
    const warnings: string[] = [];

    // Check if data exists
    if (!data) {
      errors.push('No data provided for validation');
      return { isValid: false, errors, warnings };
    }

    // Validate title
    if (!data.title || typeof data.title !== 'string') {
      errors.push('Missing or invalid title');
    } else if (data.title.length < 3) {
      errors.push('Title is too short (minimum 3 characters)');
    } else if (data.title.length > 100) {
      errors.push('Title is too long (maximum 100 characters)');
    }

    // Validate scenes array
    if (!Array.isArray(data.scenes)) {
      errors.push('Missing or invalid scenes array');
      return { isValid: false, errors, warnings };
    }

    // Check scene count
    if (data.scenes.length !== 8) {
      errors.push(`Story must have exactly 8 scenes, but has ${data.scenes.length}`);
    }

    // Validate each scene
    data.scenes.forEach((scene: any, index: number) => {
      const sceneNum = index + 1;

      // Validate paragraph
      if (!scene.paragraph || typeof scene.paragraph !== 'string') {
        errors.push(`Scene ${sceneNum}: Missing or invalid paragraph`);
      } else {
        const wordCount = scene.paragraph.split(/\s+/).length;
        if (wordCount < 10) {
          warnings.push(`Scene ${sceneNum}: Paragraph seems very short (${wordCount} words)`);
        }
        if (wordCount > 300) {
          warnings.push(`Scene ${sceneNum}: Paragraph seems very long (${wordCount} words)`);
        }
      }

      // Validate charactersInScene
      if (!Array.isArray(scene.charactersInScene)) {
        errors.push(`Scene ${sceneNum}: Missing or invalid charactersInScene array`);
      } else if (scene.charactersInScene.length === 0) {
        warnings.push(`Scene ${sceneNum}: No characters listed in scene`);
      } else {
        // Check that all are strings
        scene.charactersInScene.forEach((char: any, charIndex: number) => {
          if (typeof char !== 'string') {
            errors.push(`Scene ${sceneNum}: Character ${charIndex + 1} is not a string`);
          }
        });
      }

      // Validate illustrationPrompt
      if (!scene.illustrationPrompt || typeof scene.illustrationPrompt !== 'string') {
        errors.push(`Scene ${sceneNum}: Missing or invalid illustrationPrompt`);
      } else {
        // Check for required Disney Pixar format elements
        const prompt = scene.illustrationPrompt;
        if (!prompt.toLowerCase().includes('disney pixar')) {
          warnings.push(`Scene ${sceneNum}: Illustration prompt may be missing "Disney pixar" style`);
        }
        if (!prompt.includes('CHARACTERS:') && !prompt.includes('Characters:')) {
          warnings.push(`Scene ${sceneNum}: Illustration prompt may be missing CHARACTERS section`);
        }
        if (!prompt.includes('SETTING:') && !prompt.includes('Setting:')) {
          warnings.push(`Scene ${sceneNum}: Illustration prompt may be missing SETTING section`);
        }
        if (!prompt.includes('ACTIONS:') && !prompt.includes('Actions:')) {
          warnings.push(`Scene ${sceneNum}: Illustration prompt may be missing ACTIONS section`);
        }
      }
    });

    // Validate moral (optional but recommended)
    if (data.moral) {
      if (typeof data.moral !== 'string') {
        errors.push('Moral must be a string');
      } else if (data.moral.length > 200) {
        warnings.push('Moral is quite long (over 200 characters)');
      }
    }

    // Validate cover illustration prompt
    if (options.requireIllustrations) {
      if (!data.coverIllustrationPrompt || typeof data.coverIllustrationPrompt !== 'string') {
        errors.push('Missing or invalid coverIllustrationPrompt');
      } else {
        const coverPrompt = data.coverIllustrationPrompt;
        if (!coverPrompt.toLowerCase().includes('disney pixar')) {
          warnings.push('Cover illustration prompt may be missing "Disney pixar" style');
        }
        if (!coverPrompt.toLowerCase().includes('cover')) {
          warnings.push('Cover illustration prompt may be missing "cover" reference');
        }
      }
    }

    const isValid = errors.length === 0;
    const story: BetaStoryOpenAIResponse | undefined = isValid ? (data as BetaStoryOpenAIResponse) : undefined;

    return {
      isValid,
      errors,
      warnings,
      story,
    };
  }

  /**
   * Extract JSON from OpenAI response text
   * Handles markdown code blocks and common formatting issues
   */
  static extractJSON(text: string): any {
    try {
      // Remove markdown code blocks
      let cleaned = text.replace(/```json\s*/g, '').replace(/```\s*/g, '');

      // Try to find JSON object boundaries
      const firstBrace = cleaned.indexOf('{');
      const lastBrace = cleaned.lastIndexOf('}');

      if (firstBrace === -1 || lastBrace === -1) {
        throw new Error('No JSON object found in response');
      }

      cleaned = cleaned.substring(firstBrace, lastBrace + 1);

      // Try to parse as-is first
      try {
        const parsed = JSON.parse(cleaned);
        console.log('✅ JSON parsed successfully without repairs');
        return parsed;
      } catch (firstError) {
        // If that fails, try fixing common issues
        console.log('⚠️ Initial JSON parse failed, attempting repairs...');
        console.log('Parse error:', (firstError as Error).message);

        // Strategy: Fix newlines character by character, being careful about escapes
        let fixed = '';
        let inString = false;
        let escapeNext = false;

        for (let i = 0; i < cleaned.length; i++) {
          const char = cleaned[i];
          const prevChar = i > 0 ? cleaned[i - 1] : '';

          if (escapeNext) {
            // This character is escaped, keep it as-is
            fixed += char;
            escapeNext = false;
            continue;
          }

          if (char === '\\') {
            // Next character will be escaped
            fixed += char;
            escapeNext = true;
            continue;
          }

          if (char === '"' && prevChar !== '\\') {
            // Toggle string state
            inString = !inString;
            fixed += char;
            continue;
          }

          if (inString && (char === '\n' || char === '\r')) {
            // Inside a string and found an actual newline - escape it
            if (char === '\r' && cleaned[i + 1] === '\n') {
              // Windows CRLF - skip the \r, we'll handle \n next
              continue;
            }
            fixed += '\\n';
            continue;
          }

          // Normal character, keep it
          fixed += char;
        }

        console.log('Attempting to parse repaired JSON...');
        const parsed = JSON.parse(fixed);
        console.log('✅ JSON repaired and parsed successfully');
        return parsed;
      }
    } catch (error) {
      console.error('❌ Failed to extract JSON from OpenAI response');
      console.error('Error:', (error as Error).message);
      console.error('Error stack:', (error as Error).stack);
      console.error('\n--- Raw text (first 1000 chars) ---');
      console.error(text.substring(0, 1000));
      console.error('\n--- Raw text (last 1000 chars) ---');
      console.error(text.substring(Math.max(0, text.length - 1000)));
      throw new Error('Invalid JSON in OpenAI response: ' + (error as Error).message);
    }
  }

  /**
   * Get user-friendly error message
   */
  static getErrorMessage(validationResult: BetaValidationResult): string {
    if (validationResult.isValid) {
      return '';
    }

    let message = 'Story validation failed:\n';
    validationResult.errors.forEach(error => {
      message += `- ${error}\n`;
    });

    if (validationResult.warnings.length > 0) {
      message += '\nWarnings:\n';
      validationResult.warnings.forEach(warning => {
        message += `- ${warning}\n`;
      });
    }

    return message;
  }

  /**
   * Log validation result for debugging
   */
  static logValidationResult(validationResult: BetaValidationResult): void {
    console.log('\n' + '='.repeat(80));
    console.log('BETA STORY VALIDATION RESULT');
    console.log('='.repeat(80));
    console.log('Valid:', validationResult.isValid);

    if (validationResult.errors.length > 0) {
      console.log('\nErrors:');
      validationResult.errors.forEach(error => console.log(`  - ${error}`));
    }

    if (validationResult.warnings.length > 0) {
      console.log('\nWarnings:');
      validationResult.warnings.forEach(warning => console.log(`  - ${warning}`));
    }

    if (validationResult.story) {
      console.log('\nStory Structure:');
      console.log(`  Title: ${validationResult.story.title}`);
      console.log(`  Scenes: ${validationResult.story.scenes.length}`);
      console.log(`  Moral: ${validationResult.story.moral ? 'Yes' : 'No'}`);
      console.log(`  Cover Prompt: ${validationResult.story.coverIllustrationPrompt ? 'Yes' : 'No'}`);
    }

    console.log('='.repeat(80) + '\n');
  }
}
