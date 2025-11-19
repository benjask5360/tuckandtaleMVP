import { createClient } from '@/lib/supabase/server';
import { NextResponse } from 'next/server';

// GET: Check if user should see review modal
export async function GET() {
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

    // Check if user has been shown the review modal
    const { data: profile, error: profileError } = await supabase
      .from('user_profiles')
      .select('has_shown_review_modal')
      .eq('id', user.id)
      .single();

    if (profileError) {
      console.error('Error fetching user profile:', profileError);
      return NextResponse.json(
        { error: 'Failed to fetch user profile' },
        { status: 500 }
      );
    }

    return NextResponse.json({
      should_show_modal: !profile.has_shown_review_modal,
      has_shown_review_modal: profile.has_shown_review_modal,
    });
  } catch (error: any) {
    console.error('Error checking review modal status:', error);
    return NextResponse.json(
      { error: error.message || 'Internal server error' },
      { status: 500 }
    );
  }
}

// POST: Submit a review
export async function POST(request: Request) {
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

    const { story_id, rating, comment } = await request.json();

    // Validate rating
    if (!rating || rating < 1 || rating > 5) {
      return NextResponse.json(
        { error: 'Rating must be between 1 and 5' },
        { status: 400 }
      );
    }

    // Validate story_id is provided
    if (!story_id) {
      return NextResponse.json(
        { error: 'Story ID is required' },
        { status: 400 }
      );
    }

    // Verify story exists and user owns it
    const { data: story, error: fetchError } = await supabase
      .from('content')
      .select('id, user_id')
      .eq('id', story_id)
      .eq('user_id', user.id)
      .eq('content_type', 'story')
      .is('deleted_at', null)
      .single();

    if (fetchError || !story) {
      return NextResponse.json(
        { error: 'Story not found or access denied' },
        { status: 404 }
      );
    }

    // Insert review
    const { data: review, error: insertError } = await supabase
      .from('reviews')
      .insert({
        user_id: user.id,
        story_id,
        rating,
        comment: comment || null,
      })
      .select()
      .single();

    if (insertError) {
      console.error('Error inserting review:', insertError);
      return NextResponse.json(
        { error: 'Failed to submit review' },
        { status: 500 }
      );
    }

    // Mark user as having seen the review modal
    const { error: updateProfileError } = await supabase
      .from('user_profiles')
      .update({ has_shown_review_modal: true })
      .eq('id', user.id);

    if (updateProfileError) {
      console.error('Error updating user profile:', updateProfileError);
      // Don't fail the request if profile update fails
    }

    return NextResponse.json({
      success: true,
      review,
      message: 'Thank you for your feedback!',
    });
  } catch (error: any) {
    console.error('Error submitting review:', error);
    return NextResponse.json(
      { error: error.message || 'Internal server error' },
      { status: 500 }
    );
  }
}

// PATCH: Mark user as having seen the review modal (for "Not Now" action)
export async function PATCH() {
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

    // Mark user as having seen the review modal
    const { error: updateError } = await supabase
      .from('user_profiles')
      .update({ has_shown_review_modal: true })
      .eq('id', user.id);

    if (updateError) {
      console.error('Error updating user profile:', updateError);
      return NextResponse.json(
        { error: 'Failed to update user profile' },
        { status: 500 }
      );
    }

    return NextResponse.json({
      success: true,
      message: 'Review modal marked as shown',
    });
  } catch (error: any) {
    console.error('Error marking review modal as shown:', error);
    return NextResponse.json(
      { error: error.message || 'Internal server error' },
      { status: 500 }
    );
  }
}
