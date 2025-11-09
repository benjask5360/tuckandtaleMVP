import { createClient } from '@/lib/supabase/server';
import { NextResponse } from 'next/server';

export async function GET(request: Request) {
  try {
    const supabase = await createClient();

    // Get authenticated user
    const {
      data: { user },
      error: authError,
    } = await supabase.auth.getUser();

    if (authError || !user) {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
    }

    // Fetch all active story parameters
    const { data: parameters, error } = await supabase
      .from('story_parameters')
      .select('*')
      .eq('is_active', true)
      .order('display_order');

    if (error) {
      console.error('Error fetching story parameters:', error);
      return NextResponse.json(
        { error: 'Failed to fetch story parameters' },
        { status: 500 }
      );
    }

    // Group by type for easier frontend consumption
    const grouped = parameters.reduce((acc: any, param: any) => {
      if (!acc[param.type]) {
        acc[param.type] = [];
      }
      acc[param.type].push(param);
      return acc;
    }, {});

    return NextResponse.json({
      success: true,
      parameters: grouped,
      metadata: {
        total: parameters.length,
        genres: grouped.genre?.length || 0,
        tones: grouped.tone?.length || 0,
        lengths: grouped.length?.length || 0,
        growth_categories: grouped.growth_category?.length || 0,
        growth_topics: grouped.growth_topic?.length || 0,
        moral_lessons: grouped.moral_lesson?.length || 0,
      },
    });
  } catch (error: any) {
    console.error('Error fetching story parameters:', error);
    return NextResponse.json(
      { error: error.message || 'Internal server error' },
      { status: 500 }
    );
  }
}
