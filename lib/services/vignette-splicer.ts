/**
 * Vignette Splicer Service
 *
 * Generates panoramic 9-panel storyboard images using Leonardo.ai,
 * slices them into individual panels, and stores them in Supabase.
 *
 * Workflow:
 * 1. Extract story paragraphs and character data
 * 2. Generate panoramic prompt (always 9 scenes)
 * 3. Generate 3072×3072 panoramic image via Leonardo
 * 4. Slice into 9 equal 1024×1024 panels
 * 5. Upload panels to Supabase Storage
 * 6. Store metadata in vignette_panels table
 */

import { createClient as createServerClient } from '@/lib/supabase/server';
import { createAdminClient } from '@/lib/supabase/admin';
import { LeonardoClient } from '@/lib/leonardo/client';
import { AIConfigService } from '@/lib/services/ai-config';
import { buildCharacterDescription } from '@/lib/prompt-builders/descriptionBuilder';
import { mapSelectionsToEnhanced } from '@/lib/descriptors/prompt-builder';
import { generateVignetteStoryPrompt, parseVignetteStoryResponse, type VignetteStoryParams, type VignetteStoryResponse } from '@/lib/prompt-builders/vignetteStoryPromptBuilder';
import OpenAI from 'openai';
import sharp from 'sharp';

// ============================================================================
// TYPES
// ============================================================================

export interface VignettePanel {
  panel_number: number;
  image_url: string;
  storage_path: string;
}

export interface VignetteGenerationResult {
  storyId: string;
  panels: VignettePanel[];
  panoramicImageUrl: string;
  leonardoGenerationId: string;
}

interface StoryData {
  id: string;
  title: string;
  body: string;
  generation_metadata: {
    paragraphs: string[];
    mode: 'fun' | 'growth';
    genre?: string;
    tone?: string;
    [key: string]: any;
  };
  user_id: string;
}

interface CharacterData {
  id: string;
  name: string;
  character_type: string;
  attributes: Record<string, any>;
  appearance_description: string | null;
}

// ============================================================================
// MAIN SERVICE CLASS
// ============================================================================

export class VignetteSplicerService {
  /**
   * Main orchestrator: Generate all vignettes for a story
   */
  static async generateStoryVignettes(
    storyId: string,
    userId: string
  ): Promise<VignetteGenerationResult> {
    // 1. Fetch story data
    const story = await this.fetchStoryData(storyId, userId);

    // 2. Fetch character data
    const characters = await this.fetchStoryCharacters(storyId);

    // 3. Generate panoramic prompt (always 9 scenes)
    const prompt = await this.generateVignettePanoramaPrompt(story, characters);

    // 4. Generate panoramic image via Leonardo
    const { generationId, imageUrl } = await this.generatePanoramicImage(
      prompt,
      userId,
      storyId
    );

    // 5. Slice and store panels
    const panels = await this.sliceAndStorePanels(
      imageUrl,
      storyId,
      userId,
      generationId
    );

    return {
      storyId,
      panels,
      panoramicImageUrl: imageUrl,
      leonardoGenerationId: generationId,
    };
  }

