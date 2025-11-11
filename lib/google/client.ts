/**
 * Google Gemini AI Client
 * Handles image generation via Google Gemini 2.5 Flash Image (Nano Banana) API
 * Documentation: https://ai.google.dev/gemini-api/docs/imagen
 */

import { env } from '@/lib/env';

export interface GeminiGenerationConfig {
  prompt: string;
  aspectRatio?: '1:1' | '16:9' | '4:3' | '9:16';
  responseModalities?: ('Text' | 'Image')[];
}

export interface GeminiGenerationResponse {
  imageData: string; // base64 encoded image
  mimeType: string;
  tokensUsed: number; // Fixed at 1290 for images
}

export interface GeminiError {
  error: {
    code: number;
    message: string;
    status: string;
  };
}

export class GeminiClient {
  private apiKey: string;
  private baseUrl = 'https://generativelanguage.googleapis.com/v1beta';
  private modelName = 'gemini-2.5-flash-image';

  constructor(apiKey?: string) {
    this.apiKey = apiKey || env.GOOGLE_GEMINI_API_KEY;
    if (!this.apiKey) {
      throw new Error('Google Gemini API key is required');
    }
  }

  /**
   * Generate image using Gemini 2.5 Flash Image
   */
  async generateImage(config: GeminiGenerationConfig): Promise<GeminiGenerationResponse> {
    const requestBody = {
      contents: [{
        parts: [{ text: config.prompt }]
      }],
      generationConfig: {
        responseModalities: config.responseModalities || ['Image'],
        imageConfig: {
          aspectRatio: config.aspectRatio || '1:1'
        }
      }
    };

    console.log('[Gemini] Generating image with config:', {
      promptLength: config.prompt.length,
      aspectRatio: config.aspectRatio || '1:1',
    });

    const response = await fetch(
      `${this.baseUrl}/models/${this.modelName}:generateContent?key=${this.apiKey}`,
      {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
        },
        body: JSON.stringify(requestBody),
      }
    );

    if (!response.ok) {
      let errorDetails = `Status: ${response.status} ${response.statusText}`;
      try {
        const error: GeminiError = await response.json();
        errorDetails = `${error.error.message} (${error.error.code}: ${error.error.status})`;
        console.error('[Gemini] API error response:', error);
      } catch (e) {
        console.error('[Gemini] API error (unparseable response):', errorDetails);
      }
      throw new Error(`Gemini API error: ${errorDetails}`);
    }

    const data = await response.json();

    // Extract image data from response
    const imageData = data.candidates?.[0]?.content?.parts?.[0]?.inlineData?.data;
    const mimeType = data.candidates?.[0]?.content?.parts?.[0]?.inlineData?.mimeType || 'image/png';

    if (!imageData) {
      console.error('[Gemini] No image data in response:', JSON.stringify(data, null, 2));
      throw new Error('No image data returned from Gemini API');
    }

    console.log('[Gemini] Image generated successfully:', {
      mimeType,
      dataSize: imageData.length,
      tokensUsed: 1290,
    });

    return {
      imageData,
      mimeType,
      tokensUsed: 1290, // Fixed cost per image
    };
  }

  /**
   * Convert base64 image data to Blob
   */
  async downloadImage(base64Data: string, mimeType: string = 'image/png'): Promise<Blob> {
    // Remove data URL prefix if present
    const base64Clean = base64Data.replace(/^data:image\/\w+;base64,/, '');

    // Convert base64 to buffer
    const buffer = Buffer.from(base64Clean, 'base64');

    return new Blob([buffer], { type: mimeType });
  }

  /**
   * Validate API key and connection
   */
  async validateConnection(): Promise<boolean> {
    try {
      // Make a simple request to validate the API key
      const response = await fetch(
        `${this.baseUrl}/models/${this.modelName}?key=${this.apiKey}`,
        {
          method: 'GET',
          headers: {
            'Content-Type': 'application/json',
          },
        }
      );

      return response.ok;
    } catch (error) {
      console.error('[Gemini] API validation failed:', error);
      return false;
    }
  }
}
