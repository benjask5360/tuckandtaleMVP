import { NextRequest, NextResponse } from 'next/server';
import { createClient } from '@/lib/supabase/server';
import Stripe from 'stripe';

const stripe = new Stripe(process.env.STRIPE_SECRET_KEY!, {
  apiVersion: '2025-10-29.clover',
});

/**
 * Admin endpoint to manually fix user subscription tier
 * Useful for correcting users who got stuck due to webhook failures
 *
 * POST /api/admin/fix-subscription
 * Body: { email: string } or { userId: string }
 *
 * This endpoint will:
 * 1. Look up the user's Stripe subscription
 * 2. Determine the correct tier from their active subscription
 * 3. Update the database to match Stripe's records
 */
export async function POST(request: NextRequest) {
  try {
    const supabase = await createClient();

    // Check if user is authenticated (you should add admin role check here)
    const { data: { user } } = await supabase.auth.getUser();
    if (!user) {
      return NextResponse.json(
        { error: 'Unauthorized' },
        { status: 401 }
      );
    }

    // Parse request body
    const body = await request.json();
    const { email, userId } = body;

    if (!email && !userId) {
      return NextResponse.json(
        { error: 'Either email or userId is required' },
        { status: 400 }
      );
    }

    console.log('[ADMIN] Fixing subscription for:', { email, userId });

    // Get user profile
    let query = supabase
      .from('user_profiles')
      .select('*');

    if (userId) {
      query = query.eq('id', userId);
    } else {
      query = query.eq('email', email);
    }

    const { data: profileData, error: profileError } = await query.single();
    const profile = profileData;

    if (profileError || !profile) {
      console.error('[ADMIN ERROR] User not found', { email, userId, error: profileError });
      return NextResponse.json(
        { error: 'User not found' },
        { status: 404 }
      );
    }

    console.log('[ADMIN] Found user:', {
      id: profile.id,
      email: profile.email,
      currentTier: profile.subscription_tier_id,
      stripeCustomerId: profile.stripe_customer_id,
      stripeSubscriptionId: profile.stripe_subscription_id,
    });

    // If no Stripe customer ID, they're truly free tier
    if (!profile.stripe_customer_id) {
      return NextResponse.json({
        message: 'User has no Stripe customer ID - they are on free tier',
        user: {
          id: profile.id,
          email: profile.email,
          tier: profile.subscription_tier_id,
        },
      });
    }

    // Fetch active subscriptions from Stripe
    const subscriptions = await stripe.subscriptions.list({
      customer: profile.stripe_customer_id,
      status: 'all',
      limit: 10,
    });

    console.log('[ADMIN] Found Stripe subscriptions:', {
      count: subscriptions.data.length,
      subscriptions: subscriptions.data.map(sub => ({
        id: sub.id,
        status: sub.status,
        priceId: sub.items.data[0]?.price.id,
      })),
    });

    // Find active subscription
    const activeSubscription = subscriptions.data.find(
      sub => sub.status === 'active' || sub.status === 'trialing'
    );

    if (!activeSubscription) {
      // No active subscription - should be on free tier
      console.log('[ADMIN] No active subscription found, setting to free tier');

      const { error: updateError } = await supabase
        .from('user_profiles')
        .update({
          subscription_tier_id: 'tier_free',
          subscription_status: 'inactive',
          subscription_ends_at: new Date().toISOString(),
        })
        .eq('id', profile.id);

      if (updateError) {
        console.error('[ADMIN ERROR] Failed to update user to free tier', updateError);
        return NextResponse.json(
          { error: 'Failed to update user profile' },
          { status: 500 }
        );
      }

      return NextResponse.json({
        message: 'User had no active subscription - updated to free tier',
        user: {
          id: profile.id,
          email: profile.email,
          oldTier: profile.subscription_tier_id,
          newTier: 'tier_free',
        },
      });
    }

    // Determine tier from price ID
    const priceId = activeSubscription.items.data[0]?.price.id;
    if (!priceId) {
      return NextResponse.json(
        { error: 'Could not determine price ID from subscription' },
        { status: 500 }
      );
    }

    // Import price mapping
    const { getTierFromPriceId } = await import('@/lib/stripe/price-mapping');
    const correctTier = getTierFromPriceId(priceId);

    if (!correctTier) {
      console.error('[ADMIN ERROR] Could not map price ID to tier', {
        priceId,
        subscriptionId: activeSubscription.id,
      });
      return NextResponse.json(
        {
          error: 'Price ID not recognized',
          details: {
            priceId,
            subscriptionId: activeSubscription.id,
          }
        },
        { status: 500 }
      );
    }

    console.log('[ADMIN] Determined correct tier:', {
      priceId,
      tier: correctTier,
      currentTier: profile.subscription_tier_id,
      needsUpdate: profile.subscription_tier_id !== correctTier,
    });

    // Update user profile to match Stripe
    const subscriptionItem = activeSubscription.items.data[0];
    const { error: updateError } = await supabase
      .from('user_profiles')
      .update({
        subscription_tier_id: correctTier,
        stripe_subscription_id: activeSubscription.id,
        subscription_status: activeSubscription.status === 'active' ? 'active' : 'trialing',
        subscription_starts_at: new Date(subscriptionItem.current_period_start * 1000).toISOString(),
        subscription_ends_at: new Date(subscriptionItem.current_period_end * 1000).toISOString(),
      })
      .eq('id', profile.id);

    if (updateError) {
      console.error('[ADMIN ERROR] Failed to update user profile', updateError);
      return NextResponse.json(
        { error: 'Failed to update user profile' },
        { status: 500 }
      );
    }

    console.log('[ADMIN SUCCESS] Updated user subscription', {
      userId: profile.id,
      oldTier: profile.subscription_tier_id,
      newTier: correctTier,
      subscriptionId: activeSubscription.id,
    });

    return NextResponse.json({
      message: 'Subscription fixed successfully',
      user: {
        id: profile.id,
        email: profile.email,
        oldTier: profile.subscription_tier_id,
        newTier: correctTier,
        subscriptionId: activeSubscription.id,
        status: activeSubscription.status,
      },
    });

  } catch (error: any) {
    console.error('[ADMIN ERROR] Exception in fix-subscription:', error);
    return NextResponse.json(
      {
        error: 'Internal server error',
        details: error.message
      },
      { status: 500 }
    );
  }
}