  /**
   * NEW: Generate vignette story from scratch using OpenAI + Leonardo
   * This creates visual scene descriptions optimized for panoramic generation
   */
  static async generateVignetteStoryFromScratch(
    params: VignetteStoryParams,
    userId: string
  ): Promise<VignetteStoryResponse & { storyId: string; panels: VignettePanel[] }> {
    // 1. Create placeholder content record to get contentId for cost logging
    const storyId = await this.createPlaceholderContent(params, userId);

    // 2. Generate visual scene descriptions using OpenAI (with cost logging)
    const { vignetteStory, openaiPrompt } = await this.generateVisualScenesWithOpenAI(
      params,
      userId,
      storyId
    );

    console.log('[Vignette Story] Generated:', vignetteStory.title);
    console.log('[Vignette Story] Scenes:', vignetteStory.scenes.length);

    // 3. Build character descriptions
    const characterDescriptions = params.characters.map((char) => {
      const desc = char.description || 'Character in the story';
      // Clean up any duplicate words (e.g., "build build")
      const cleaned = desc.replace(/\b(\w+)\s+\1\b/gi, '$1');
      return `${char.name} ${cleaned}`;
    });

    // 4. Build Leonardo prompt from visual scenes
    const leonardoPrompt = this.buildPanoramicPromptFromVisualScenes(
      vignetteStory.title,
      vignetteStory.summary,
      characterDescriptions,
      vignetteStory.scenes,
      params.genre,
      params.tone
    );

    console.log('[Vignette Story] Leonardo prompt length:', leonardoPrompt.length);

    // 5. Update content record with full data and prompts
    await this.updateVignetteContent(storyId, vignetteStory, openaiPrompt, leonardoPrompt);

    // 6. Generate panoramic image via Leonardo (with cost logging)
    const { generationId, imageUrl } = await this.generatePanoramicImage(
      leonardoPrompt,
      userId,
      storyId
    );

    // 7. Slice and store panels
    const panels = await this.sliceAndStorePanels(imageUrl, storyId, userId, generationId);

    return {
      ...vignetteStory,
      storyId,
      panels,
    };
  }

  /**
   * Use OpenAI to generate visual scene descriptions
   */
  private static async generateVisualScenesWithOpenAI(
    params: VignetteStoryParams,
    userId: string,
    contentId: string
  ): Promise<{ vignetteStory: VignetteStoryResponse; openaiPrompt: string }> {
    // Fetch AI config for vignette scene generation
    const aiConfig = await AIConfigService.getDefaultConfig('story_vignette_scenes' as any);
    if (!aiConfig) {
      throw new Error('No AI config found for story_vignette_scenes');
    }

    const openai = new OpenAI({
      apiKey: process.env.OPENAI_API_KEY,
    });

    // Build the prompt
    const prompt = generateVignetteStoryPrompt(params);

    console.log('━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━');
    console.log('📝 OPENAI PROMPT (Vignette Story Generation)');
    console.log('━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━');
    console.log(prompt);
    console.log('━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━\n');

    console.log('[Vignette Story] Calling OpenAI (gpt-4.1)...');

    // Call OpenAI
    const completion = await openai.chat.completions.create({
      model: 'gpt-4.1', // High-quality visual scene generation
      messages: [
        {
          role: 'system',
          content:
            'You are a visual storytelling expert who creates detailed scene descriptions for panoramic storyboard images.',
        },
        {
          role: 'user',
          content: prompt,
        },
      ],
      temperature: 0.8, // Creative but consistent
      response_format: { type: 'json_object' },
    });

    const response = completion.choices[0]?.message?.content;

    if (!response) {
      throw new Error('No response from OpenAI');
    }

    // Parse and validate response
    const vignetteStory = parseVignetteStoryResponse(response);

    // Log cost with token usage
    const usage = completion.usage;
    if (usage) {
      await AIConfigService.logGenerationCost(
        userId,
        null, // No character profile ID for vignette stories
        aiConfig,
        usage.total_tokens,
        {
          content_id: contentId,
          prompt_used: prompt,
          prompt_tokens: usage.prompt_tokens,
          completion_tokens: usage.completion_tokens,
        }
      );
      console.log(`[Vignette Story] OpenAI cost logged: ${usage.total_tokens} tokens`);
    }

    return {
      vignetteStory,
      openaiPrompt: prompt,
    };
  }

