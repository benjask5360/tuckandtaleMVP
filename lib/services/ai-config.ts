/**
 * AI Configuration Service
 * Manages AI model configurations for different purposes
 */

import { createClient } from '@/lib/supabase/server';
import { createAdminClient } from '@/lib/supabase/admin';

export interface AIConfig {
  id: string;
  name: string;
  purpose: 'avatar_generation' | 'story_fun' | 'story_growth' | 'story_illustration' | 'story_vignette_panorama';
  provider: 'leonardo' | 'openai' | 'stability' | 'midjourney' | 'google';
  model_id: string;
  model_name: string;
  model_type?: 'text' | 'audio' | 'image';
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
  is_active: boolean;
  is_default: boolean;
}

export class AIConfigService {
  /**
   * Get the default AI configuration for a specific purpose
   */
  static async getDefaultConfig(
    purpose: 'avatar_generation' | 'story_fun' | 'story_growth' | 'story_illustration' | 'story_vignette_panorama'
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
    purpose: 'avatar_generation' | 'story_fun' | 'story_growth' | 'story_illustration'
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
   * Only includes parameters that are explicitly set to avoid API compatibility issues
   */
  static buildLeonardoConfig(
    aiConfig: AIConfig,
    prompt: string
  ) {
    const config: any = {
      prompt,
      modelId: aiConfig.model_id,
      width: aiConfig.settings.width || 512,
      height: aiConfig.settings.height || 768,
      numImages: aiConfig.settings.num_images || 1,
      public: aiConfig.settings.public || false,
    };

    // Only include optional parameters if explicitly set in config
    // This avoids sending parameters that might be incompatible with specific models
    if (aiConfig.settings.guidance_scale !== undefined) {
      config.guidanceScale = aiConfig.settings.guidance_scale;
    }
    if (aiConfig.settings.num_inference_steps !== undefined) {
      config.numInferenceSteps = aiConfig.settings.num_inference_steps;
    }
    if (aiConfig.settings.scheduler) {
      config.scheduler = aiConfig.settings.scheduler;
    }
    if (aiConfig.settings.negative_prompt) {
      config.negativePrompt = aiConfig.settings.negative_prompt;
    }
    if (aiConfig.settings.tiling !== undefined) {
      config.tiling = aiConfig.settings.tiling;
    }

    return config;
  }

  /**
   * Build Google Gemini API configuration from our config
   */
  static buildGeminiConfig(
    aiConfig: AIConfig,
    prompt: string
  ) {
    const config: any = {
      prompt,
      aspectRatio: aiConfig.settings.aspectRatio || '1:1',
      responseModalities: aiConfig.settings.responseModalities || ['Image'],
    };

    return config;
  }

  /**
   * Log AI generation cost
   */
  static async logGenerationCost(
    userId: string,
    characterProfileId: string | null,
    aiConfig: AIConfig,
    creditsUsed: number,
    metadata?: any,
    costLogId?: string | null
  ) {
    // Use admin client to bypass RLS for cost logging
    const supabase = createAdminClient();

    // Extract cost-related data from metadata
    const promptUsed = metadata?.prompt_used;
    const actualCost = metadata?.actual_cost; // Real cost from API provider (e.g., Leonardo apiCreditCost)
    const promptTokens = metadata?.prompt_tokens; // Input tokens (OpenAI)
    const completionTokens = metadata?.completion_tokens; // Output tokens (OpenAI)

    // Calculate actual_cost_usd from api_prices table
    let actualCostUsd: number | null = null;

    // Get pricing from database
    // Try to find pricing by provider + model_id first (for OpenAI models)
    let { data: pricing } = await supabase
      .from('api_prices')
      .select('cost_per_unit, input_cost_per_unit, output_cost_per_unit')
      .eq('provider', aiConfig.provider)
      .eq('model_id', aiConfig.model_id)
      .maybeSingle();

    // Fallback to provider-only pricing (for Leonardo)
    if (!pricing) {
      const { data: fallbackPricing } = await supabase
        .from('api_prices')
        .select('cost_per_unit, input_cost_per_unit, output_cost_per_unit')
        .eq('provider', aiConfig.provider)
        .is('model_id', null)
        .maybeSingle();

      pricing = fallbackPricing;
    }

    if (pricing) {
      // OpenAI/Anthropic: Use separate input/output pricing if tokens provided
      if (pricing.input_cost_per_unit && pricing.output_cost_per_unit &&
          promptTokens !== undefined && completionTokens !== undefined) {
        const inputCost = promptTokens * pricing.input_cost_per_unit;
        const outputCost = completionTokens * pricing.output_cost_per_unit;
        actualCostUsd = inputCost + outputCost;

        console.log('💵 Calculated USD cost from token breakdown:', {
          provider: aiConfig.provider,
          promptTokens,
          completionTokens,
          inputCostPerToken: pricing.input_cost_per_unit,
          outputCostPerToken: pricing.output_cost_per_unit,
          inputCost,
          outputCost,
          totalCostUsd: actualCostUsd,
        });
      }
      // Leonardo: Use single cost_per_unit for credits
      else if (pricing.cost_per_unit && actualCost !== undefined && actualCost !== null) {
        actualCostUsd = actualCost * pricing.cost_per_unit;

        console.log('💵 Calculated USD cost from credits:', {
          provider: aiConfig.provider,
          actualCost,
          costPerUnit: pricing.cost_per_unit,
          actualCostUsd,
        });
      }
    }

    // If costLogId is provided, update existing record; otherwise insert new one
    if (costLogId) {
      // Update existing cost log record
      const { error } = await supabase
        .from('api_cost_logs')
        .update({
          content_id: characterProfileId, // Update content_id with the story/content ID
          ai_config_name: aiConfig.name,
          total_tokens: Math.ceil(creditsUsed),
          prompt_tokens: promptTokens ?? null,
          completion_tokens: completionTokens ?? null,
          actual_cost: actualCost ?? null,
          actual_cost_usd: actualCostUsd,
          processing_status: 'completed',
          completed_at: new Date().toISOString(),
          metadata: {
            model_id: aiConfig.model_id,
            model_name: aiConfig.model_name,
            credits_used: creditsUsed,
            ...metadata,
          },
        })
        .eq('id', costLogId);

      if (error) {
        console.error('Error updating cost log:', error);
        throw new Error(`Failed to update cost log: ${error.message}`);
      }
    } else {
      // Insert new cost log record (for avatar generation, etc.)
      const { error } = await supabase
        .from('api_cost_logs')
        .insert({
          user_id: userId,
          character_profile_id: characterProfileId,
          ai_config_name: aiConfig.name,
          provider: aiConfig.provider,
          operation: aiConfig.purpose,
          model_used: aiConfig.model_name,
          total_tokens: Math.ceil(creditsUsed),
          prompt_tokens: promptTokens ?? null,
          completion_tokens: completionTokens ?? null,
          actual_cost: actualCost ?? null,
          actual_cost_usd: actualCostUsd,
          processing_status: 'completed',
          completed_at: new Date().toISOString(),
          prompt_used: promptUsed || null,
          metadata: {
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
}