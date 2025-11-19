# Stripe Integration Testing Guide

## ⚠️ CRITICAL: Webhook Setup for Local Testing

**If webhooks aren't working, user subscriptions won't activate after payment!**

For local development, Stripe webhooks MUST be forwarded using the Stripe CLI:

```bash
# Terminal 1: Start webhook forwarding (REQUIRED!)
stripe listen --forward-to localhost:3000/api/stripe/webhook

# This outputs a webhook secret like: whsec_abc123...
# Copy that secret and update your .env.local:
STRIPE_WEBHOOK_SECRET=whsec_[the_secret_from_stripe_listen]

# Terminal 2: Start your dev server
npm run dev
```

**Without this setup:**
- ✅ Stripe checkout will complete
- ✅ Payment will be processed
- ❌ Your app will NEVER know about it
- ❌ User stays on free tier

**With this setup:**
- ✅ Stripe checkout completes
- ✅ Payment processed
- ✅ Webhook sent to your local server
- ✅ User upgraded to paid tier

---

## Prerequisites

1. **Stripe CLI Installation**
   ```bash
   # Windows (using Scoop)
   scoop install stripe

   # Or download from: https://github.com/stripe/stripe-cli/releases
   ```

2. **Login to Stripe CLI**
   ```bash
   stripe login
   ```

3. **Environment Variables** (in `.env.local`)
   ```
   STRIPE_SECRET_KEY=sk_test_...
   STRIPE_WEBHOOK_SECRET=whsec_...
   NEXT_PUBLIC_STRIPE_PUBLISHABLE_KEY=pk_test_...
   ```

## Test 1: Create Checkout Session

### Option A: Using Test Script
```bash
# First, get your auth token:
# 1. Log into your app at http://localhost:3000
# 2. Open DevTools > Application > Cookies
# 3. Copy the value of sb-iolimejvugpcpnmruqww-auth-token

# Run the test
TEST_AUTH_TOKEN=your_token_here node scripts/test-checkout-session.js
```

### Option B: Manual API Call
```bash
# Replace YOUR_AUTH_TOKEN with your actual token
curl -X POST http://localhost:3000/api/stripe/create-checkout \
  -H "Content-Type: application/json" \
  -H "Cookie: sb-iolimejvugpcpnmruqww-auth-token=YOUR_AUTH_TOKEN" \
  -d '{
    "tierId": "tier_basic",
    "billingPeriod": "monthly"
  }'
```

Expected response:
```json
{
  "sessionId": "cs_test_...",
  "url": "https://checkout.stripe.com/c/pay/cs_test_..."
}
```

**Visit the URL to see the Stripe checkout page!**

## Test 2: Webhook Testing with Stripe CLI

### Step 1: Start Webhook Forwarding
```bash
# Forward Stripe events to your local webhook endpoint
stripe listen --forward-to localhost:3000/api/stripe/webhook
```

This will output your webhook signing secret:
```
> Ready! Your webhook signing secret is whsec_... (^C to quit)
```

**Important**: Update your `.env.local` with this temporary webhook secret!

### Step 2: Trigger Test Events

In a new terminal, trigger test webhook events:

```bash
# Test successful checkout
stripe trigger checkout.session.completed \
  --add checkout_session:metadata.user_id=YOUR_USER_ID

# Test subscription creation
stripe trigger customer.subscription.created

# Test subscription update
stripe trigger customer.subscription.updated

# Test subscription cancellation
stripe trigger customer.subscription.deleted

# Test payment failure
stripe trigger invoice.payment_failed
```

### Step 3: Verify Processing

Check if the webhook was processed:
```bash
# Check all users with subscriptions
node scripts/verify-webhook.js

# Check specific user
node scripts/verify-webhook.js your.email@example.com
```

## Test 3: Complete End-to-End Flow

### 1. Create a Test Checkout Session
```bash
# Use your actual user auth token
curl -X POST http://localhost:3000/api/stripe/create-checkout \
  -H "Content-Type: application/json" \
  -H "Cookie: sb-iolimejvugpcpnmruqww-auth-token=YOUR_TOKEN" \
  -d '{"tierId": "tier_basic", "billingPeriod": "monthly"}'
```

### 2. Complete the Checkout
- Copy the checkout URL from the response
- Open it in your browser
- Use test card: `4242 4242 4242 4242`
- Any future expiry date and any CVC
- Complete the payment

### 3. Monitor Webhook Processing
In your Stripe CLI terminal, you should see:
```
2024-11-15 ... [200] POST http://localhost:3000/api/stripe/webhook [evt_...]
```

### 4. Verify Database Update
```bash
node scripts/verify-webhook.js your.email@example.com
```

