import { createClient } from '@/lib/supabase/server';
import { StripeService } from '@/lib/services/stripe-service';
import { NextRequest, NextResponse } from 'next/server';

export async function POST(request: NextRequest) {
  try {
    const supabase = await createClient();

    // Check authentication
    const {
      data: { user },
      error: authError,
    } = await supabase.auth.getUser();

    if (authError || !user) {
      return NextResponse.json(
        { error: 'Authentication required' },
        { status: 401 }
      );
    }

    // Get origin for return URL
    const origin = request.headers.get('origin') || process.env.NEXT_PUBLIC_APP_URL || 'http://localhost:3000';

    // Create billing portal session
    const session = await StripeService.createBillingPortalSession({
      userId: user.id,
      returnUrl: `${origin}/dashboard/billing`,
    });

    return NextResponse.json({
      url: session.url,
    });
  } catch (error: any) {
    console.error('Billing portal error:', error);
    return NextResponse.json(
      { error: error.message || 'Failed to create billing portal session' },
      { status: 500 }
    );
  }
}

// GET method to check if user has an active subscription
export async function GET(request: NextRequest) {
  try {
    const supabase = await createClient();

    // Check authentication
    const {
      data: { user },
      error: authError,
    } = await supabase.auth.getUser();

    if (authError || !user) {
      return NextResponse.json(
        { error: 'Authentication required' },
        { status: 401 }
      );
    }

    // Check if user has a Stripe customer ID
    const { data: userProfile, error } = await supabase
      .from('user_profiles')
      .select('stripe_customer_id, stripe_subscription_id, subscription_status')
      .eq('id', user.id)
      .single();

    if (error || !userProfile) {
      return NextResponse.json(
        { error: 'User profile not found' },
        { status: 404 }
      );
    }

    // Return subscription status
    return NextResponse.json({
      hasSubscription: !!userProfile.stripe_subscription_id,
      canAccessPortal: !!userProfile.stripe_customer_id,
      subscriptionStatus: userProfile.subscription_status,
    });
  } catch (error: any) {
    console.error('Billing portal check error:', error);
    return NextResponse.json(
      { error: 'Failed to check subscription status' },
      { status: 500 }
    );
  }
}