  /**
   * Build Leonardo prompt from visual scenes (new approach)
   * Format matches the proven good example structure
   */
  private static buildPanoramicPromptFromVisualScenes(
    title: string,
    summary: string,
    characterDescriptions: string[],
    visualScenes: string[],
    genre: string,
    tone: string
  ): string {
    // Opening with style and story overview
    const opening = `A heartwarming Disney-Pixar style cinematic illustration showing nine connected vignettes flowing left to right in one panoramic image, telling a story about ${summary}`;

    // Character descriptions (join with periods for multiple characters)
    const characterSection = characterDescriptions.join('. ') + '.';

    // Add facial instruction
    const facialInstruction =
      'All faces have natural, well-proportioned eyes and realistic Pixar-style expressions.';

    // Build numbered scene list with emoji numbers
    const numberEmojis = ['1️⃣', '2️⃣', '3️⃣', '4️⃣', '5️⃣', '6️⃣', '7️⃣', '8️⃣', '9️⃣'];
    const sceneList = visualScenes
      .map((scene, idx) => {
        const cleaned = scene.replace(/^(Scene|Frame) \d+:\s*/i, '');
        return `${numberEmojis[idx]} ${cleaned}`;
      })
      .join(' ');

    // Closing technical specs
    const closingSpecs =
      'Pixar-style 3D realism, cinematic lighting consistency, expressive but anatomically correct faces and eyes, detailed background, warm natural color palette, emotional storytelling, cohesive panoramic composition — no text, no captions';

    // Assemble full prompt
    const prompt = `${opening} ${characterSection} ${facialInstruction} The visual progression shows: ${sceneList} ${closingSpecs}`;

    console.log('\n━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━');
    console.log('🎨 LEONARDO PROMPT (Panoramic Image Generation)');
    console.log('━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━');
    console.log(prompt);
    console.log(`\nLength: ${prompt.length} characters`);
    console.log('━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━\n');

    // Leonardo's actual limit varies by model, but generally 1000-1500 chars
    // We'll use 2000 as a soft limit and let Leonardo handle it
    const MAX_LENGTH = 2000;

    if (prompt.length > MAX_LENGTH) {
      console.warn(`[Vignette Story] Prompt exceeds ${MAX_LENGTH} chars (${prompt.length}), compressing...`);

      // Compress by shortening each scene description
      const maxSceneLength = Math.floor((MAX_LENGTH - 400) / visualScenes.length); // Reserve 400 for boilerplate
      const compressedScenes = visualScenes
        .map((scene, idx) => {
          const cleaned = scene.replace(/^(Scene|Frame) \d+:\s*/i, '');
          const truncated = cleaned.length > maxSceneLength
            ? cleaned.substring(0, maxSceneLength).trim() + '...'
            : cleaned;
          return `${numberEmojis[idx]} ${truncated}`;
        })
        .join(' ');

      // Rebuild with compressed scenes
      const compressedPrompt = `${opening} ${characterSection} ${facialInstruction} The visual progression shows: ${compressedScenes} ${closingSpecs}`;

      console.log(`[Vignette Story] Compressed to ${compressedPrompt.length} characters`);
      return compressedPrompt;
    }

    return prompt;
  }

  /**
   * Create placeholder content record to get contentId for cost logging
   */
  private static async createPlaceholderContent(
    params: VignetteStoryParams,
    userId: string
  ): Promise<string> {
    const supabase = await createServerClient();

    const { data, error} = await supabase
      .from('content')
      .insert({
        user_id: userId,
        content_type: 'vignette_story',
        title: 'Generating vignette story...', // Placeholder
        body: 'Story generation in progress',
        theme: params.genre,
        panel_count: 9, // 3×3 grid
        source_story_id: null, // Not converted from another story
        generation_metadata: {
          mode: params.mode,
          genre: params.genre,
          tone: params.tone,
          characters_used: params.characters.map((c) => c.id).filter(Boolean),
        },
      })
      .select('id')
      .single();

    if (error || !data) {
      throw new Error(`Failed to create placeholder content: ${error?.message}`);
    }

    console.log('[Vignette Story] Created placeholder content:', data.id);
    return data.id;
  }

