import { createClient } from '@/lib/supabase/server';
import { NextRequest, NextResponse } from 'next/server';

interface UpdateStoryBody {
  title?: string;
  paragraphs?: string[];
  moral?: string;
}

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

export async function PUT(
  request: NextRequest,
  { params }: { params: { id: string } }
) {
  try {
    const supabase = await createClient();

    // Check authentication
    const {
      data: { user },
      error: authError,
    } = await supabase.auth.getUser();

    if (authError || !user) {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
    }

    // Get the story to verify ownership
    const { data: story, error: storyError } = await supabase
      .from('content')
      .select('id, user_id, title, body, generation_metadata')
      .eq('id', params.id)
      .eq('content_type', 'story')
      .single();

    if (storyError || !story) {
      return NextResponse.json({ error: 'Story not found' }, { status: 404 });
    }

    // Verify ownership
    if (story.user_id !== user.id) {
      return NextResponse.json({ error: 'Forbidden' }, { status: 403 });
    }

    // Parse request body
    const body: UpdateStoryBody = await request.json();

    // Validate inputs
    if (body.title !== undefined) {
      if (typeof body.title !== 'string' || body.title.trim().length === 0) {
        return NextResponse.json(
          { error: 'Title must be a non-empty string' },
          { status: 400 }
        );
      }
      if (body.title.length > 200) {
        return NextResponse.json(
          { error: 'Title must be 200 characters or less' },
          { status: 400 }
        );
      }
    }

    if (body.paragraphs !== undefined) {
      if (!Array.isArray(body.paragraphs)) {
        return NextResponse.json(
          { error: 'Paragraphs must be an array' },
          { status: 400 }
        );
      }
      if (body.paragraphs.length < 3 || body.paragraphs.length > 12) {
        return NextResponse.json(
          { error: 'Story must have between 3 and 12 paragraphs' },
          { status: 400 }
        );
      }
      // Validate each paragraph
      for (const paragraph of body.paragraphs) {
        if (typeof paragraph !== 'string' || paragraph.trim().length === 0) {
          return NextResponse.json(
            { error: 'All paragraphs must be non-empty strings' },
            { status: 400 }
          );
        }
      }
    }

    if (body.moral !== undefined) {
      if (typeof body.moral !== 'string') {
        return NextResponse.json(
          { error: 'Moral must be a string' },
          { status: 400 }
        );
      }
      if (body.moral.length > 500) {
        return NextResponse.json(
          { error: 'Moral must be 500 characters or less' },
          { status: 400 }
        );
      }
    }

    // Build update object
    const updates: {
      title?: string;
      body?: string;
      generation_metadata?: any;
    } = {};

    // Update title if provided
    if (body.title !== undefined) {
      updates.title = body.title.trim();
    }

    // Update paragraphs if provided
    if (body.paragraphs !== undefined) {
      updates.body = body.paragraphs.join('\n\n');
    }

    // Update generation_metadata
    const currentMetadata = story.generation_metadata || {};
    const updatedMetadata = { ...currentMetadata };

    // Mark as manually edited
    updatedMetadata.manually_edited = true;
    updatedMetadata.last_edited_at = new Date().toISOString();

    // Update paragraphs in metadata if provided
    if (body.paragraphs !== undefined) {
      updatedMetadata.paragraphs = body.paragraphs;
    }

    // Update moral if provided
    if (body.moral !== undefined) {
      updatedMetadata.moral = body.moral.trim();
    }

    updates.generation_metadata = updatedMetadata;

    // Perform the update
    const { error: updateError } = await supabase
      .from('content')
      .update(updates)
      .eq('id', params.id);

    if (updateError) {
      console.error('Error updating story:', updateError);
      return NextResponse.json(
        { error: 'Failed to update story', details: updateError.message },
        { status: 500 }
      );
    }

    // Fetch the updated story with all relations (same as GET endpoint)
    const { data: updatedStory, error: fetchError } = await supabase
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
      .eq('id', params.id)
      .eq('user_id', user.id)
      .single();

    if (fetchError) {
      console.error('Error fetching updated story:', fetchError);
      return NextResponse.json(
        { error: 'Story updated but failed to fetch', details: fetchError.message },
        { status: 500 }
      );
    }

    return NextResponse.json({ success: true, story: updatedStory }, { status: 200 });
  } catch (error) {
    console.error('Error in PUT /api/stories/[id]:', error);
    return NextResponse.json(
      { error: 'Internal server error' },
      { status: 500 }
    );
  }
}
