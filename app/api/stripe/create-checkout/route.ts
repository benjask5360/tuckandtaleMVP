import { createClient } from '@/lib/supabase/server';
import { StripeService } from '@/lib/services/stripe-service';
import { NextRequest, NextResponse } from 'next/server';
import type { BillingPeriod } from '@/lib/types/subscription-types';

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

    // Parse request body
    const body = await request.json();
    const { tierId, billingPeriod } = body;

    // Validate input
    if (!tierId || !['tier_basic', 'tier_plus'].includes(tierId)) {
      return NextResponse.json(
        { error: 'Invalid tier selected' },
        { status: 400 }
      );
    }

    if (!billingPeriod || !['monthly', 'yearly'].includes(billingPeriod)) {
      return NextResponse.json(
        { error: 'Invalid billing period' },
        { status: 400 }
      );
    }

    // Don't allow checkout for free tier
    if (tierId === 'tier_free') {
      return NextResponse.json(
        { error: 'Free tier does not require payment' },
        { status: 400 }
      );
    }

    // Get origin for success/cancel URLs
    const origin = request.headers.get('origin') || process.env.NEXT_PUBLIC_APP_URL || 'http://localhost:3000';

    // Create checkout session
    const session = await StripeService.createCheckoutSession({
      userId: user.id,
      tierId,
      billingPeriod: billingPeriod as BillingPeriod,
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