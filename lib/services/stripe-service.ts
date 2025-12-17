/**
 * Stripe Service
 * Handles all Stripe-related operations for the new pricing model
 *
 * New model:
 * - Stories Plus: $14.99/month subscription
 * - Single Story: $4.99 one-time purchase
 */

import Stripe from 'stripe'
import { createClient } from '@/lib/supabase/server'
import { createAdminClient } from '@/lib/supabase/admin'
import {
  getTierFromPriceId,
  isSubscriptionPriceId,
  getStoriesPlusPriceId,
} from '@/lib/stripe/price-mapping'
import { PRICING_CONFIG } from '@/lib/config/pricing-config'
import { PaywallService } from './paywall-service'
import { StoryCompletionService } from './story-completion'

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

export class StripeService {
  /**
   * Create a Stripe checkout session for Stories Plus subscription
   */
  static async createSubscriptionCheckout({
    userId,
    successUrl,
    cancelUrl,
  }: {
    userId: string
    successUrl: string
    cancelUrl: string
  }) {
    try {
      const supabase = await createClient()

      // Get user profile
      const { data: userProfile, error: userError } = await supabase
        .from('user_profiles')
        .select('email, stripe_customer_id')
        .eq('id', userId)
        .single()

      if (userError || !userProfile) {
        throw new Error('User profile not found')
      }

      // Get Stories Plus price ID
      const priceId = getStoriesPlusPriceId()
      if (!priceId) {
        throw new Error('Stories Plus price not configured')
      }

      // Create or retrieve Stripe customer
      let customerId = userProfile.stripe_customer_id
      if (!customerId) {
        const customer = await getStripe().customers.create({
          email: userProfile.email,
          metadata: {
            supabase_user_id: userId,
          },
        })
        customerId = customer.id

        // Save customer ID to database
        await supabase
          .from('user_profiles')
          .update({ stripe_customer_id: customerId })
          .eq('id', userId)
      }

      // Create checkout session
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
        success_url: successUrl,
        cancel_url: cancelUrl,
        metadata: {
          user_id: userId,
          tier_id: PRICING_CONFIG.TIER_STORIES_PLUS,
        },
        subscription_data: {
          metadata: {
            user_id: userId,
            tier_id: PRICING_CONFIG.TIER_STORIES_PLUS,
          },
        },
        allow_promotion_codes: true,
      })

