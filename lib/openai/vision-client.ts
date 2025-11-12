/**
 * OpenAI Vision API Client
 * Handles image analysis and narrative generation for vignette stories
 * Uses GPT-4o with vision capabilities
 */

import OpenAI from 'openai';

export interface VignetteNarrativeContext {
  mode: 'fun' | 'growth';
  genre: string;
  tone: string;
  writingStyle: string;
  moralLesson?: string;      // For fun mode
  growthArea?: string;        // For growth mode (e.g., "Emotional", "Self-Control")
  growthTopic?: string;       // For growth mode (e.g., "No Biting", "Sharing")
  customInstructions?: string;
  storyLength: 'short' | 'medium' | 'long';
  wordCount: number;          // Target word count for 8 narrative panels
  characterNames: string[];   // Names of characters in the story
  heroAge: number;            // Age of main character
}

export interface VignetteNarrativeResponse {
  storyTitle: string;
  coverPanel: number;         // Panel number (1-9) designated as cover
  narratives: Array<{
    panelNumber: number;      // Original panel number (1-9)
    order: number;            // Reading order (1-8)
    text: string;             // Narrative text
  }>;
}

export interface VisionAPIUsage {
  prompt_tokens: number;
  completion_tokens: number;
  total_tokens: number;
}

export class OpenAIVisionClient {
  private client: OpenAI;

  constructor(apiKey?: string) {
    this.client = new OpenAI({
      apiKey: apiKey || process.env.OPENAI_API_KEY,
    });
  }

  /**
   * Analyze vignette panoramic image and generate story narratives
   */
  async analyzeVignetteGrid(
    imageUrl: string,
    context: VignetteNarrativeContext
  ): Promise<{
    response: VignetteNarrativeResponse;
    usage: VisionAPIUsage;
    systemPrompt: string;
    userPrompt: string;
    rawResponse: string;
  }> {
    console.log('[Vision API] Analyzing vignette grid:', {
      imageUrl,
      mode: context.mode,
      genre: context.genre,
      storyLength: context.storyLength,
      wordCount: context.wordCount,
    });

    // Build comprehensive prompt
    const systemPrompt = this.buildSystemPrompt();
    const userPrompt = this.buildUserPrompt(context);

    try {
      const completion = await this.client.chat.completions.create({
        model: 'gpt-4o',
        messages: [
          {
            role: 'system',
            content: systemPrompt,
          },
          {
            role: 'user',
            content: [
              {
                type: 'text',
                text: userPrompt,
              },
              {
                type: 'image_url',
                image_url: {
                  url: imageUrl,
                  detail: 'high', // High detail for better analysis
                },
              },
            ],
          },
        ],
        temperature: 0.8,
        max_tokens: 4000,
        response_format: { type: 'json_object' },
      });

      const responseText = completion.choices[0]?.message?.content;
      if (!responseText) {
        throw new Error('No response from OpenAI Vision API');
      }

      const usage: VisionAPIUsage = {
        prompt_tokens: completion.usage?.prompt_tokens || 0,
        completion_tokens: completion.usage?.completion_tokens || 0,
        total_tokens: completion.usage?.total_tokens || 0,
      };

      console.log('[Vision API] Token usage:', usage);

      // Parse JSON response
      const parsedResponse = JSON.parse(responseText);
      const validatedResponse = this.validateAndNormalizeResponse(parsedResponse);

      console.log('[Vision API] Successfully generated narratives:', {
        storyTitle: validatedResponse.storyTitle,
        coverPanel: validatedResponse.coverPanel,
        narrativeCount: validatedResponse.narratives.length,
      });

      return {
        response: validatedResponse,
        usage,
        systemPrompt,
        userPrompt,
        rawResponse: responseText,
      };
    } catch (error: any) {
      console.error('[Vision API] Error:', error);
      throw new Error(`Vision API failed: ${error.message}`);
    }
  }

  /**
   * Build system prompt for Vision API
   */
  private buildSystemPrompt(): string {
    return `You are a children's storybook author analyzing a 3x3 grid of images to create a coherent story.

Your task:
1. Analyze the 9 images in the grid (numbered 1-9, left-to-right, top-to-bottom)
2. Designate ONE image as the storybook cover (choose the most visually appealing/representative)
3. Order the remaining 8 images into a logical story sequence
4. Write narrative text for each of the 8 story panels (NOT the cover)
5. Create a story title

CRITICAL RULES:
- The cover panel gets NO narrative text
- You MUST provide EXACTLY 8 narratives (one for each non-cover panel)
- Each narrative order number must be unique (1 through 8, no gaps)
- Each panel number (1-9) can only appear once (except the cover which has no narrative)
- The 8 story panels should have equal length narratives
- Reading level should match the hero's age
- Use character names provided by the user
- Follow the specified genre, tone, and writing style
- Include the moral lesson or growth topic naturally in the story
- Make the story coherent and engaging for children

OUTPUT FORMAT (JSON):
{
  "storyTitle": "The title of the story",
  "coverPanel": 5,  // Panel number (1-9) for cover
  "narratives": [
    {"panelNumber": 1, "order": 1, "text": "Once upon a time..."},
    {"panelNumber": 2, "order": 2, "text": "The adventure began..."},
    {"panelNumber": 3, "order": 3, "text": "..."},
    {"panelNumber": 4, "order": 4, "text": "..."},
    {"panelNumber": 6, "order": 5, "text": "..."},  // Panel 5 is cover, so skip it
    {"panelNumber": 7, "order": 6, "text": "..."},
    {"panelNumber": 8, "order": 7, "text": "..."},
    {"panelNumber": 9, "order": 8, "text": "..."}
  ]
}

IMPORTANT: The narratives array MUST contain exactly 8 items, no more, no less.`;
  }

