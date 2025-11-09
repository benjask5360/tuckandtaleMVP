/**
 * Leonardo AI Client
 * Handles image generation via Leonardo AI API
 * Documentation: https://docs.leonardo.ai/reference
 */

import { env } from '@/lib/env';

export interface LeonardoGenerationConfig {
  prompt: string;
  modelId: string;
  width?: number;
  height?: number;
  numImages?: number;
  guidanceScale?: number;
  numInferenceSteps?: number;
  scheduler?: string;
  negativePrompt?: string;
  sdVersion?: string;
  public?: boolean;
  tiling?: boolean;
}

export interface LeonardoGenerationResponse {
  generationId: string;
  status: 'PENDING' | 'PROCESSING' | 'COMPLETE' | 'FAILED';
  images?: Array<{
    id: string;
    url: string;
    nsfw: boolean;
  }>;
  creditCost?: number;
}

export interface LeonardoError {
  error: string;
  message: string;
  statusCode: number;
}

export class LeonardoClient {
  private apiKey: string;
  private baseUrl = 'https://cloud.leonardo.ai/api/rest/v1';
  private maxPollingAttempts = 30; // Max 60 seconds (2 sec intervals)
  private pollingInterval = 2000; // 2 seconds

  constructor(apiKey?: string) {
    this.apiKey = apiKey || env.LEONARDO_API_KEY;
    if (!this.apiKey) {
      throw new Error('Leonardo API key is required');
    }
  }

  /**
   * Initiate image generation
   */
  async generateImage(config: LeonardoGenerationConfig): Promise<{ generationId: string; apiCreditCost?: number }> {
    const requestBody: any = {
      prompt: config.prompt,
      modelId: config.modelId,
      width: config.width || 512,
      height: config.height || 768,
      num_images: config.numImages || 1,
      public: config.public || false,
    };

    // Only include optional parameters if they're provided
    if (config.guidanceScale !== undefined) requestBody.guidance_scale = config.guidanceScale;
    if (config.numInferenceSteps !== undefined) requestBody.num_inference_steps = config.numInferenceSteps;
    if (config.scheduler) requestBody.scheduler = config.scheduler;
    if (config.negativePrompt) requestBody.negative_prompt = config.negativePrompt;
    if (config.sdVersion) requestBody.sd_version = config.sdVersion;
    if (config.tiling !== undefined) requestBody.tiling = config.tiling;

    console.log('Leonardo API request:', JSON.stringify(requestBody, null, 2));

    const response = await fetch(`${this.baseUrl}/generations`, {
      method: 'POST',
      headers: {
        'Authorization': `Bearer ${this.apiKey}`,
        'Content-Type': 'application/json',
      },
      body: JSON.stringify(requestBody),
    });

    if (!response.ok) {
      let errorDetails = `Status: ${response.status} ${response.statusText}`;
      try {
        const error = await response.json();
        errorDetails = JSON.stringify(error, null, 2);
        console.error('Leonardo API error response:', errorDetails);
      } catch (e) {
        console.error('Leonardo API error (unparseable response):', errorDetails);
      }
      throw new Error(`Leonardo API error: ${errorDetails}`);
    }

    const data = await response.json();

    if (!data.sdGenerationJob?.generationId) {
      throw new Error('No generation ID returned from Leonardo API');
    }

    console.log('Leonardo generation POST response:', JSON.stringify(data.sdGenerationJob, null, 2));

    return {
      generationId: data.sdGenerationJob.generationId,
      apiCreditCost: data.sdGenerationJob.apiCreditCost,
    };
  }

  /**
   * Get generation status and images
   */
  async getGeneration(generationId: string): Promise<LeonardoGenerationResponse> {
    const response = await fetch(`${this.baseUrl}/generations/${generationId}`, {
      headers: {
        'Authorization': `Bearer ${this.apiKey}`,
      },
    });

    if (!response.ok) {
      const error: LeonardoError = await response.json();
      throw new Error(`Leonardo API error: ${error.message || response.statusText}`);
    }

    const data = await response.json();
    const generation = data.generations_by_pk;

    if (!generation) {
      throw new Error('Generation not found');
    }

    // Log the raw Leonardo response to debug credit cost
    console.log('Raw Leonardo API response:', JSON.stringify(data, null, 2));

    return {
      generationId: generation.id,
      status: generation.status,
      images: generation.generated_images?.map((img: any) => ({
        id: img.id,
        url: img.url,
        nsfw: img.nsfw || false,
      })) || [],
      creditCost: generation.apiCreditCost, // Changed from creditCost to apiCreditCost
    };
  }

  /**
   * Poll for generation completion with progress tracking
   */
  async pollGeneration(
    generationId: string,
    onProgress?: (progress: number, message: string) => void
  ): Promise<LeonardoGenerationResponse> {
    let attempts = 0;
    let lastStatus = 'PENDING';

    while (attempts < this.maxPollingAttempts) {
      try {
        const generation = await this.getGeneration(generationId);

        // Calculate progress (0-100)
        const progress = Math.min(
          95,
          Math.floor((attempts / this.maxPollingAttempts) * 100)
        );

        // Update progress callback
        if (onProgress) {
          const message = this.getProgressMessage(attempts, generation.status);
          onProgress(progress, message);
        }

        // Check status
        if (generation.status === 'COMPLETE') {
          if (onProgress) {
            onProgress(100, 'Avatar generated successfully!');
          }
          return generation;
        }

        if (generation.status === 'FAILED') {
          throw new Error('Image generation failed');
        }

        lastStatus = generation.status;
        attempts++;

        // Wait before next poll
        await new Promise(resolve => setTimeout(resolve, this.pollingInterval));
      } catch (error) {
        // If it's just a polling error, continue
        if (attempts < this.maxPollingAttempts - 1) {
          attempts++;
          await new Promise(resolve => setTimeout(resolve, this.pollingInterval));
          continue;
        }
        throw error;
      }
    }

    throw new Error('Generation timed out after 60 seconds');
  }

  /**
   * Get progress message based on attempts
   */
  private getProgressMessage(attempts: number, status: string): string {
    if (attempts < 3) {
      return 'Starting avatar generation...';
    } else if (attempts < 8) {
      return 'Generating your unique avatar...';
    } else if (attempts < 15) {
      return 'Adding finishing touches...';
    } else if (attempts < 25) {
      return 'Almost ready...';
    } else {
      return 'This is taking a bit longer than usual...';
    }
  }

  /**
   * Download image from Leonardo URL
   */
  async downloadImage(imageUrl: string): Promise<Blob> {
    const response = await fetch(imageUrl);

    if (!response.ok) {
      throw new Error(`Failed to download image: ${response.statusText}`);
    }

    return await response.blob();
  }

  /**
   * Get user's remaining API credits
   */
  async getUserCredits(): Promise<{ credits: number }> {
    const response = await fetch(`${this.baseUrl}/me`, {
      headers: {
        'Authorization': `Bearer ${this.apiKey}`,
      },
    });

    if (!response.ok) {
      const error: LeonardoError = await response.json();
      throw new Error(`Leonardo API error: ${error.message || response.statusText}`);
    }

    const data = await response.json();

    return {
      credits: data.user_details?.apiCreditBalance || 0,
    };
  }

  /**
   * Validate API key and connection
   */
  async validateConnection(): Promise<boolean> {
    try {
      await this.getUserCredits();
      return true;
    } catch (error) {
      console.error('Leonardo API validation failed:', error);
      return false;
    }
  }
}