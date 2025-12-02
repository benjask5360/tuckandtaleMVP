import { NextRequest, NextResponse } from 'next/server';
import { createClient } from '@/lib/supabase/server';
import { LeonardoClient } from '@/lib/leonardo/client';
import { AIConfigService } from '@/lib/services/ai-config';

export const runtime = 'nodejs';
export const dynamic = 'force-dynamic';
export const maxDuration = 120; // 2 minutes max for Leonardo generation

export async function POST(request: NextRequest) {
  const startTime = performance.now();

  try {
    // 1. Auth check
    const supabase = await createClient();
    const { data: { user }, error: authError } = await supabase.auth.getUser();

    if (authError || !user) {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
    }

    // 2. Admin check
    const { data: userProfile, error: profileError } = await supabase
      .from('user_profiles')
      .select('user_type')
      .eq('id', user.id)
      .single();

    if (profileError || userProfile?.user_type !== 'admin') {
      return NextResponse.json({ error: 'Forbidden - Admin access required' }, { status: 403 });
    }

    // 3. Get prompt from request
    const body = await request.json();
    const { prompt } = body;

    if (!prompt || typeof prompt !== 'string' || !prompt.trim()) {
      return NextResponse.json({ error: 'Prompt is required' }, { status: 400 });
    }

    // 4. Get story illustration AI config
    const aiConfig = await AIConfigService.getBetaIllustrationConfig();
    if (!aiConfig) {
      return NextResponse.json({ error: 'Story illustration config not found' }, { status: 500 });
    }

    console.log('Using AI config:', {
      name: aiConfig.name,
      provider: aiConfig.provider,
      modelId: aiConfig.model_id,
      settings: aiConfig.settings,
    });

    // 5. Initialize Leonardo client
    const leonardoClient = new LeonardoClient();

    // 6. Build Leonardo config
    const leonardoConfig = AIConfigService.buildLeonardoConfig(aiConfig, prompt);

    console.log('Leonardo config:', leonardoConfig);

    // 7. Generate image - track request timing
    const requestStart = performance.now();
    const { generationId, apiCreditCost } = await leonardoClient.generateImage(leonardoConfig);
    const requestEnd = performance.now();

    console.log(`Generation ID: ${generationId}, Credits: ${apiCreditCost}`);

    // 8. Poll for completion - track polling timing
    const pollingStart = performance.now();
    const generation = await leonardoClient.pollGeneration(generationId);
    const pollingEnd = performance.now();

    // 9. Extract image URL
    const imageUrl = generation.images?.[0]?.url;
    if (!imageUrl) {
      return NextResponse.json({ error: 'No image URL in response' }, { status: 500 });
    }

    const endTime = performance.now();

    // 10. Return results with timing data
    return NextResponse.json({
      success: true,
      imageUrl,
      generationId,
      creditCost: apiCreditCost,
      timings: {
        requestStart,
        requestEnd,
        pollingStart,
        pollingEnd,
        totalDuration: endTime - startTime,
        requestDuration: requestEnd - requestStart,
        pollingDuration: pollingEnd - pollingStart,
      },
    });

  } catch (error) {
    console.error('Leonardo test error:', error);
    return NextResponse.json({
      error: error instanceof Error ? error.message : 'Unknown error',
    }, { status: 500 });
  }
}
