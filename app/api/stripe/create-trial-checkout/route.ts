import { createClient } from '@/lib/supabase/server'
import { NextRequest, NextResponse } from 'next/server'
import Stripe from 'stripe'
import { getStoriesPlusPriceId } from '@/lib/stripe/price-mapping'
import { PRICING_CONFIG } from '@/lib/config/pricing-config'

// Lazy initialization of Stripe client
let stripeInstance: Stripe | null = null

function getStripe(): Stripe {
  if (!stripeInstance) {
    if (!process.env.STRIPE_SECRET_KEY) {
      throw new Error('STRIPE_SECRET_KEY is not configured')
    }
    stripeInstance = new Stripe(process.env.STRIPE_SECRET_KEY, {
      apiVersion: '2025-10-29.clover',
    })
  }
  return stripeInstance
}

/**
 * Create checkout session for Stories Plus subscription with 7-day free trial
 * This is used for onboarding pricing and paywall trial offers
 */
export async function POST(request: NextRequest) {
  try {
    const supabase = await createClient()

    // Check authentication
    const {
      data: { user },
      error: authError,
    } = await supabase.auth.getUser()

    if (authError || !user) {
      return NextResponse.json(
        { error: 'Authentication required' },
        { status: 401 }
      )
    }

    // Get user profile
    const { data: userProfile, error: userError } = await supabase
      .from('user_profiles')
      .select('email, stripe_customer_id')
      .eq('id', user.id)
      .single()

    if (userError || !userProfile) {
      return NextResponse.json(
        { error: 'User profile not found' },
        { status: 404 }
      )
    }

    // Get Stories Plus price ID
    const priceId = getStoriesPlusPriceId()
    if (!priceId) {
      return NextResponse.json(
        { error: 'Stories Plus price not configured' },
        { status: 500 }
      )
    }

    // Create or retrieve Stripe customer
    let customerId = userProfile.stripe_customer_id
    if (!customerId) {
      const customer = await getStripe().customers.create({
        email: userProfile.email,
        metadata: {
          supabase_user_id: user.id,
        },
      })
      customerId = customer.id

      // Save customer ID to database
      await supabase
        .from('user_profiles')
        .update({ stripe_customer_id: customerId })
        .eq('id', user.id)
    }

    // Get origin for success/cancel URLs
    const origin = request.headers.get('origin') || process.env.NEXT_PUBLIC_APP_URL || 'http://localhost:3000'

    // Create checkout session with 7-day trial
    const session = await getStripe().checkout.sessions.create({
      customer: customerId,
      mode: 'subscription',
      payment_method_types: ['card'],
      line_items: [
        {
          price: priceId,
          quantity: 1,
        },
      ],
      success_url: `${origin}/dashboard?subscription=trial_started`,
      cancel_url: `${origin}/onboarding/pricing?canceled=true`,
      metadata: {
        user_id: user.id,
        tier_id: PRICING_CONFIG.TIER_STORIES_PLUS,
        source: 'onboarding_trial',
      },
      subscription_data: {
        trial_period_days: PRICING_CONFIG.TRIAL_PERIOD_DAYS,
        metadata: {
          user_id: user.id,
          tier_id: PRICING_CONFIG.TIER_STORIES_PLUS,
          source: 'onboarding_trial',
        },
      },
      custom_text: {
        submit: {
          message: '🛡️ 30-Day Satisfaction Guarantee — Not loving it? Get a full refund if you\'ve created 3 or fewer stories. No questions asked.',
        },
      },
      allow_promotion_codes: true,
    })

    return NextResponse.json({
      sessionId: session.id,
      url: session.url,
    })
  } catch (error: any) {
    console.error('Trial checkout session error:', error)
    return NextResponse.json(
      { error: error.message || 'Failed to create trial checkout session' },
      { status: 500 }
    )
  }
}
