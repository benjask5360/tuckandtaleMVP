/**
 * Stripe Service
 * Handles all Stripe-related operations for subscription management
 */

import Stripe from 'stripe';
import { createClient } from '@/lib/supabase/server';
import { SubscriptionTierService } from './subscription-tier';
import { getTierFromPriceId, isValidPriceId, getBillingPeriodFromPriceId } from '@/lib/stripe/price-mapping';
import type { BillingPeriod, SubscriptionTier } from '@/lib/types/subscription-types';

// Initialize Stripe
const stripe = new Stripe(process.env.STRIPE_SECRET_KEY!, {
  apiVersion: '2025-10-29.clover',
});

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
        const customer = await stripe.customers.create({
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
      const session = await stripe.checkout.sessions.create({
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
      const session = await stripe.billingPortal.sessions.create({
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
      const event = stripe.webhooks.constructEvent(
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
    if (!session.customer || !session.subscription) {
      console.error('Missing customer or subscription in checkout session');
      return;
    }

    const userId = session.metadata?.user_id;
    if (!userId) {
      console.error('Missing user_id in session metadata');
      return;
    }

    // Get subscription details
    const subscription = await stripe.subscriptions.retrieve(
      session.subscription as string
    );

    // Get the price ID from the subscription
    const priceId = subscription.items.data[0]?.price.id;
    if (!priceId || !isValidPriceId(priceId)) {
      console.error('Invalid price ID:', priceId);
      return;
    }

    // Get tier from price ID
    const tierId = getTierFromPriceId(priceId);
    if (!tierId) {
      console.error('Could not determine tier from price:', priceId);
      return;
    }

    // Update user profile
    await supabase
      .from('user_profiles')
      .update({
        subscription_tier_id: tierId,
        stripe_customer_id: session.customer as string,
        stripe_subscription_id: subscription.id,
        subscription_status: 'active',
        subscription_starts_at: new Date(subscription.current_period_start * 1000).toISOString(),
        subscription_ends_at: new Date(subscription.current_period_end * 1000).toISOString(),
      })
      .eq('id', userId);

    console.log(`Subscription activated for user ${userId} - tier: ${tierId}`);
  }

  /**
   * Handle subscription update
   */
  private static async handleSubscriptionUpdate(
    subscription: Stripe.Subscription,
    supabase: any
  ) {
    const userId = subscription.metadata?.user_id;
    if (!userId) {
      console.error('Missing user_id in subscription metadata');
      return;
    }

    // Get the price ID from the subscription
    const priceId = subscription.items.data[0]?.price.id;
    if (!priceId || !isValidPriceId(priceId)) {
      console.error('Invalid price ID:', priceId);
      return;
    }

    // Get tier from price ID
    const tierId = getTierFromPriceId(priceId);
    if (!tierId) {
      console.error('Could not determine tier from price:', priceId);
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

    // Update user profile
    await supabase
      .from('user_profiles')
      .update({
        subscription_tier_id: tierId,
        stripe_subscription_id: subscription.id,
        subscription_status: status,
        subscription_starts_at: new Date(subscription.current_period_start * 1000).toISOString(),
        subscription_ends_at: new Date(subscription.current_period_end * 1000).toISOString(),
      })
      .eq('id', userId);

    console.log(`Subscription updated for user ${userId} - tier: ${tierId}, status: ${status}`);
  }

  /**
   * Handle subscription cancellation
   */
  private static async handleSubscriptionCanceled(
    subscription: Stripe.Subscription,
    supabase: any
  ) {
    const userId = subscription.metadata?.user_id;
    if (!userId) {
      console.error('Missing user_id in subscription metadata');
      return;
    }

    // Downgrade to free tier
    await supabase
      .from('user_profiles')
      .update({
        subscription_tier_id: 'tier_free',
        subscription_status: 'inactive',
        subscription_ends_at: new Date().toISOString(),
      })
      .eq('id', userId);

    console.log(`Subscription canceled for user ${userId} - downgraded to tier_free`);
  }

  /**
   * Handle failed payment
   */
  private static async handlePaymentFailed(
    invoice: Stripe.Invoice,
    supabase: any
  ) {
    if (!invoice.subscription) return;

    // Get subscription to find user
    const subscription = await stripe.subscriptions.retrieve(
      invoice.subscription as string
    );

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
      await stripe.subscriptions.update(userProfile.stripe_subscription_id, {
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
      await stripe.subscriptions.update(userProfile.stripe_subscription_id, {
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