  /**
   * Update content record with full vignette story data and prompts
   */
  private static async updateVignetteContent(
    contentId: string,
    vignetteStory: VignetteStoryResponse,
    openaiPrompt: string,
    leonardoPrompt: string
  ): Promise<void> {
    const supabase = await createServerClient();

    const { error } = await supabase
      .from('content')
      .update({
        title: vignetteStory.title,
        body: vignetteStory.summary,
        vignette_helper_prompt: openaiPrompt,
        vignette_prompt: leonardoPrompt,
        generation_metadata: {
          ...((await supabase.from('content').select('generation_metadata').eq('id', contentId).single()).data
            ?.generation_metadata || {}),
          scenes: vignetteStory.scenes,
          summary: vignetteStory.summary,
        },
      })
      .eq('id', contentId);

    if (error) {
      throw new Error(`Failed to update vignette content: ${error?.message}`);
    }

    console.log('[Vignette Story] Updated content with full data:', contentId);
  }

  /**
   * Store vignette story in database
   */
  private static async storeVignetteStory(
    vignetteStory: VignetteStoryResponse,
    params: VignetteStoryParams,
    userId: string,
    openaiPrompt: string,
    leonardoPrompt: string
  ): Promise<string> {
    const supabase = await createServerClient();

    const { data, error } = await supabase
      .from('content')
      .insert({
        user_id: userId,
        content_type: 'vignette_story', // Visual scene descriptions for Leonardo
        title: vignetteStory.title,
        body: vignetteStory.summary, // Use summary as body text
        theme: params.genre,
        panel_count: 9, // 3×3 grid
        source_story_id: null, // Not converted from another story
        vignette_helper_prompt: openaiPrompt, // OpenAI Call #1: Generate scene descriptions
        vignette_prompt: leonardoPrompt, // Leonardo Call #2: Generate panoramic image
        generation_metadata: {
          mode: params.mode,
          genre: params.genre,
          tone: params.tone,
          scenes: vignetteStory.scenes, // 9 visual scene descriptions
          summary: vignetteStory.summary,
          characters_used: params.characters.map((c) => c.id).filter(Boolean),
        },
      })
      .select('id')
      .single();

    if (error || !data) {
      throw new Error(`Failed to store vignette story: ${error?.message}`);
    }

    console.log('[Vignette Story] Stored in database:', data.id);

    return data.id;
  }

  /**
   * Fetch story data from database
   */
  private static async fetchStoryData(
    storyId: string,
    userId: string
  ): Promise<StoryData> {
    const supabase = await createServerClient();

    const { data: story, error } = await supabase
      .from('content')
      .select('id, title, body, generation_metadata, user_id')
      .eq('id', storyId)
      .eq('user_id', userId)
      .eq('content_type', 'story')
      .single();

    if (error || !story) {
      throw new Error(`Story not found: ${storyId}`);
    }

    return story as StoryData;
  }

  /**
   * Fetch characters associated with the story
   */
  private static async fetchStoryCharacters(
    storyId: string
  ): Promise<CharacterData[]> {
    const supabase = await createServerClient();

    const { data: contentCharacters, error } = await supabase
      .from('content_characters')
      .select(`
        character_profile_id,
        character_profiles:character_profile_id (
          id,
          name,
          character_type,
          attributes,
          appearance_description
        )
      `)
      .eq('content_id', storyId);

    if (error) {
      console.error('Error fetching story characters:', error);
      return [];
    }

    // Extract character profiles
    const characters = (contentCharacters || [])
      .map((cc: any) => cc.character_profiles)
      .filter((c: any) => c !== null) as CharacterData[];

    return characters;
  }

  /**
   * Generate panoramic prompt with 9 numbered scenes
   * Maps story paragraphs to exactly 9 scenes
   */
  static async generateVignettePanoramaPrompt(
    story: StoryData,
    characters: CharacterData[]
  ): Promise<string> {
    const paragraphs = story.generation_metadata?.paragraphs || [];

    // Map paragraphs to 9 scenes
    const sceneDescriptions = this.mapParagraphsToScenes(paragraphs, 9);

    // Build character descriptions
    const characterDescriptions = await this.buildCharacterDescriptions(characters);

    // Build the panoramic prompt
    const prompt = this.buildPanoramicPrompt(
      story.title,
      characterDescriptions,
      sceneDescriptions,
      story.generation_metadata?.genre || 'adventure',
      story.generation_metadata?.tone || 'heartwarming'
    );

    return prompt;
  }

