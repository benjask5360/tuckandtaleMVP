/**
 * Story Validator
 *
 * Comprehensive validation for story generation responses
 * Ensures data integrity and prevents JSON parsing errors
 */

export interface ParsedStory {
  title: string;
  paragraphs: string[];
  moral?: string | null;
  illustration_prompt?: string; // Must match story-types.ts
}

export interface ValidationResult {
  isValid: boolean;
  errors: string[];
  warnings: string[];
  data?: ParsedStory;
}

export class StoryValidator {
  private static readonly MIN_PARAGRAPH_LENGTH = 20; // Minimum characters per paragraph
  private static readonly MAX_PARAGRAPH_LENGTH = 2000; // Maximum characters per paragraph
  private static readonly EXPECTED_PARAGRAPH_COUNT = 8; // Expected number of scenes
  private static readonly MIN_TITLE_LENGTH = 3;
  private static readonly MAX_TITLE_LENGTH = 200;
  private static readonly MAX_MORAL_LENGTH = 500;
  private static readonly MAX_ILLUSTRATION_PROMPT_LENGTH = 1000;

  /**
   * Validates a parsed story object
   */
  static validate(data: any, options: { requireIllustrationPrompt?: boolean } = {}): ValidationResult {
    const errors: string[] = [];
    const warnings: string[] = [];

    // Check if data is an object
    if (!data || typeof data !== 'object') {
      errors.push('Story data must be an object');
      return { isValid: false, errors, warnings };
    }

    // Validate title
    if (!data.title) {
      errors.push('Story must have a title');
    } else if (typeof data.title !== 'string') {
      errors.push('Title must be a string');
    } else {
      const titleLength = data.title.trim().length;
      if (titleLength < this.MIN_TITLE_LENGTH) {
        errors.push(`Title is too short (minimum ${this.MIN_TITLE_LENGTH} characters)`);
      } else if (titleLength > this.MAX_TITLE_LENGTH) {
        errors.push(`Title is too long (maximum ${this.MAX_TITLE_LENGTH} characters)`);
      }

      // Check for placeholder text
      if (data.title.includes('[') && data.title.includes(']')) {
        warnings.push('Title appears to contain placeholder text');
      }
    }

    // Validate paragraphs
    if (!data.paragraphs) {
      errors.push('Story must have paragraphs');
    } else if (!Array.isArray(data.paragraphs)) {
      errors.push('Paragraphs must be an array');
    } else {
      // Check paragraph count
      if (data.paragraphs.length !== this.EXPECTED_PARAGRAPH_COUNT) {
        warnings.push(`Expected ${this.EXPECTED_PARAGRAPH_COUNT} paragraphs, got ${data.paragraphs.length}`);
      }

      // Validate each paragraph
      const validParagraphs: string[] = [];
      data.paragraphs.forEach((paragraph: any, index: number) => {
        if (typeof paragraph !== 'string') {
          errors.push(`Paragraph ${index + 1} must be a string`);
          return;
        }

        const trimmed = paragraph.trim();
        if (!trimmed) {
          errors.push(`Paragraph ${index + 1} is empty`);
          return;
        }

        if (trimmed.length < this.MIN_PARAGRAPH_LENGTH) {
          warnings.push(`Paragraph ${index + 1} is very short (${trimmed.length} characters)`);
        } else if (trimmed.length > this.MAX_PARAGRAPH_LENGTH) {
          errors.push(`Paragraph ${index + 1} is too long (${trimmed.length} characters, max ${this.MAX_PARAGRAPH_LENGTH})`);
        }

        // Check for embedded JSON
        if (this.looksLikeJSON(trimmed)) {
          errors.push(`Paragraph ${index + 1} appears to contain JSON data`);
        }

        // Check for placeholder text
        if (trimmed.includes('[') && trimmed.includes(']') && trimmed.includes('...')) {
          warnings.push(`Paragraph ${index + 1} appears to contain placeholder text`);
        }

        // Check if paragraph starts with expected scene format
        if (!trimmed.match(/^Scene \d+:/i) && index < this.EXPECTED_PARAGRAPH_COUNT) {
          warnings.push(`Paragraph ${index + 1} doesn't start with "Scene ${index + 1}:"`);
        }

        validParagraphs.push(trimmed);
      });

      // Update paragraphs with cleaned versions
      if (validParagraphs.length > 0) {
        data.paragraphs = validParagraphs;
      }
    }

    // Validate moral (optional)
    if (data.moral !== undefined && data.moral !== null) {
      if (typeof data.moral !== 'string') {
        errors.push('Moral must be a string if provided');
      } else if (data.moral.trim().length > this.MAX_MORAL_LENGTH) {
        errors.push(`Moral is too long (maximum ${this.MAX_MORAL_LENGTH} characters)`);
      } else if (data.moral.trim().length === 0) {
        warnings.push('Moral is empty');
        data.moral = null;
      }
    }

    // Validate illustration_prompt
    if (options.requireIllustrationPrompt && !data.illustration_prompt) {
      errors.push('Illustration prompt is required but not provided');
    }

    if (data.illustration_prompt !== undefined && data.illustration_prompt !== null) {
      if (typeof data.illustration_prompt !== 'string') {
        errors.push('Illustration prompt must be a string if provided');
        delete data.illustration_prompt; // Remove invalid value
      } else if (data.illustration_prompt.trim().length === 0) {
        warnings.push('Illustration prompt is empty');
        delete data.illustration_prompt; // Remove empty value
      } else if (data.illustration_prompt.trim().length > this.MAX_ILLUSTRATION_PROMPT_LENGTH) {
        errors.push(`Illustration prompt is too long (maximum ${this.MAX_ILLUSTRATION_PROMPT_LENGTH} characters)`);
      } else {
        // Clean up illustration prompt
        data.illustration_prompt = this.cleanIllustrationPrompt(data.illustration_prompt);
      }
    } else if (data.illustration_prompt === null) {
      // Convert null to undefined to match type expectations
      delete data.illustration_prompt;
    }

    // Check for unexpected fields that might indicate parsing issues
    const expectedFields = ['title', 'paragraphs', 'moral', 'illustration_prompt'];
    const unexpectedFields = Object.keys(data).filter(key => !expectedFields.includes(key));
    if (unexpectedFields.length > 0) {
      warnings.push(`Unexpected fields in story data: ${unexpectedFields.join(', ')}`);
    }

    const isValid = errors.length === 0;

    return {
      isValid,
      errors,
      warnings,
      data: isValid ? data as ParsedStory : undefined
    };
  }