      return {
        sessionId: session.id,
        url: session.url,
      }
    } catch (error: any) {
      console.error('Error creating subscription checkout:', error)
      throw new Error(error.message || 'Failed to create checkout session')
    }
  }

  /**
   * Create billing portal session for managing subscription
   */
  static async createBillingPortalSession({
    userId,
    returnUrl,
  }: {
    userId: string
    returnUrl: string
  }) {
    try {
      const supabase = await createClient()

      // Get user's Stripe customer ID
      const { data: userProfile, error } = await supabase
        .from('user_profiles')
        .select('stripe_customer_id')
        .eq('id', userId)
        .single()

      if (error || !userProfile?.stripe_customer_id) {
        throw new Error('No active subscription found')
      }

      // Create portal session
      const session = await getStripe().billingPortal.sessions.create({
        customer: userProfile.stripe_customer_id,
        return_url: returnUrl,
      })

      return {
        url: session.url,
      }
    } catch (error: any) {
      console.error('Error creating billing portal session:', error)
      throw new Error(error.message || 'Failed to create billing portal session')
    }
  }

  /**
   * Handle webhook events from Stripe
   */
  static async handleWebhookEvent(
    rawBody: string,
    signature: string
  ): Promise<{ received: boolean }> {
    try {
      // Verify webhook signature
      const event = getStripe().webhooks.constructEvent(
        rawBody,
        signature,
        process.env.STRIPE_WEBHOOK_SECRET!
      )

      const supabase = createAdminClient()

      // Handle different event types
      switch (event.type) {
        case 'checkout.session.completed': {
          const session = event.data.object as Stripe.Checkout.Session
          await this.handleCheckoutCompleted(session, supabase)
          break
        }

        case 'customer.subscription.created':
        case 'customer.subscription.updated': {
          const subscription = event.data.object as Stripe.Subscription
          await this.handleSubscriptionUpdate(subscription, supabase)
          break
        }

        case 'customer.subscription.deleted': {
          const subscription = event.data.object as Stripe.Subscription
          await this.handleSubscriptionCanceled(subscription, supabase)
          break
        }

        case 'invoice.payment_failed': {
          const invoice = event.data.object as Stripe.Invoice
          await this.handlePaymentFailed(invoice, supabase)
          break
        }

        default:
          console.log(`Unhandled webhook event type: ${event.type}`)
      }

      return { received: true }
    } catch (error: any) {
      console.error('Webhook error:', error)
      throw new Error(`Webhook Error: ${error.message}`)
    }
  }

  /**
   * Handle successful checkout - both subscriptions and one-time payments
   */
  private static async handleCheckoutCompleted(
    session: Stripe.Checkout.Session,
    supabase: any
  ) {
    console.log('[WEBHOOK] Processing checkout.session.completed', {
      sessionId: session.id,
      mode: session.mode,
      metadata: session.metadata,
    })

    const userId = session.metadata?.user_id
    if (!userId) {
      console.error('[WEBHOOK ERROR] Missing user_id in session metadata')
      return
    }

    // Handle one-time payment (single story purchase)
    if (session.mode === 'payment') {
      await this.handleSingleStoryPurchase(session, supabase, userId)
      return
    }

    // Handle subscription checkout
    if (session.mode === 'subscription') {
      await this.handleSubscriptionCheckoutCompleted(session, supabase, userId)
      return
    }
  }

  /**
   * Handle single story purchase ($4.99)
   */
  private static async handleSingleStoryPurchase(
    session: Stripe.Checkout.Session,
    supabase: any,
    userId: string
  ) {
    const storyId = session.metadata?.story_id
    const purchaseType = session.metadata?.purchase_type || 'generation_credit'

    console.log('[WEBHOOK] Processing single story purchase', {
      userId,
      storyId,
      purchaseType,
    })

    // Record the purchase
    const { error: purchaseError } = await supabase
      .from('story_purchases')
      .insert({
        user_id: userId,
        story_id: storyId || null,
        purchase_type: purchaseType,
        stripe_session_id: session.id,
        stripe_payment_intent_id: session.payment_intent,
        amount_cents: session.amount_total,
      })

    if (purchaseError) {
      console.error('[WEBHOOK ERROR] Failed to record purchase:', purchaseError)
      throw new Error('Failed to record purchase')
    }

    // Increment purchased_story_count for single_story purchases
    // This unlocks one additional preview slot (maxPreviewStory = 2 + purchased_story_count)
    if (purchaseType === 'single_story') {
      const { data: newCount, error: countError } = await supabase
        .rpc('increment_purchased_story_count', { p_user_id: userId })

      if (countError) {
        console.error('[WEBHOOK ERROR] Failed to increment purchased_story_count:', countError)
        // Don't throw - story purchase was recorded, user can contact support
      } else {
        console.log(`[WEBHOOK SUCCESS] Purchased story count incremented to ${newCount} for user ${userId}`)
      }
    }

    if (storyId) {
      // Unlock the specific story
      const { error: unlockError } = await supabase
        .from('content')
        .update({
          is_unlocked: true,
          unlock_purchase_id: session.id,
        })
        .eq('id', storyId)
        .eq('user_id', userId)

      if (unlockError) {
        console.error('[WEBHOOK ERROR] Failed to unlock story:', unlockError)
        throw new Error('Failed to unlock story')
      }

      console.log(`[WEBHOOK SUCCESS] Story ${storyId} unlocked for user ${userId}`)
    } else {
      // Add a generation credit
      const { error: creditError } = await supabase
        .rpc('increment_generation_credits', { p_user_id: userId })

      if (creditError) {
        console.error('[WEBHOOK ERROR] Failed to add generation credit:', creditError)
        throw new Error('Failed to add generation credit')
      }

      console.log(`[WEBHOOK SUCCESS] Generation credit added for user ${userId}`)
    }
  }

  /**
   * Handle subscription checkout completion
   */
  private static async handleSubscriptionCheckoutCompleted(
    session: Stripe.Checkout.Session,
    supabase: any,
    userId: string
  ) {
    if (!session.subscription) {
      console.error('[WEBHOOK ERROR] Missing subscription in checkout session')
      return
    }

    // Get subscription details
    const subscription = await getStripe().subscriptions.retrieve(
      session.subscription as string
    )

    console.log('[WEBHOOK DEBUG] Subscription retrieved:', {
      id: subscription.id,
      status: subscription.status,
      trial_start: subscription.trial_start,
      trial_end: subscription.trial_end,
    })

    // Get the price ID from subscription
    const subscriptionItem = subscription.items.data[0]
    const priceId = subscriptionItem?.price.id

    if (!priceId || !isSubscriptionPriceId(priceId)) {
      console.error('[WEBHOOK ERROR] Invalid subscription price ID:', priceId)
      return
    }

    // Get tier from price ID
    const tierId = getTierFromPriceId(priceId)
    if (!tierId) {
      console.error('[WEBHOOK ERROR] Could not determine tier from price:', priceId)
      return
    }

    // Determine subscription status - map from Stripe status
    // Stripe statuses: 'active', 'trialing', 'past_due', 'canceled', 'unpaid', 'incomplete', 'incomplete_expired', 'paused'
    let subscriptionStatus: string
    if (subscription.status === 'trialing') {
      subscriptionStatus = 'trialing'
    } else if (subscription.status === 'active') {
      subscriptionStatus = 'active'
    } else {
      // For checkout completion, status should only be 'trialing' or 'active'
      console.warn('[WEBHOOK WARNING] Unexpected subscription status:', subscription.status)
      subscriptionStatus = 'active'
    }
    console.log('[WEBHOOK DEBUG] Setting subscription_status to:', subscriptionStatus, '(Stripe status:', subscription.status, ')')

    // Update user profile - reset story count so they start fresh with their subscription
    const { error } = await supabase
      .from('user_profiles')
      .update({
        subscription_tier_id: tierId,
        stripe_customer_id: session.customer as string,
        stripe_subscription_id: subscription.id,
        subscription_status: subscriptionStatus,
        subscription_starts_at: new Date(subscriptionItem.current_period_start * 1000).toISOString(),
        subscription_ends_at: new Date(subscriptionItem.current_period_end * 1000).toISOString(),
        total_stories_generated: 0,
      })
      .eq('id', userId)

    if (error) {
      console.error('[WEBHOOK ERROR] Failed to update user profile:', error)
      throw new Error('Database update failed')
    }

    console.log(`[WEBHOOK SUCCESS] Subscription activated for user ${userId}`, {
      tier: tierId,
      subscriptionId: subscription.id,
    })
  }

  /**
   * Handle subscription update
   */
  private static async handleSubscriptionUpdate(
    subscription: Stripe.Subscription,
    supabase: any
  ) {
    const userId = subscription.metadata?.user_id
    if (!userId) {
      console.error('[WEBHOOK ERROR] Missing user_id in subscription metadata')
      return
    }

    const subscriptionItem = subscription.items.data[0]
    const priceId = subscriptionItem?.price.id

    if (!priceId || !isSubscriptionPriceId(priceId)) {
      console.error('[WEBHOOK ERROR] Invalid price ID in subscription update')
      return
    }

    const tierId = getTierFromPriceId(priceId)
    if (!tierId) return

    // Map Stripe status to our status
    const statusMap: Record<string, string> = {
      active: 'active',
      trialing: 'trialing',
      past_due: 'past_due',
      canceled: 'canceled',
      unpaid: 'inactive',
    }

    const status = statusMap[subscription.status] || 'inactive'

    const { error } = await supabase
      .from('user_profiles')
      .update({
        subscription_tier_id: tierId,
        stripe_subscription_id: subscription.id,
        subscription_status: status,
        subscription_starts_at: new Date(subscriptionItem.current_period_start * 1000).toISOString(),
        subscription_ends_at: new Date(subscriptionItem.current_period_end * 1000).toISOString(),
      })
      .eq('id', userId)

    if (error) {
      console.error('[WEBHOOK ERROR] Failed to update subscription:', error)
      throw new Error('Database update failed')
    }

    console.log(`[WEBHOOK SUCCESS] Subscription updated for user ${userId}`, {
      tier: tierId,
      status,
    })
  }

  /**
   * Handle subscription cancellation
   */
  private static async handleSubscriptionCanceled(
    subscription: Stripe.Subscription,
    supabase: any
  ) {
    let userId = subscription.metadata?.user_id

    // Fallback: lookup user by subscription ID
    if (!userId) {
      const { data: userBySubscription } = await supabase
        .from('user_profiles')
        .select('id')
        .eq('stripe_subscription_id', subscription.id)
        .single()

      if (userBySubscription) {
        userId = userBySubscription.id
      }
    }

    if (!userId) {
      console.warn('[WEBHOOK WARNING] Cannot find user for subscription cancellation')
      return
    }

    // Downgrade to free tier
    const { error } = await supabase
      .from('user_profiles')
      .update({
        subscription_tier_id: PRICING_CONFIG.TIER_FREE,
        subscription_status: 'inactive',
        subscription_ends_at: new Date().toISOString(),
      })
      .eq('id', userId)

    if (error) {
      console.error('[WEBHOOK ERROR] Failed to downgrade user:', error)
      throw new Error('Database update failed')
    }

    console.log(`[WEBHOOK SUCCESS] Subscription canceled - user ${userId} downgraded to free tier`)
  }

  /**
   * Handle failed payment
   */
  private static async handlePaymentFailed(
    invoice: Stripe.Invoice,
    supabase: any
  ) {
    // Get subscription ID from invoice
    const subscriptionId = (invoice as any).subscription
    if (!subscriptionId || typeof subscriptionId !== 'string') return

    // Get subscription to find user
    const subscription = await getStripe().subscriptions.retrieve(subscriptionId)

    const userId = subscription.metadata?.user_id
    if (!userId) return

    // Update subscription status to past_due
    await supabase
      .from('user_profiles')
      .update({
        subscription_status: 'past_due',
      })
      .eq('id', userId)

    console.log(`[WEBHOOK] Payment failed for user ${userId} - marked as past_due`)
  }

  /**
   * Cancel a subscription (at period end)
   */
  static async cancelSubscription(userId: string) {
    try {
      const supabase = await createClient()

      const { data: userProfile, error } = await supabase
        .from('user_profiles')
        .select('stripe_subscription_id')
        .eq('id', userId)
        .single()

      if (error || !userProfile?.stripe_subscription_id) {
        throw new Error('No active subscription found')
      }

      // Cancel at period end (user keeps access until then)
      await getStripe().subscriptions.update(userProfile.stripe_subscription_id, {
        cancel_at_period_end: true,
      })

      await supabase
        .from('user_profiles')
        .update({
          subscription_status: 'canceled',
        })
        .eq('id', userId)

      return { success: true }
    } catch (error: any) {
      console.error('Error canceling subscription:', error)
      throw new Error(error.message || 'Failed to cancel subscription')
    }
  }

  /**
   * Resume a canceled subscription (before period ends)
   */
  static async resumeSubscription(userId: string) {
    try {
      const supabase = await createClient()

      const { data: userProfile, error } = await supabase
        .from('user_profiles')
        .select('stripe_subscription_id')
        .eq('id', userId)
        .single()

      if (error || !userProfile?.stripe_subscription_id) {
        throw new Error('No subscription found')
      }

      // Resume subscription
      await getStripe().subscriptions.update(userProfile.stripe_subscription_id, {
        cancel_at_period_end: false,
      })

      await supabase
        .from('user_profiles')
        .update({
          subscription_status: 'active',
        })
        .eq('id', userId)

      return { success: true }
    } catch (error: any) {
      console.error('Error resuming subscription:', error)
      throw new Error(error.message || 'Failed to resume subscription')
    }
  }
}