  /**
   * Map story paragraphs to exactly 9 scenes
   * - If fewer than 9 paragraphs: Add atmospheric transitions
   * - If more than 9 paragraphs: Merge into 9 key moments
   */
  private static mapParagraphsToScenes(
    paragraphs: string[],
    targetScenes: number = 9
  ): string[] {
    if (paragraphs.length === 0) {
      // Generate generic scenes if no paragraphs
      return Array(targetScenes).fill('A moment in the story unfolds');
    }

    if (paragraphs.length === targetScenes) {
      // Perfect match
      return paragraphs;
    }

    if (paragraphs.length < targetScenes) {
      // Add atmospheric transition scenes
      const scenes = [...paragraphs];
      const neededScenes = targetScenes - paragraphs.length;

      for (let i = 0; i < neededScenes; i++) {
        const transitionIndex = Math.floor((i + 1) * (paragraphs.length / (neededScenes + 1)));
        const transition = 'A transitional moment showing the passage of time or change in setting';
        scenes.splice(transitionIndex + i, 0, transition);
      }

      return scenes;
    }

    // More than target: Merge paragraphs into key moments
    const scenesPerGroup = paragraphs.length / targetScenes;
    const scenes: string[] = [];

    for (let i = 0; i < targetScenes; i++) {
      const startIdx = Math.floor(i * scenesPerGroup);
      const endIdx = Math.floor((i + 1) * scenesPerGroup);
      const groupParagraphs = paragraphs.slice(startIdx, endIdx);

      // Take the first paragraph of each group as the key moment
      scenes.push(groupParagraphs[0] || 'A moment in the story');
    }

    return scenes;
  }

  /**
   * Build visual descriptions for all characters using the descriptor system
   */
  private static async buildCharacterDescriptions(
    characters: CharacterData[]
  ): Promise<string[]> {
    const descriptions: string[] = [];

    for (const character of characters) {
      try {
        const profileType = character.character_type as any;
        const attributes = character.attributes || {};

        console.log(`[Vignette] Building description for: ${character.name}`);
        console.log(`[Vignette] Character attributes:`, attributes);

        // Use the existing descriptor system to build consistent descriptions
        const enhanced = await mapSelectionsToEnhanced(profileType, attributes);
        console.log(`[Vignette] Enhanced descriptors:`, enhanced);

        const description = buildCharacterDescription(profileType, enhanced);
        console.log(`[Vignette] Final description: ${character.name}: ${description}`);

        descriptions.push(`${character.name}: ${description}`);
      } catch (error) {
        console.error(`Error building description for ${character.name}:`, error);
        // Fallback to basic description
        descriptions.push(
          `${character.name}: ${character.appearance_description || 'A character in the story'}`
        );
      }
    }

    return descriptions;
  }

  /**
   * Build the full panoramic prompt for Leonardo
   */
  private static buildPanoramicPrompt(
    title: string,
    characterDescriptions: string[],
    sceneDescriptions: string[],
    genre: string,
    tone: string
  ): string {
    // Determine visual style based on genre/tone
    const style = this.determineVisualStyle(genre, tone);

    // Build character section
    const characterSection = characterDescriptions.length > 0
      ? characterDescriptions.join('. ') + '.'
      : 'Characters in a story.';

    // Build scene progression section (numbered 1-9)
    const sceneSection = sceneDescriptions
      .map((desc, idx) => `${idx + 1}️⃣ ${this.extractVisualMoment(desc)}`)
      .join('  \n');

    // Assemble full prompt - optimized to stay under 1500 chars
    const prompt = `${style} panoramic: 9 connected scenes left-to-right telling "${title}". ${characterSection}

Scenes:
${sceneSection}

Cinematic lighting, detailed backgrounds, warm palette, cohesive composition. No text, borders, or frames.`;

    console.log(`[Vignette] Prompt length: ${prompt.length} characters`);

    // If still too long, truncate scenes further
    if (prompt.length > 1500) {
      console.warn(`[Vignette] Prompt too long (${prompt.length} chars), truncating scenes...`);
      const maxSceneLength = Math.floor((1500 - 300) / 9); // Reserve 300 for other text
      const truncatedScenes = sceneDescriptions
        .map((desc, idx) => `${idx + 1}. ${this.extractVisualMoment(desc).substring(0, maxSceneLength)}`)
        .join(' ');

      const shortPrompt = `${style} panoramic: 9 scenes for "${title}". ${characterSection}
${truncatedScenes}
Cinematic, detailed, warm palette, no text.`;

      console.log(`[Vignette] Shortened to ${shortPrompt.length} characters`);
      return shortPrompt;
    }

    return prompt;
  }

