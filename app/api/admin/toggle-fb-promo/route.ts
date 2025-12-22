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
    const { storyId, featured, displayOrder } = await request.json();

    if (!storyId || typeof featured !== 'boolean') {
      return NextResponse.json({ error: 'Invalid request body' }, { status: 400 });
    }

    // Prepare update object
    const updateData: any = {
      featured_on_fb_promo: featured,
    };

    // Only update display order if provided
    if (typeof displayOrder === 'number') {
      updateData.fb_promo_display_order = displayOrder;
    }

    // Use admin client to update the story
    const adminSupabase = createAdminClient();
    const { data, error } = await adminSupabase
      .from('content')
      .update(updateData)
      .eq('id', storyId)
      .eq('content_type', 'story')
      .select()
      .single();

    if (error) {
      console.error('Error updating story:', error);
      return NextResponse.json({ error: 'Failed to update story' }, { status: 500 });
    }

    return NextResponse.json({ success: true, story: data });
  } catch (error) {
    console.error('Error in toggle-fb-promo API:', error);
    return NextResponse.json({ error: 'Internal server error' }, { status: 500 });
  }
}
