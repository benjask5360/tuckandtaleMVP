import { createClient } from '@/lib/supabase/server';
import { NextResponse } from 'next/server';

export async function GET(
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

    // Fetch story from stories VIEW (filters to active stories only)
    const { data: story, error } = await supabase
      .from('stories')
      .select(`
        *,
        story_illustrations,
        content_characters (
          character_profile_id,
          role,
          character_name_in_content,
          character_profiles (
            id,
            name,
            character_type,
            attributes,
            appearance_description,
            avatar_cache:avatar_cache_id (
              image_url
            )
          )
        )
      `)
      .eq('id', storyId)
      .eq('user_id', user.id)
      .single();

    if (error) {
      if (error.code === 'PGRST116') {
        return NextResponse.json(
          { error: 'Story not found' },
          { status: 404 }
        );
      }
      console.error('Error fetching story:', error);
      return NextResponse.json(
        { error: 'Failed to fetch story' },
        { status: 500 }
      );
    }

    return NextResponse.json({
      success: true,
      story,
    });
  } catch (error: any) {
    console.error('Error fetching story:', error);
    return NextResponse.json(
      { error: error.message || 'Internal server error' },
      { status: 500 }
    );
  }
}

export async function DELETE(
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

    // Soft delete by setting deleted_at
    const { error } = await supabase
      .from('content')
      .update({ deleted_at: new Date().toISOString() })
      .eq('id', storyId)
      .eq('user_id', user.id)
      .eq('content_type', 'story');

    if (error) {
      console.error('Error deleting story:', error);
      return NextResponse.json(
        { error: 'Failed to delete story' },
        { status: 500 }
      );
    }

    return NextResponse.json({
      success: true,
      message: 'Story deleted successfully',
    });
  } catch (error: any) {
    console.error('Error deleting story:', error);
    return NextResponse.json(
      { error: error.message || 'Internal server error' },
      { status: 500 }
    );
  }
}