  /**
   * Build user prompt with story context
   */
  private buildUserPrompt(context: VignetteNarrativeContext): string {
    const parts: string[] = [];

    // Story type and theme
    if (context.mode === 'fun') {
      parts.push(`Create a FUN story about ${context.moralLesson || 'friendship and adventure'}.`);
    } else {
      parts.push(
        `Create a GROWTH story helping children learn about ${context.growthTopic || context.growthArea}.`
      );
    }

    // Story parameters
    parts.push(`Genre: ${context.genre}`);
    parts.push(`Tone: ${context.tone}`);
    parts.push(`Writing Style: ${context.writingStyle}`);
    parts.push(
      `Target word count: ${context.wordCount} words total (approximately ${Math.round(context.wordCount / 8)} words per panel)`
    );

    // Character information
    if (context.characterNames.length > 0) {
      parts.push(`Characters: ${context.characterNames.join(', ')}`);
    }
    parts.push(`Hero age: ${context.heroAge} years old`);

    // Custom instructions
    if (context.customInstructions) {
      parts.push(`\nAdditional instructions: ${context.customInstructions}`);
    }

    // Final instructions
    parts.push(
      `\nAnalyze the 3x3 grid image, designate one panel as the cover, order the remaining 8 panels logically, and write engaging narrative text for EXACTLY 8 story panels (one narrative per non-cover panel).`
    );
    parts.push(
      `\nREMINDER: Your response must include exactly 8 narratives in the narratives array - one for each panel that is NOT the cover.`
    );

    return parts.join('\n');
  }

  /**
   * Validate and normalize API response
   */
  private validateAndNormalizeResponse(response: any): VignetteNarrativeResponse {
    // Validate structure
    if (!response.storyTitle || typeof response.storyTitle !== 'string') {
      throw new Error('Invalid response: missing or invalid storyTitle');
    }

    if (
      !response.coverPanel ||
      typeof response.coverPanel !== 'number' ||
      response.coverPanel < 1 ||
      response.coverPanel > 9
    ) {
      throw new Error('Invalid response: missing or invalid coverPanel');
    }

    if (!Array.isArray(response.narratives)) {
      throw new Error('Invalid response: narratives must be an array');
    }

    // Validate narratives
    if (response.narratives.length !== 8) {
      console.warn(
        `[Vision API] Expected 8 narratives, got ${response.narratives.length}. Attempting to normalize.`
      );
    }

    const validNarratives = response.narratives
      .filter((n: any, index: number) => {
        const isValid =
          typeof n.panelNumber === 'number' &&
          n.panelNumber >= 1 &&
          n.panelNumber <= 9 &&
          typeof n.order === 'number' &&
          n.order >= 1 &&
          n.order <= 8 &&
          typeof n.text === 'string' &&
          n.text.trim().length > 0;

        if (!isValid) {
          console.error(`[Vision API] Invalid narrative at index ${index}:`, {
            panelNumber: n.panelNumber,
            order: n.order,
            textLength: typeof n.text === 'string' ? n.text.length : 'not a string',
            narrative: n,
          });
        }

        return isValid;
      })
      .slice(0, 8); // Take only first 8 if more provided

    if (validNarratives.length < 8) {
      console.error('[Vision API] Full response that failed validation:', {
        storyTitle: response.storyTitle,
        coverPanel: response.coverPanel,
        totalNarratives: response.narratives?.length,
        validNarratives: validNarratives.length,
        allNarratives: response.narratives,
      });

      throw new Error(
        `Invalid response: only ${validNarratives.length} valid narratives found, need 8`
      );
    }

    return {
      storyTitle: response.storyTitle.trim(),
      coverPanel: response.coverPanel,
      narratives: validNarratives,
    };
  }

  /**
   * Validate API key and connection
   */
  async validateConnection(): Promise<boolean> {
    try {
      const models = await this.client.models.list();
      return models.data.some((m) => m.id === 'gpt-4o');
    } catch (error) {
      console.error('[Vision API] Connection validation failed:', error);
      return false;
    }
  }
}
