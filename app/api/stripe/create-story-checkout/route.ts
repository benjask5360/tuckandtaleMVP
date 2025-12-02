/**
 * Create Story Checkout API Route
 * Creates Stripe Checkout sessions for single story purchases ($4.99)
 *
 * Two modes:
 * 1. With storyId: Unlock a specific story (for story #2 paywall)
 * 2. Without storyId: Buy a generation credit (for story #3+ pre-generation paywall)
 */

import { NextResponse } from 'next/server'
import { createClient } from '@/lib/supabase/server'
import Stripe from 'stripe'
import { getSingleStoryPriceId } from '@/lib/stripe/price-mapping'

const stripe = new Stripe(process.env.STRIPE_SECRET_KEY!, {
  apiVersion: '2025-10-29.clover',
})

export async function POST(request: Request) {
  try {
    const supabase = await createClient()

    // Get authenticated user
    const { data: { user }, error: authError } = await supabase.auth.getUser()

    if (authError || !user) {
      return NextResponse.json(
        { error: 'Unauthorized' },
        { status: 401 }
      )
    }

    // Parse request body
    const body = await request.json()
    const { storyId } = body as { storyId?: string }

    // Validate storyId if provided
    if (storyId) {
      const { data: story, error: storyError } = await supabase
        .from('content')
        .select('id, user_id, title')
        .eq('id', storyId)
        .single()

      if (storyError || !story) {
        return NextResponse.json(
          { error: 'Story not found' },
          { status: 404 }
        )
      }

      if (story.user_id !== user.id) {
        return NextResponse.json(
          { error: 'Story does not belong to user' },
          { status: 403 }
        )
      }
    }

    // Get or create Stripe customer
    const { data: profile } = await supabase
      .from('user_profiles')
      .select('stripe_customer_id, email')
      .eq('id', user.id)
      .single()

    let customerId = profile?.stripe_customer_id

    if (!customerId) {
      // Create new Stripe customer
      const customer = await stripe.customers.create({
        email: user.email || profile?.email,
        metadata: {
          user_id: user.id,
        },
      })
      customerId = customer.id

      // Save customer ID to profile
      await supabase
        .from('user_profiles')
        .update({ stripe_customer_id: customerId })
        .eq('id', user.id)
    }

    // Get the single story price ID
    const priceId = getSingleStoryPriceId()

    if (!priceId) {
      console.error('Single story price ID not configured')
      return NextResponse.json(
        { error: 'Payment configuration error' },
        { status: 500 }
      )
    }

    // Determine success/cancel URLs based on whether unlocking specific story or buying credit
    const baseUrl = process.env.NEXT_PUBLIC_APP_URL || 'http://localhost:3000'

    const successUrl = storyId
      ? `${baseUrl}/dashboard/stories/v3/${storyId}?unlocked=true`
      : `${baseUrl}/dashboard/stories/create?credit=purchased`

    const cancelUrl = storyId
      ? `${baseUrl}/dashboard/stories/v3/${storyId}`
      : `${baseUrl}/dashboard/stories/create`

    // Create Stripe Checkout session in payment mode (one-time)
    const session = await stripe.checkout.sessions.create({
      mode: 'payment',
      customer: customerId,
      line_items: [
        {
          price: priceId,
          quantity: 1,
        },
      ],
      metadata: {
        user_id: user.id,
        story_id: storyId || '',
        purchase_type: storyId ? 'single_story' : 'generation_credit',
      },
      success_url: successUrl,
      cancel_url: cancelUrl,
      // Allow promotion codes
      allow_promotion_codes: true,
    })

    return NextResponse.json({ url: session.url })
  } catch (error) {
    console.error('Error creating story checkout session:', error)
    return NextResponse.json(
      { error: 'Failed to create checkout session' },
      { status: 500 }
    )
  }
}
