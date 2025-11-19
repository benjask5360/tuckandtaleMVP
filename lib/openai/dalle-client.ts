/**
 * OpenAI DALL-E 3 Client
 * Handles image generation via OpenAI DALL-E 3 API
 */

import OpenAI from 'openai';

export interface DallE3GenerationConfig {
  prompt: string;
  size?: '1024x1024' | '1792x1024' | '1024x1792';
  quality?: 'standard' | 'hd';
  style?: 'natural' | 'vivid';
  user?: string;
}

export interface DallE3GenerationResponse {
  imageData: string;      // base64 encoded image
  mimeType: string;
  revisedPrompt?: string; // OpenAI's safety-revised prompt
  cost: number;          // Calculated cost in USD
}

export class OpenAIDallEClient {
  private client: OpenAI;

  constructor(apiKey?: string) {
    this.client = new OpenAI({
      apiKey: apiKey || process.env.OPENAI_API_KEY,
    });
  }

  /**
   * Generate image using DALL-E 3
   */
  async generateImage(config: DallE3GenerationConfig): Promise<DallE3GenerationResponse> {
    const size = config.size || '1024x1024';
    const quality = config.quality || 'standard';
    const style = config.style || 'vivid';

    console.log('[DALL-E 3] Generating image with config:', {
      promptLength: config.prompt.length,
      size,
      quality,
      style,
    });

    const response = await this.client.images.generate({
      model: 'dall-e-3',
      prompt: config.prompt,
      size,
      quality,
      style,
      n: 1,
      response_format: 'b64_json', // Get base64 for direct upload
      user: config.user,
    });

    const imageData = response.data?.[0]?.b64_json;
    const revisedPrompt = response.data?.[0]?.revised_prompt;

    if (!imageData) {
      console.error('[DALL-E 3] No image data in response');
      throw new Error('No image data returned from DALL-E 3 API');
    }

    // Calculate cost based on size and quality
    const cost = this.calculateCost(size, quality);

    console.log('[DALL-E 3] Image generated successfully:', {
      dataSize: imageData.length,
      cost,
      revisedPrompt: revisedPrompt?.substring(0, 100) + '...',
    });

    return {
      imageData,
      mimeType: 'image/png', // DALL-E 3 always returns PNG
      revisedPrompt,
      cost,
    };
  }

  /**
   * Calculate cost based on DALL-E 3 pricing (2025)
   * Standard: 1024x1024 = $0.04, 1792x = $0.08
   * HD: 1024x1024 = $0.08, 1792x = $0.12
   */
  private calculateCost(
    size: '1024x1024' | '1792x1024' | '1024x1792',
    quality: 'standard' | 'hd'
  ): number {
    const pricing = {
      standard: {
        '1024x1024': 0.04,
        '1792x1024': 0.08,
        '1024x1792': 0.08,
      },
      hd: {
        '1024x1024': 0.08,
        '1792x1024': 0.12,
        '1024x1792': 0.12,
      },
    };

    return pricing[quality][size];
  }

  /**
   * Validate API key and connection
   */
  async validateConnection(): Promise<boolean> {
    try {
      const models = await this.client.models.list();
      return models.data.some((m) => m.id.includes('dall-e'));
    } catch (error) {
      console.error('[DALL-E 3] API validation failed:', error);
      return false;
    }
  }
}
