import { createClient } from '@/lib/supabase/server';
import { StripeService } from '@/lib/services/stripe-service';
import { NextRequest, NextResponse } from 'next/server';

/**
 * Create checkout session for Stories Plus subscription
 * This is the main endpoint for subscribing to the monthly plan
 */
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

    // Get origin for success/cancel URLs
    const origin = request.headers.get('origin') || process.env.NEXT_PUBLIC_APP_URL || 'http://localhost:3000';

    // Create subscription checkout session for Stories Plus
    const session = await StripeService.createSubscriptionCheckout({
      userId: user.id,
      successUrl: `${origin}/dashboard?subscription=success`,
      cancelUrl: `${origin}/dashboard/billing?canceled=true`,
    });

    return NextResponse.json({
      sessionId: session.sessionId,
      url: session.url,
    });
  } catch (error: any) {
    console.error('Checkout session error:', error);
    return NextResponse.json(
      { error: error.message || 'Failed to create checkout session' },
      { status: 500 }
    );
  }
}
