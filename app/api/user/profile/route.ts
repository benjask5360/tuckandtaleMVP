import { createClient } from '@/lib/supabase/server';
import { NextResponse } from 'next/server';

export async function GET() {
  try {
    const supabase = await createClient();

    // Get authenticated user
    const { data: { user }, error: authError } = await supabase.auth.getUser();

    if (authError || !user) {
      return NextResponse.json(
        { error: 'Unauthorized' },
        { status: 401 }
      );
    }

    // Get user profile with email preferences (now consolidated into user_profiles)
    const { data: profile, error: profileError } = await supabase
      .from('user_profiles')
      .select('*')
      .eq('id', user.id)
      .single();

    if (profileError) {
      console.error('Error fetching profile:', profileError);
      return NextResponse.json(
        { error: 'Failed to fetch profile' },
        { status: 500 }
      );
    }

    return NextResponse.json({
      email: user.email,
      full_name: profile.full_name,
      created_at: profile.created_at,
      email_verified: user.email_confirmed_at ? true : false,
      preferences: {
        email_marketing: profile.email_marketing ?? false,
        email_product_updates: profile.email_product_updates ?? true,
        email_account_notifications: profile.email_account_notifications ?? true,
      }
    });
  } catch (error) {
    console.error('Error in GET /api/user/profile:', error);
    return NextResponse.json(
      { error: 'Internal server error' },
      { status: 500 }
    );
  }
}

export async function PATCH(request: Request) {
  try {
    const supabase = await createClient();

    // Get authenticated user
    const { data: { user }, error: authError } = await supabase.auth.getUser();

    if (authError || !user) {
      return NextResponse.json(
        { error: 'Unauthorized' },
        { status: 401 }
      );
    }

    const body = await request.json();
    const { full_name, preferences } = body;

    // Build update object with only provided fields
    const updates: Record<string, any> = {};

    if (full_name !== undefined) {
      updates.full_name = full_name;
    }

    if (preferences !== undefined) {
      updates.email_marketing = preferences.email_marketing;
      updates.email_product_updates = preferences.email_product_updates;
      updates.email_account_notifications = preferences.email_account_notifications;
    }

    // Update user_profiles with all changes in one query
    if (Object.keys(updates).length > 0) {
      const { error: updateError } = await supabase
        .from('user_profiles')
        .update(updates)
        .eq('id', user.id);

      if (updateError) {
        console.error('Error updating profile:', updateError);
        return NextResponse.json(
          { error: 'Failed to update profile' },
          { status: 500 }
        );
      }
    }

    return NextResponse.json({ success: true });
  } catch (error) {
    console.error('Error in PATCH /api/user/profile:', error);
    return NextResponse.json(
      { error: 'Internal server error' },
      { status: 500 }
    );
  }
}
