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
    const { updates } = await request.json();

    if (!updates || !Array.isArray(updates)) {
      return NextResponse.json({ error: 'Invalid request body' }, { status: 400 });
    }

    // Use admin client to update stories
    const adminSupabase = createAdminClient();

    // Update each story's display order
    const updatePromises = updates.map(({ storyId, displayOrder }) =>
      adminSupabase
        .from('content')
        .update({ fb_promo_display_order: displayOrder })
        .eq('id', storyId)
        .eq('content_type', 'story')
    );

    const results = await Promise.all(updatePromises);

    // Check if any updates failed
    const errors = results.filter(result => result.error);
    if (errors.length > 0) {
      console.error('Error updating carousel order:', errors);
      return NextResponse.json({ error: 'Failed to update some stories' }, { status: 500 });
    }

    return NextResponse.json({ success: true });
  } catch (error) {
    console.error('Error in update-carousel-order API:', error);
    return NextResponse.json({ error: 'Internal server error' }, { status: 500 });
  }
}
