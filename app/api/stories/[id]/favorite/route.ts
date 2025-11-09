import { createClient } from '@/lib/supabase/server';
import { NextResponse } from 'next/server';

export async function POST(
  request: Request,
  { params }: { params: { id: string } }
) {
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

    const storyId = params.id;
    const { is_favorite } = await request.json();

    // Verify story exists and user owns it
    const { data: story, error: fetchError } = await supabase
      .from('content')
      .select('id, user_id, is_favorite')
      .eq('id', storyId)
      .eq('user_id', user.id)
      .eq('content_type', 'story')
      .is('deleted_at', null)
      .single();

    if (fetchError || !story) {
      return NextResponse.json(
        { error: 'Story not found' },
        { status: 404 }
      );
    }

    // Update favorite status
    const { error: updateError } = await supabase
      .from('content')
      .update({ is_favorite })
      .eq('id', storyId);

    if (updateError) {
      console.error('Error updating favorite status:', updateError);
      return NextResponse.json(
        { error: 'Failed to update favorite status' },
        { status: 500 }
      );
    }

    return NextResponse.json({
      success: true,
      is_favorite,
      message: is_favorite ? 'Story added to favorites' : 'Story removed from favorites',
    });
  } catch (error: any) {
    console.error('Error updating favorite status:', error);
    return NextResponse.json(
      { error: error.message || 'Internal server error' },
      { status: 500 }
    );
  }
}
