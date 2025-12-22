import { NextRequest, NextResponse } from 'next/server';
import { createClient } from '@/lib/supabase/server';
import { createAdminClient } from '@/lib/supabase/admin';

export async function POST(request: NextRequest) {
  try {
    const supabase = await createClient();

    // Check authentication
    const { data: { user }, error: authError } = await supabase.auth.getUser();
    if (authError || !user) {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
    }

    // Check admin privileges
    const { data: userProfile, error: profileError } = await supabase
      .from('user_profiles')
      .select('user_type')
      .eq('id', user.id)
      .single();

    if (profileError || userProfile?.user_type !== 'admin') {
      return NextResponse.json({ error: 'Forbidden' }, { status: 403 });
    }

    const body = await request.json();
    const { storyId, updateType, value, sceneIndex } = body;

    if (!storyId || !updateType) {
      return NextResponse.json({ error: 'Missing required fields' }, { status: 400 });
    }

    // Use admin client to fetch story
    const adminSupabase = createAdminClient();
    const { data: story, error: storyError } = await adminSupabase
      .from('content')
      .select('*')
      .eq('id', storyId)
      .eq('content_type', 'story')
      .single();

    if (storyError || !story) {
      return NextResponse.json({ error: 'Story not found' }, { status: 404 });
    }

    // Verify the current user owns this story
    if (story.user_id !== user.id) {
      return NextResponse.json({ error: 'You can only edit your own stories' }, { status: 403 });
    }

    // Handle different update types
    if (updateType === 'title') {
      // Update story title
      const { error: updateError } = await adminSupabase
        .from('content')
        .update({ title: value })
        .eq('id', storyId);

      if (updateError) {
        console.error('Error updating title:', updateError);
        return NextResponse.json({ error: 'Failed to update title' }, { status: 500 });
      }

      return NextResponse.json({ success: true, message: 'Title updated successfully' });
    } else if (updateType === 'sceneText') {
      // Update scene text in generation_metadata.paragraphs
      if (sceneIndex === undefined) {
        return NextResponse.json({ error: 'Scene index is required' }, { status: 400 });
      }

      const metadata = story.generation_metadata as any;

      // Find paragraphs array
      let paragraphs: string[] = [];
      if (metadata?.paragraphs && Array.isArray(metadata.paragraphs)) {
        paragraphs = [...metadata.paragraphs];
      } else if (metadata?.v3_story?.paragraphs && Array.isArray(metadata.v3_story.paragraphs)) {
        paragraphs = metadata.v3_story.paragraphs.map((p: any) => p.text);
      } else {
        return NextResponse.json({ error: 'No paragraphs found in story' }, { status: 400 });
      }

      // Update the specific paragraph
      if (sceneIndex < 0 || sceneIndex >= paragraphs.length) {
        return NextResponse.json({ error: 'Invalid scene index' }, { status: 400 });
      }

      paragraphs[sceneIndex] = value;

      // Update the metadata with modified paragraphs
      const updatedMetadata = {
        ...metadata,
        paragraphs: paragraphs
      };

      const { error: updateError } = await adminSupabase
        .from('content')
        .update({ generation_metadata: updatedMetadata })
        .eq('id', storyId);

      if (updateError) {
        console.error('Error updating scene text:', updateError);
        return NextResponse.json({ error: 'Failed to update scene text' }, { status: 500 });
      }

      return NextResponse.json({ success: true, message: 'Scene text updated successfully' });
    } else {
      return NextResponse.json({ error: 'Invalid update type' }, { status: 400 });
    }
  } catch (error) {
    console.error('Error in story update API:', error);
    return NextResponse.json({ error: 'Internal server error' }, { status: 500 });
  }
}
