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
      return NextResponse.json({ error: 'Forbidden - Admin access required' }, { status: 403 });
    }

    // Get request body
    const { storyId, title } = await request.json();

    if (!storyId || !title || typeof title !== 'string') {
      return NextResponse.json({ error: 'Invalid request body' }, { status: 400 });
    }

    if (!title.trim()) {
      return NextResponse.json({ error: 'Title cannot be empty' }, { status: 400 });
    }

    // Use admin client to update the story title
    const adminSupabase = createAdminClient();
    const { data, error } = await adminSupabase
      .from('content')
      .update({ title: title.trim() })
      .eq('id', storyId)
      .eq('content_type', 'story')
      .select()
      .single();

    if (error) {
      console.error('Error updating story title:', error);
      return NextResponse.json({ error: 'Failed to update story title' }, { status: 500 });
    }

    return NextResponse.json({ success: true, story: data });
  } catch (error) {
    console.error('Error in update-story-title API:', error);
    return NextResponse.json({ error: 'Internal server error' }, { status: 500 });
  }
}