  /**
   * Determine visual style from genre and tone
   */
  private static determineVisualStyle(genre: string, tone: string): string {
    const genreLower = genre.toLowerCase();
    const toneLower = tone.toLowerCase();

    if (toneLower.includes('heartwarming') || toneLower.includes('gentle')) {
      return 'A heartwarming Disney-Pixar style';
    }
    if (genreLower.includes('adventure') || genreLower.includes('fantasy')) {
      return 'An epic Disney-Pixar style';
    }
    if (genreLower.includes('mystery')) {
      return 'A mysterious yet playful Pixar style';
    }

    // Default
    return 'A Disney-Pixar style';
  }

  /**
   * Extract a visual moment from a paragraph of text
   * Simplifies narrative text into a concrete visual description
   */
  private static extractVisualMoment(paragraph: string): string {
    // For now, just truncate and clean the paragraph
    // In the future, could use AI to extract the key visual moment
    const cleaned = paragraph
      .replace(/["""]/g, '"')
      .replace(/['']/g, "'")
      .trim();

    // Truncate to reasonable length (balancing detail with total prompt limit)
    // Total prompt must be under 1500 chars, so ~120 chars per scene is safe
    const MAX_SCENE_LENGTH = 120;

    if (cleaned.length > MAX_SCENE_LENGTH) {
      // Try to cut at sentence boundary for cleaner descriptions
      const firstSentence = cleaned.match(/^[^.!?]+[.!?]/);
      if (firstSentence && firstSentence[0].length <= MAX_SCENE_LENGTH) {
        return firstSentence[0].trim();
      }
      // Otherwise truncate at word boundary
      return cleaned.substring(0, MAX_SCENE_LENGTH - 3).trim() + '...';
    }

    return cleaned;
  }

  /**
   * Generate panoramic image via Leonardo API
   */
  private static async generatePanoramicImage(
    prompt: string,
    userId: string,
    storyId: string
  ): Promise<{ generationId: string; imageUrl: string }> {
    // Get AI config for vignette panoramas
    const aiConfig = await AIConfigService.getDefaultConfig('story_vignette_panorama');

    if (!aiConfig) {
      throw new Error('No AI config found for story_vignette_panorama');
    }

    // Build Leonardo generation config
    const leonardoConfig = AIConfigService.buildLeonardoConfig(aiConfig, prompt);

    // Initialize Leonardo client
    const leonardo = new LeonardoClient();

    // Generate image and capture credit cost
    const { generationId, apiCreditCost } = await leonardo.generateImage(leonardoConfig);

    // Poll for completion
    const result = await leonardo.pollGeneration(generationId, (progress, message) => {
      console.log(`[Vignette Generation] ${message} (${progress}%)`);
    });

    if (result.status !== 'COMPLETE' || !result.images || result.images.length === 0) {
      throw new Error('Leonardo generation failed or returned no images');
    }

    const imageUrl = result.images[0].url;
    const actualCreditCost = result.creditCost || apiCreditCost || 0;

    // Log cost with AIConfigService
    await AIConfigService.logGenerationCost(
      userId,
      null, // No character profile ID for vignette stories
      aiConfig,
      actualCreditCost, // Use actual credit cost from Leonardo
      {
        content_id: storyId,
        prompt_used: prompt,
        actual_cost: actualCreditCost,
        generation_id: generationId,
        model_id: aiConfig.model_id,
        model_name: aiConfig.model_name,
      }
    );

    console.log(`[Vignette Story] Leonardo cost logged: ${actualCreditCost} credits`);

    return { generationId, imageUrl };
  }


  /**
   * Slice panoramic image into 9 panels and store in Supabase
   */
  private static async sliceAndStorePanels(
    imageUrl: string,
    storyId: string,
    userId: string,
    generationId: string
  ): Promise<VignettePanel[]> {
    // Download panoramic image
    const leonardo = new LeonardoClient();
    const imageBlob = await leonardo.downloadImage(imageUrl);
    const arrayBuffer = await imageBlob.arrayBuffer();
    const imageBuffer = Buffer.from(arrayBuffer);

    // Get image dimensions to verify it's 3072x3072
    const metadata = await sharp(imageBuffer).metadata();
    console.log(`[Vignette Splicer] Panoramic image dimensions: ${metadata.width}x${metadata.height}`);

    // Calculate panel dimensions (should be 512x512 for 3x3 grid from 1536x1536)
    const panelWidth = Math.floor((metadata.width || 1536) / 3);
    const panelHeight = Math.floor((metadata.height || 1536) / 3);

    // Use admin client for storage uploads to bypass RLS
    const supabaseAdmin = createAdminClient();
    const supabase = await createServerClient();

    // Delete existing panels for this story to allow regeneration
    const { error: deleteError } = await supabase
      .from('vignette_panels')
      .delete()
      .eq('story_id', storyId);

    if (deleteError) {
      console.warn('[Vignette Splicer] Could not delete old panels:', deleteError.message);
    } else {
      console.log('[Vignette Splicer] Cleaned up existing panels');
    }

    const panels: VignettePanel[] = [];

    // Slice into 9 panels (3x3 grid)
    for (let row = 0; row < 3; row++) {
      for (let col = 0; col < 3; col++) {
        const panelNumber = row * 3 + col + 1; // 1-9

        // Extract panel from panoramic image
        const panelBuffer = await sharp(imageBuffer)
          .extract({
            left: col * panelWidth,
            top: row * panelHeight,
            width: panelWidth,
            height: panelHeight,
          })
          .png()
          .toBuffer();

        // Upload to Supabase Storage using admin client (bypasses RLS)
        const storagePath = `vignettes/${storyId}/panels/panel_${panelNumber}.png`;

        // First, try to remove existing file if it exists
        await supabaseAdmin.storage
          .from('illustrations')
          .remove([storagePath]);

        // Then upload the new file
        const { data: uploadData, error: uploadError } = await supabaseAdmin.storage
          .from('illustrations')
          .upload(storagePath, panelBuffer, {
            contentType: 'image/png',
            upsert: false, // Don't upsert since we just removed it
          });

        if (uploadError) {
          console.error(`[Vignette Splicer] Upload error for panel ${panelNumber}:`, uploadError);
          throw new Error(`Failed to upload panel ${panelNumber}: ${uploadError.message}`);
        }

        console.log(`[Vignette Splicer] Panel ${panelNumber} uploaded:`, uploadData);

        // Get public URL
        const { data: { publicUrl } } = supabaseAdmin.storage
          .from('illustrations')
          .getPublicUrl(storagePath);

        // Insert into vignette_panels table
        const { error: insertError } = await supabase
          .from('vignette_panels')
          .insert({
            story_id: storyId,
            panel_number: panelNumber,
            image_url: publicUrl,
            storage_path: storagePath,
          });

        if (insertError) {
          throw new Error(`Failed to insert panel ${panelNumber} metadata: ${insertError.message}`);
        }

        panels.push({
          panel_number: panelNumber,
          image_url: publicUrl,
          storage_path: storagePath,
        });

        console.log(`[Vignette Splicer] Panel ${panelNumber} created: ${publicUrl}`);

        // Add small delay to avoid rate limiting
        if (panelNumber < 9) {
          await new Promise((resolve) => setTimeout(resolve, 100));
        }
      }
    }

    return panels;
  }
}
