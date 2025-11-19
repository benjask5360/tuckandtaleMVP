#!/usr/bin/env node

/**
 * Verify User Subscription Status
 *
 * This script checks a user's subscription status in both Stripe and your database
 * Useful for debugging why a user wasn't upgraded after payment
 *
 * Usage:
 *   node scripts/verify-user-subscription.js user@example.com
 *   node scripts/verify-user-subscription.js user-id-uuid
 */

require('dotenv').config({ path: '.env.local' });
const { createClient } = require('@supabase/supabase-js');
const Stripe = require('stripe');

const stripe = new Stripe(process.env.STRIPE_SECRET_KEY, {
  apiVersion: '2024-12-18.acacia',
});

const supabase = createClient(
  process.env.NEXT_PUBLIC_SUPABASE_URL,
  process.env.SUPABASE_SERVICE_ROLE_KEY
);

async function verifyUser(emailOrId) {
  console.log('\n=== Tuck and Tale Subscription Verification ===\n');
  console.log(`Checking: ${emailOrId}\n`);

  try {
    // Determine if input is email or UUID
    const isEmail = emailOrId.includes('@');

    // Get user profile from database
    let query = supabase
      .from('user_profiles')
      .select('*')
      .single();

    if (isEmail) {
      query = query.eq('email', emailOrId);
    } else {
      query = query.eq('id', emailOrId);
    }

    const { data: profile, error: profileError } = await query;

    if (profileError || !profile) {
      console.error('❌ User not found in database');
      console.error('Error:', profileError?.message || 'No profile returned');
      process.exit(1);
    }

    console.log('✅ User found in database:\n');
    console.log('  User ID:', profile.id);
    console.log('  Email:', profile.email);
    console.log('  Display Name:', profile.display_name);
    console.log('  Subscription Tier:', profile.subscription_tier_id);
    console.log('  Subscription Status:', profile.subscription_status);
    console.log('  Stripe Customer ID:', profile.stripe_customer_id || '(none)');
    console.log('  Stripe Subscription ID:', profile.stripe_subscription_id || '(none)');
    console.log('  Subscription Starts:', profile.subscription_starts_at || '(none)');
    console.log('  Subscription Ends:', profile.subscription_ends_at || '(none)');

    // If no Stripe customer, they're definitely free tier
    if (!profile.stripe_customer_id) {
      console.log('\n✅ User has no Stripe customer ID - correctly on free tier\n');
      return;
    }

    console.log('\n--- Checking Stripe ---\n');

    // Fetch Stripe customer
    try {
      const customer = await stripe.customers.retrieve(profile.stripe_customer_id);
      console.log('✅ Stripe Customer found:');
      console.log('  Customer ID:', customer.id);
      console.log('  Email:', customer.email);
      console.log('  Created:', new Date(customer.created * 1000).toISOString());
    } catch (error) {
      console.error('❌ Stripe customer not found:', error.message);
    }

    // Fetch Stripe subscriptions
    const subscriptions = await stripe.subscriptions.list({
      customer: profile.stripe_customer_id,
      limit: 10,
    });

    console.log(`\n✅ Found ${subscriptions.data.length} subscription(s) in Stripe:\n`);

    if (subscriptions.data.length === 0) {
      console.log('  (No subscriptions found)');
      console.log('\n⚠️  MISMATCH: User has Stripe customer ID but no subscriptions');
      console.log('   → User should be on tier_free\n');
      return;
    }

    subscriptions.data.forEach((sub, index) => {
      const item = sub.items.data[0];
      const priceId = item?.price.id;

      console.log(`  Subscription ${index + 1}:`);
      console.log('    Subscription ID:', sub.id);
      console.log('    Status:', sub.status);
      console.log('    Price ID:', priceId);
      console.log('    Amount:', `$${(item?.price.unit_amount / 100).toFixed(2)}/${item?.price.recurring?.interval}`);
      console.log('    Current Period:',
        new Date(item.current_period_start * 1000).toISOString().split('T')[0],
        'to',
        new Date(item.current_period_end * 1000).toISOString().split('T')[0]
      );
      console.log('    Created:', new Date(sub.created * 1000).toISOString());
      console.log('    Metadata:', sub.metadata);
      console.log('');
    });

    // Check active subscription
    const activeSubscription = subscriptions.data.find(
      sub => sub.status === 'active' || sub.status === 'trialing'
    );

    if (!activeSubscription) {
      console.log('⚠️  No active subscription in Stripe');
      if (profile.subscription_tier_id !== 'tier_free') {
        console.log('   ❌ MISMATCH: Database shows', profile.subscription_tier_id);
        console.log('   → User should be on tier_free\n');
      } else {
        console.log('   ✅ Database correctly shows tier_free\n');
      }
      return;
    }

    // Determine expected tier from Stripe
    const priceId = activeSubscription.items.data[0]?.price.id;
    const { getTierFromPriceId } = require('../lib/stripe/price-mapping');
    const expectedTier = getTierFromPriceId(priceId);

    console.log('--- Comparison ---\n');
    console.log('  Active Subscription in Stripe:');
    console.log('    ID:', activeSubscription.id);
    console.log('    Status:', activeSubscription.status);
    console.log('    Price ID:', priceId);
    console.log('    Expected Tier:', expectedTier || '(UNKNOWN PRICE ID!)');
    console.log('');
    console.log('  Database shows:');
    console.log('    Tier:', profile.subscription_tier_id);
    console.log('    Status:', profile.subscription_status);
    console.log('    Subscription ID:', profile.stripe_subscription_id);
    console.log('');

    // Check for mismatches
    let hasMismatch = false;

    if (!expectedTier) {
      console.log('❌ CRITICAL: Price ID not recognized in price mapping!');
      console.log('   → Add', priceId, 'to lib/stripe/price-mapping.ts\n');
      hasMismatch = true;
    } else if (profile.subscription_tier_id !== expectedTier) {
      console.log('❌ MISMATCH: Database tier does not match Stripe subscription!');
      console.log('   Database:', profile.subscription_tier_id);
      console.log('   Expected:', expectedTier);
      console.log('   → User should be on', expectedTier, 'but is on', profile.subscription_tier_id, '\n');
      hasMismatch = true;
    }

    if (profile.stripe_subscription_id !== activeSubscription.id) {
      console.log('❌ MISMATCH: Database has wrong subscription ID!');
      console.log('   Database:', profile.stripe_subscription_id);
      console.log('   Stripe:', activeSubscription.id, '\n');
      hasMismatch = true;
    }

    if (!hasMismatch) {
      console.log('✅ Everything matches! User subscription is correct.\n');
    } else {
      console.log('--- How to Fix ---\n');
      console.log('Option 1: Use the admin API endpoint:');
      console.log('  POST /api/admin/fix-subscription');
      console.log(`  Body: { "email": "${profile.email}" }\n`);
      console.log('Option 2: Replay the Stripe webhook:');
      console.log('  1. Go to Stripe Dashboard → Developers → Events');
      console.log('  2. Find the checkout.session.completed event');
      console.log('  3. Click "Resend webhook"\n');
      console.log('Option 3: Manual database update (not recommended):');
      console.log(`  UPDATE user_profiles SET`);
      console.log(`    subscription_tier_id = '${expectedTier}',`);
      console.log(`    stripe_subscription_id = '${activeSubscription.id}',`);
      console.log(`    subscription_status = 'active'`);
      console.log(`  WHERE id = '${profile.id}';\n`);
    }

  } catch (error) {
    console.error('❌ Error:', error.message);
    console.error(error);
    process.exit(1);
  }
}

// Get email/ID from command line
const emailOrId = process.argv[2];

if (!emailOrId) {
  console.error('Usage: node scripts/verify-user-subscription.js <email-or-user-id>');
  console.error('Example: node scripts/verify-user-subscription.js user@example.com');
  process.exit(1);
}

verifyUser(emailOrId);
