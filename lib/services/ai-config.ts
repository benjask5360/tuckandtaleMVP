/**
 * AI Configuration Service
 * Manages AI model configurations for different purposes
 */

import { createClient } from '@/lib/supabase/server';

export interface AIConfig {
  id: string;
  name: string;
  purpose: 'avatar_generation' | 'story_generation' | 'story_illustration';
  provider: 'leonardo' | 'openai' | 'stability' | 'midjourney';
  model_id: string;
  model_name: string;
  settings: {
    width?: number;
    height?: number;
    num_images?: number;
    num_inference_steps?: number;
    guidance_scale?: number;
    scheduler?: string;
    negative_prompt?: string;
    sd_version?: string;
    public?: boolean;
    tiling?: boolean;
    [key: string]: any;
  };
  cost_per_generation: number;
  is_active: boolean;
  is_default: boolean;
}

export class AIConfigService {
  /**
   * Get the default AI configuration for a specific purpose
   */
  static async getDefaultConfig(
    purpose: 'avatar_generation' | 'story_generation' | 'story_illustration'
  ): Promise<AIConfig | null> {
    const supabase = await createClient();

    const { data, error } = await supabase
      .from('ai_configs')
      .select('*')
      .eq('purpose', purpose)
      .eq('is_active', true)
      .eq('is_default', true)
      .single();

    if (error) {
      console.error('Error fetching default AI config:', error);
      return null;
    }

    return data as AIConfig;
  }

  /**
   * Get a specific AI configuration by name
   */
  static async getConfigByName(name: string): Promise<AIConfig | null> {
    const supabase = await createClient();

    const { data, error } = await supabase
      .from('ai_configs')
      .select('*')
      .eq('name', name)
      .eq('is_active', true)
      .single();

    if (error) {
      console.error('Error fetching AI config by name:', error);
      return null;
    }

    return data as AIConfig;
  }

  /**
   * Get all available configs for a purpose
   */
  static async getAvailableConfigs(
    purpose: 'avatar_generation' | 'story_generation' | 'story_illustration'
  ): Promise<AIConfig[]> {
    const supabase = await createClient();

    const { data, error } = await supabase
      .from('ai_configs')
      .select('*')
      .eq('purpose', purpose)
      .eq('is_active', true)
      .order('is_default', { ascending: false })
      .order('name');

    if (error) {
      console.error('Error fetching available AI configs:', error);
      return [];
    }

    return data as AIConfig[];
  }

  /**
   * Get the Leonardo model configuration for avatar generation
   */
  static async getAvatarGenerationConfig(
    configName?: string
  ): Promise<AIConfig | null> {
    if (configName) {
      return await this.getConfigByName(configName);
    }
    return await this.getDefaultConfig('avatar_generation');
  }

  /**
   * Build Leonardo API configuration from our config
   */
  static buildLeonardoConfig(
    aiConfig: AIConfig,
    prompt: string
  ) {
    return {
      prompt,
      modelId: aiConfig.model_id,
      width: aiConfig.settings.width || 512,
      height: aiConfig.settings.height || 768,
      numImages: aiConfig.settings.num_images || 1,
      guidanceScale: aiConfig.settings.guidance_scale || 7,
      numInferenceSteps: aiConfig.settings.num_inference_steps || 30,
      scheduler: aiConfig.settings.scheduler || 'LEONARDO',
      negativePrompt: aiConfig.settings.negative_prompt || 'bad anatomy, blurry, low quality',
      sdVersion: aiConfig.settings.sd_version || 'SDXL_LIGHTNING',
      public: aiConfig.settings.public || false,
      tiling: aiConfig.settings.tiling || false,
    };
  }

  /**
   * Log AI generation cost
   */
  static async logGenerationCost(
    userId: string,
    characterProfileId: string,
    aiConfig: AIConfig,
    creditsUsed: number,
    metadata?: any
  ) {
    const supabase = await createClient();

    const { error } = await supabase
      .from('api_cost_logs')
      .insert({
        user_id: userId,
        character_profile_id: characterProfileId,
        service: aiConfig.provider,
        endpoint: `${aiConfig.purpose}/${aiConfig.name}`,
        cost: creditsUsed * aiConfig.cost_per_generation,
        metadata: {
          ai_config_name: aiConfig.name,
          model_id: aiConfig.model_id,
          model_name: aiConfig.model_name,
          credits_used: creditsUsed,
          ...metadata,
        },
      });

    if (error) {
      console.error('Error logging generation cost:', error);
    }
  }
}