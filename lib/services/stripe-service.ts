/**
 * Stripe Service
 * Handles all Stripe-related operations for subscription management
 */

import Stripe from 'stripe';
import { createClient } from '@/lib/supabase/server';
import { SubscriptionTierService } from './subscription-tier';
import { getTierFromPriceId, isValidPriceId, getBillingPeriodFromPriceId, PRICE_TO_TIER_MAP } from '@/lib/stripe/price-mapping';
import type { BillingPeriod, SubscriptionTier } from '@/lib/types/subscription-types';

// Lazy initialization of Stripe client to avoid build-time errors
let stripeInstance: Stripe | null = null;

function getStripe(): Stripe {
  if (!stripeInstance) {
    if (!process.env.STRIPE_SECRET_KEY) {
      throw new Error('STRIPE_SECRET_KEY is not configured');
    }
    stripeInstance = new Stripe(process.env.STRIPE_SECRET_KEY, {
      apiVersion: '2025-10-29.clover',
    });
  }
  return stripeInstance;
}

export class StripeService {
  /**
   * Create a Stripe checkout session for subscription
   */
  static async createCheckoutSession({
    userId,
    tierId,
    billingPeriod,
    successUrl,
    cancelUrl,
  }: {
    userId: string;
    tierId: string;
    billingPeriod: BillingPeriod;
    successUrl: string;
    cancelUrl: string;
  }) {
    try {
      const supabase = await createClient();

      // Get user profile
      const { data: userProfile, error: userError } = await supabase
        .from('user_profiles')
        .select('email, stripe_customer_id')
        .eq('id', userId)
        .single();

      if (userError || !userProfile) {
        throw new Error('User profile not found');
      }

      // Get subscription tier with price IDs
      const tier = await SubscriptionTierService.getTierById(tierId);

      // Select appropriate price ID based on promo status and billing period
      const priceId = this.selectPriceId(tier, billingPeriod);
      if (!priceId) {
        throw new Error(`No price configured for ${tierId} ${billingPeriod}`);
      }

      // Create or retrieve Stripe customer
      let customerId = userProfile.stripe_customer_id;
      if (!customerId) {
        const customer = await getStripe().customers.create({
          email: userProfile.email,
          metadata: {
            supabase_user_id: userId,
          },
        });
        customerId = customer.id;

        // Save customer ID to database
        await supabase
          .from('user_profiles')
          .update({ stripe_customer_id: customerId })
          .eq('id', userId);
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
          tier_id: tierId,
          billing_period: billingPeriod,
        },
        subscription_data: {
          metadata: {
            user_id: userId,
            tier_id: tierId,
          },
        },
        allow_promotion_codes: true, // Allow Stripe coupon codes
      });

