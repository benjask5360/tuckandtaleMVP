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

    // Get user profile
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

    // Get user preferences
    const { data: preferences, error: preferencesError } = await supabase
      .from('user_preferences')
      .select('*')
      .eq('id', user.id)
      .single();

    // If preferences don't exist, create them
    if (preferencesError && preferencesError.code === 'PGRST116') {
      const { data: newPreferences, error: createError } = await supabase
        .from('user_preferences')
        .insert({ id: user.id })
        .select()
        .single();

      if (createError) {
        console.error('Error creating preferences:', createError);
      }

      return NextResponse.json({
        email: user.email,
        full_name: profile.full_name,
        created_at: profile.created_at,
        email_verified: user.email_confirmed_at ? true : false,
        preferences: newPreferences || {
          email_marketing: false,
          email_product_updates: true,
          email_account_notifications: true,
        }
      });
    }

    if (preferencesError) {
      console.error('Error fetching preferences:', preferencesError);
    }

    return NextResponse.json({
      email: user.email,
      full_name: profile.full_name,
      created_at: profile.created_at,
      email_verified: user.email_confirmed_at ? true : false,
      preferences: preferences || {
        email_marketing: false,
        email_product_updates: true,
        email_account_notifications: true,
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

    // Update full name if provided
    if (full_name !== undefined) {
      const { error: profileError } = await supabase
        .from('user_profiles')
        .update({ full_name })
        .eq('id', user.id);

      if (profileError) {
        console.error('Error updating profile:', profileError);
        return NextResponse.json(
          { error: 'Failed to update profile' },
          { status: 500 }
        );
      }
    }

    // Update preferences if provided
    if (preferences !== undefined) {
      const { error: preferencesError } = await supabase
        .from('user_preferences')
        .upsert({
          id: user.id,
          email_marketing: preferences.email_marketing,
          email_product_updates: preferences.email_product_updates,
          email_account_notifications: preferences.email_account_notifications,
        });

      if (preferencesError) {
        console.error('Error updating preferences:', preferencesError);
        return NextResponse.json(
          { error: 'Failed to update preferences' },
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