  /**
   * Attempts to clean and extract JSON from a text response
   */
  static extractJSON(text: string): { json: any; cleaned: string } | null {
    if (!text || typeof text !== 'string') {
      return null;
    }

    let cleaned = text.trim();

    // Remove markdown code blocks (multiple patterns)
    // Pattern 1: ```json ... ```
    cleaned = cleaned.replace(/```json\s*\n?/gi, '');
    cleaned = cleaned.replace(/```\s*$/g, '');

    // Pattern 2: Generic ``` blocks
    cleaned = cleaned.replace(/^```\s*\n?/g, '');

    // Pattern 3: Inline code blocks that might wrap JSON
    if (cleaned.includes('```')) {
      const matches = cleaned.match(/```[\s\S]*?```/g);
      if (matches) {
        matches.forEach(match => {
          const content = match.replace(/```/g, '').trim();
          if (content.startsWith('{') || content.startsWith('[')) {
            cleaned = cleaned.replace(match, content);
          }
        });
      }
    }

    // Remove any remaining standalone ``` markers
    cleaned = cleaned.replace(/```/g, '');

    // Trim again after removing code blocks
    cleaned = cleaned.trim();

    // Check if it looks like JSON
    if (!cleaned.startsWith('{') && !cleaned.startsWith('[')) {
      // Try to find JSON in the text
      const jsonMatch = cleaned.match(/(\{[\s\S]*\}|\[[\s\S]*\])/);
      if (jsonMatch) {
        cleaned = jsonMatch[1];
      } else {
        return null;
      }
    }

    // Attempt to parse
    try {
      const json = JSON.parse(cleaned);
      return { json, cleaned };
    } catch (error) {
      // Try to fix common JSON issues
      try {
        // Fix trailing commas
        const fixed = cleaned.replace(/,(\s*[}\]])/g, '$1');
        const json = JSON.parse(fixed);
        return { json, cleaned: fixed };
      } catch {
        return null;
      }
    }
  }

  /**
   * Checks if a string looks like JSON
   */
  private static looksLikeJSON(str: string): boolean {
    const trimmed = str.trim();
    return (
      (trimmed.startsWith('{') && trimmed.endsWith('}')) ||
      (trimmed.startsWith('[') && trimmed.endsWith(']')) ||
      trimmed.includes('"title":') ||
      trimmed.includes('"paragraphs":') ||
      trimmed.includes('"moral":')
    );
  }

  /**
   * Cleans up illustration prompt text
   */
  private static cleanIllustrationPrompt(prompt: string): string {
    // Replace literal \n with actual newlines
    let cleaned = prompt.replace(/\\n/g, '\n');

    // Remove excessive whitespace
    cleaned = cleaned.replace(/\s+/g, ' ');

    // Trim
    cleaned = cleaned.trim();

    return cleaned;
  }

  /**
   * Validates that a string is valid JSON
   */
  static isValidJSON(str: string): boolean {
    try {
      JSON.parse(str);
      return true;
    } catch {
      return false;
    }
  }

  /**
   * Gets a user-friendly error message for JSON parsing errors
   */
  static getJSONErrorMessage(error: any): string {
    if (error instanceof SyntaxError) {
      const message = error.message;

      // Extract position information if available
      const positionMatch = message.match(/position (\d+)/i);
      if (positionMatch) {
        const position = parseInt(positionMatch[1]);
        return `Invalid JSON format at character position ${position}. The AI response may be malformed.`;
      }

      // Common JSON errors
      if (message.includes('Unexpected token')) {
        return 'Invalid JSON format: Unexpected character found. The AI response may contain invalid syntax.';
      }
      if (message.includes('Unexpected end')) {
        return 'Invalid JSON format: Response appears to be incomplete.';
      }
      if (message.includes('JSON.parse')) {
        return 'Failed to parse AI response as JSON. The response format may be incorrect.';
      }

      return `JSON parsing error: ${message}`;
    }

    return 'Failed to parse the story response. Please try again.';
  }
}