      return {
        sessionId: session.id,
        url: session.url,
      };
    } catch (error: any) {
      console.error('Error creating checkout session:', error);
      throw new Error(error.message || 'Failed to create checkout session');
    }
  }

  /**
   * Create billing portal session for managing subscription
   */
  static async createBillingPortalSession({
    userId,
    returnUrl,
  }: {
    userId: string;
    returnUrl: string;
  }) {
    try {
      const supabase = await createClient();

      // Get user's Stripe customer ID
      const { data: userProfile, error } = await supabase
        .from('user_profiles')
        .select('stripe_customer_id')
        .eq('id', userId)
        .single();

      if (error || !userProfile?.stripe_customer_id) {
        throw new Error('No active subscription found');
      }

      // Create portal session
      const session = await getStripe().billingPortal.sessions.create({
        customer: userProfile.stripe_customer_id,
        return_url: returnUrl,
      });

      return {
        url: session.url,
      };
    } catch (error: any) {
      console.error('Error creating billing portal session:', error);
      throw new Error(error.message || 'Failed to create billing portal session');
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
      );

      const supabase = await createClient();

      // Handle different event types
      switch (event.type) {
        case 'checkout.session.completed': {
          const session = event.data.object as Stripe.Checkout.Session;
          await this.handleCheckoutCompleted(session, supabase);
          break;
        }

        case 'customer.subscription.created':
        case 'customer.subscription.updated': {
          const subscription = event.data.object as Stripe.Subscription;
          await this.handleSubscriptionUpdate(subscription, supabase);
          break;
        }

        case 'customer.subscription.deleted': {
          const subscription = event.data.object as Stripe.Subscription;
          await this.handleSubscriptionCanceled(subscription, supabase);
          break;
        }

        case 'invoice.payment_failed': {
          const invoice = event.data.object as Stripe.Invoice;
          await this.handlePaymentFailed(invoice, supabase);
          break;
        }

        default:
          console.log(`Unhandled webhook event type: ${event.type}`);
      }

      return { received: true };
    } catch (error: any) {
      console.error('Webhook error:', error);
      throw new Error(`Webhook Error: ${error.message}`);
    }
  }

  /**
   * Handle successful checkout
   */
  private static async handleCheckoutCompleted(
    session: Stripe.Checkout.Session,
    supabase: any
  ) {
    console.log('[WEBHOOK] Processing checkout.session.completed', {
      sessionId: session.id,
      customer: session.customer,
      subscription: session.subscription,
      metadata: session.metadata,
    });

    if (!session.customer || !session.subscription) {
      console.error('[WEBHOOK ERROR] Missing customer or subscription in checkout session', {
        sessionId: session.id,
        hasCustomer: !!session.customer,
        hasSubscription: !!session.subscription,
      });
      return;
    }

    const userId = session.metadata?.user_id;
    if (!userId) {
      console.error('[WEBHOOK ERROR] Missing user_id in session metadata', {
        sessionId: session.id,
        metadata: session.metadata,
        customer: session.customer,
      });
      return;
    }

    console.log(`[WEBHOOK] Found user_id: ${userId}, retrieving subscription details...`);

    // Get subscription details
    const subscription = await getStripe().subscriptions.retrieve(
      session.subscription as string
    );

    // Get the price ID and billing period from the subscription item
    const subscriptionItem = subscription.items.data[0];
    const priceId = subscriptionItem?.price.id;

    console.log('[WEBHOOK] Price ID from subscription:', priceId);

    if (!priceId || !isValidPriceId(priceId)) {
      console.error('[WEBHOOK ERROR] Invalid price ID', {
        priceId,
        userId,
        subscriptionId: subscription.id,
        availablePriceIds: Object.keys(PRICE_TO_TIER_MAP),
      });
      return;
    }

    // Get tier from price ID
    const tierId = getTierFromPriceId(priceId);
    if (!tierId) {
      console.error('[WEBHOOK ERROR] Could not determine tier from price', {
        priceId,
        userId,
        subscriptionId: subscription.id,
      });
      return;
    }

    console.log(`[WEBHOOK] Mapped price ${priceId} to tier ${tierId}, updating database...`);

    // Update user profile
    const { data, error } = await supabase
      .from('user_profiles')
      .update({
        subscription_tier_id: tierId,
        stripe_customer_id: session.customer as string,
        stripe_subscription_id: subscription.id,
        subscription_status: 'active',
        subscription_starts_at: new Date(subscriptionItem.current_period_start * 1000).toISOString(),
        subscription_ends_at: new Date(subscriptionItem.current_period_end * 1000).toISOString(),
      })
      .eq('id', userId)
      .select();

    if (error) {
      console.error('[WEBHOOK ERROR] Failed to update user profile', {
        userId,
        tierId,
        error: error.message,
        errorDetails: error,
      });
      throw new Error(`Database update failed: ${error.message}`);
    }

    if (!data || data.length === 0) {
      console.error('[WEBHOOK ERROR] No user found with ID', {
        userId,
        tierId,
      });
      throw new Error(`User not found: ${userId}`);
    }

    console.log(`[WEBHOOK SUCCESS] Subscription activated for user ${userId}`, {
      tier: tierId,
      status: 'active',
      subscriptionId: subscription.id,
      periodStart: new Date(subscriptionItem.current_period_start * 1000).toISOString(),
      periodEnd: new Date(subscriptionItem.current_period_end * 1000).toISOString(),
    });
  }

  /**
   * Handle subscription update
   */
  private static async handleSubscriptionUpdate(
    subscription: Stripe.Subscription,
    supabase: any
  ) {
    console.log('[WEBHOOK] Processing subscription update', {
      subscriptionId: subscription.id,
      status: subscription.status,
      metadata: subscription.metadata,
    });

    const userId = subscription.metadata?.user_id;
    if (!userId) {
      console.error('[WEBHOOK ERROR] Missing user_id in subscription metadata', {
        subscriptionId: subscription.id,
        metadata: subscription.metadata,
      });
      return;
    }

    // Get the price ID and billing period from the subscription item
    const subscriptionItem = subscription.items.data[0];
    const priceId = subscriptionItem?.price.id;

    console.log('[WEBHOOK] Price ID from subscription:', priceId);

    if (!priceId || !isValidPriceId(priceId)) {
      console.error('[WEBHOOK ERROR] Invalid price ID', {
        priceId,
        userId,
        subscriptionId: subscription.id,
      });
      return;
    }

    // Get tier from price ID
    const tierId = getTierFromPriceId(priceId);
    if (!tierId) {
      console.error('[WEBHOOK ERROR] Could not determine tier from price', {
        priceId,
        userId,
        subscriptionId: subscription.id,
      });
      return;
    }

    // Map Stripe status to our status
    const statusMap: Record<string, string> = {
      active: 'active',
      trialing: 'trialing',
      past_due: 'past_due',
      canceled: 'canceled',
      unpaid: 'inactive',
    };

    const status = statusMap[subscription.status] || 'inactive';

    console.log(`[WEBHOOK] Updating user ${userId} to tier ${tierId}, status ${status}...`);

    // Update user profile
    const { data, error } = await supabase
      .from('user_profiles')
      .update({
        subscription_tier_id: tierId,
        stripe_subscription_id: subscription.id,
        subscription_status: status,
        subscription_starts_at: new Date(subscriptionItem.current_period_start * 1000).toISOString(),
        subscription_ends_at: new Date(subscriptionItem.current_period_end * 1000).toISOString(),
      })
      .eq('id', userId)
      .select();

    if (error) {
      console.error('[WEBHOOK ERROR] Failed to update user profile', {
        userId,
        tierId,
        status,
        error: error.message,
        errorDetails: error,
      });
      throw new Error(`Database update failed: ${error.message}`);
    }

    if (!data || data.length === 0) {
      console.error('[WEBHOOK ERROR] No user found with ID', {
        userId,
        tierId,
      });
      throw new Error(`User not found: ${userId}`);
    }

    console.log(`[WEBHOOK SUCCESS] Subscription updated for user ${userId}`, {
      tier: tierId,
      status,
      subscriptionId: subscription.id,
    });
  }

  /**
   * Handle subscription cancellation
   */
  private static async handleSubscriptionCanceled(
    subscription: Stripe.Subscription,
    supabase: any
  ) {
    console.log('[WEBHOOK] Processing subscription cancellation', {
      subscriptionId: subscription.id,
      metadata: subscription.metadata,
    });

    const userId = subscription.metadata?.user_id;
    if (!userId) {
      console.error('[WEBHOOK ERROR] Missing user_id in subscription metadata', {
        subscriptionId: subscription.id,
        metadata: subscription.metadata,
      });
      return;
    }

    console.log(`[WEBHOOK] Downgrading user ${userId} to free tier...`);

    // Downgrade to free tier
    const { data, error } = await supabase
      .from('user_profiles')
      .update({
        subscription_tier_id: 'tier_free',
        subscription_status: 'inactive',
        subscription_ends_at: new Date().toISOString(),
      })
      .eq('id', userId)
      .select();

    if (error) {
      console.error('[WEBHOOK ERROR] Failed to downgrade user to free tier', {
        userId,
        error: error.message,
        errorDetails: error,
      });
      throw new Error(`Database update failed: ${error.message}`);
    }

    if (!data || data.length === 0) {
      console.error('[WEBHOOK ERROR] No user found with ID', {
        userId,
      });
      throw new Error(`User not found: ${userId}`);
    }

    console.log(`[WEBHOOK SUCCESS] Subscription canceled for user ${userId} - downgraded to tier_free`);
  }

  /**
   * Handle failed payment
   */
  private static async handlePaymentFailed(
    invoice: Stripe.Invoice,
    supabase: any
  ) {
    // In the new API, subscription is nested under parent.subscription_details
    const subscriptionId = invoice.parent?.subscription_details?.subscription;
    if (!subscriptionId || typeof subscriptionId !== 'string') return;

    // Get subscription to find user
    const subscription = await getStripe().subscriptions.retrieve(subscriptionId);

    const userId = subscription.metadata?.user_id;
    if (!userId) return;

    // Update subscription status to past_due
    await supabase
      .from('user_profiles')
      .update({
        subscription_status: 'past_due',
      })
      .eq('id', userId);

    console.log(`Payment failed for user ${userId} - marked as past_due`);
  }

  /**
   * Select the appropriate price ID based on tier and promo status
   */
  private static selectPriceId(
    tier: SubscriptionTier,
    billingPeriod: BillingPeriod
  ): string | null {
    // Determine if promo is active
    const usePromo = tier.promo_active;

    // Select the appropriate price ID
    if (billingPeriod === 'monthly') {
      return usePromo ? tier.stripe_price_monthly_promo : tier.stripe_price_monthly;
    } else {
      return usePromo ? tier.stripe_price_yearly_promo : tier.stripe_price_yearly;
    }
  }

  /**
   * Cancel a subscription
   */
  static async cancelSubscription(userId: string) {
    try {
      const supabase = await createClient();

      // Get user's subscription ID
      const { data: userProfile, error } = await supabase
        .from('user_profiles')
        .select('stripe_subscription_id')
        .eq('id', userId)
        .single();

      if (error || !userProfile?.stripe_subscription_id) {
        throw new Error('No active subscription found');
      }

      // Cancel subscription at period end
      await getStripe().subscriptions.update(userProfile.stripe_subscription_id, {
        cancel_at_period_end: true,
      });

      // Update database
      await supabase
        .from('user_profiles')
        .update({
          subscription_status: 'canceled',
        })
        .eq('id', userId);

      return { success: true };
    } catch (error: any) {
      console.error('Error canceling subscription:', error);
      throw new Error(error.message || 'Failed to cancel subscription');
    }
  }

  /**
   * Resume a canceled subscription
   */
  static async resumeSubscription(userId: string) {
    try {
      const supabase = await createClient();

      // Get user's subscription ID
      const { data: userProfile, error } = await supabase
        .from('user_profiles')
        .select('stripe_subscription_id')
        .eq('id', userId)
        .single();

      if (error || !userProfile?.stripe_subscription_id) {
        throw new Error('No subscription found');
      }

      // Resume subscription
      await getStripe().subscriptions.update(userProfile.stripe_subscription_id, {
        cancel_at_period_end: false,
      });

      // Update database
      await supabase
        .from('user_profiles')
        .update({
          subscription_status: 'active',
        })
        .eq('id', userId);

      return { success: true };
    } catch (error: any) {
      console.error('Error resuming subscription:', error);
      throw new Error(error.message || 'Failed to resume subscription');
    }
  }
}