You should see:
- Tier updated to "Starlight" or "Supernova"
- Status: "active"
- Stripe Customer ID populated
- Stripe Subscription ID populated

## Test 4: Billing Portal

### Create Portal Session
```bash
curl -X POST http://localhost:3000/api/stripe/billing-portal \
  -H "Cookie: sb-iolimejvugpcpnmruqww-auth-token=YOUR_TOKEN"
```

Response:
```json
{
  "url": "https://billing.stripe.com/p/session/test_..."
}
```

Visit the URL to access the Stripe billing portal where you can:
- Update payment method
- Cancel subscription
- Download invoices

## Test 5: Subscription Cancellation

### Via API
```bash
curl -X POST http://localhost:3000/api/stripe/cancel-subscription \
  -H "Cookie: sb-iolimejvugpcpnmruqww-auth-token=YOUR_TOKEN"
```

### Verify Cancellation
```bash
node scripts/verify-webhook.js your.email@example.com
```

Status should change to "canceled" and will downgrade to tier_free at period end.

## Common Test Scenarios

### Test Promo Pricing
1. Update database to enable promo:
   ```sql
   UPDATE subscription_tiers SET promo_active = true WHERE id = 'tier_basic';
   ```

2. Create checkout session - should use promo price ID

3. Verify in Stripe Dashboard that promo price was used

### Test Failed Payment
```bash
# Use Stripe CLI to trigger payment failure
stripe trigger invoice.payment_failed
```

Check that user status changes to "past_due"

### Test Subscription Upgrade
1. Start with tier_basic subscription
2. Create new checkout for tier_plus
3. Verify tier upgrades correctly

## Troubleshooting

### Webhook Signature Verification Failed
- Make sure `STRIPE_WEBHOOK_SECRET` matches the one from `stripe listen`
- For production, use the webhook secret from Stripe Dashboard
- The webhook secret changes EVERY time you restart `stripe listen`

### User Not Found
- Ensure you're logged in when making API calls
- Check the auth token is correct and not expired

### Subscription Not Updating After Payment ⚠️ COMMON ISSUE
This is the most common problem! Here's how to diagnose:

#### Step 1: Check if webhooks are being received
Look in your terminal where you ran `npm run dev`. When you complete a checkout, you should see logs like:
```
[WEBHOOK] Processing checkout.session.completed
[WEBHOOK] Found user_id: xyz...
[WEBHOOK] Price ID from subscription: price_1SToSU...
[WEBHOOK] Mapped price xyz to tier tier_basic
[WEBHOOK SUCCESS] Subscription activated for user xyz
```

**If you see NOTHING**, webhooks aren't reaching your app:
- ✅ Make sure `stripe listen` is running
- ✅ Make sure webhook secret in `.env.local` is from current `stripe listen` session
- ✅ Restart your dev server after updating `.env.local`

**If you see `[WEBHOOK ERROR]` messages**, check the error details:
- `Missing user_id in session metadata` → Checkout session wasn't created properly
- `Invalid price ID` → Price ID from Stripe doesn't match your price-mapping.ts
- `Could not determine tier from price` → Price ID not in mapping table
- `Failed to update user profile` → Database error (check RLS policies)
- `No user found with ID` → User doesn't exist in database

#### Step 2: Verify the user's current state
```bash
node scripts/verify-user-subscription.js user@example.com
```

This will show:
- What tier the user is on in your database
- What subscriptions they have in Stripe
- Whether there's a mismatch that needs fixing

#### Step 3: Fix a stuck user
If a user paid but didn't get upgraded, use the admin endpoint:

```bash
curl -X POST http://localhost:3000/api/admin/fix-subscription \
  -H "Content-Type: application/json" \
  -H "Cookie: sb-iolimejvugpcpnmruqww-auth-token=YOUR_TOKEN" \
  -d '{"email": "user@example.com"}'
```

This will:
- Look up their active Stripe subscription
- Determine the correct tier
- Update the database to match

#### Step 4: Check Stripe Dashboard
1. Go to Stripe Dashboard → Developers → Events
2. Find the `checkout.session.completed` event
3. Check the "Webhooks" tab to see delivery status
4. If delivery failed, check the error message

## Production Setup

1. Add webhook endpoint in Stripe Dashboard:
   - URL: `https://yourdomain.com/api/stripe/webhook`
   - Events:
     - `checkout.session.completed`
     - `customer.subscription.created`
     - `customer.subscription.updated`
     - `customer.subscription.deleted`
     - `invoice.payment_failed`

2. Copy the webhook signing secret and add to production environment

3. Test with Stripe test mode before going live

## Useful Commands

```bash
# View Stripe logs
stripe logs tail

# List recent events
stripe events list

# Inspect specific event
stripe events retrieve evt_...

# List products and prices
stripe prices list
stripe products list
```