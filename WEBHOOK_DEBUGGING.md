# Webhook Debugging Tools

This document explains the new tools added to help debug and fix webhook-related subscription issues.

## Problem Statement

When testing Stripe subscriptions in sandbox mode, you might encounter:
- User completes checkout and pays
- Stripe shows successful payment
- User's database record still shows `tier_free`
- User didn't get upgraded

**Root Cause:** Webhooks aren't reaching your local application.

## Solution Overview

Three new tools have been added:

1. **Enhanced Webhook Logging** - Detailed logs show exactly what's happening
2. **Verification Script** - Check if user's Stripe subscription matches database
3. **Admin Fix Endpoint** - Manually sync database with Stripe

---

## 1. Enhanced Webhook Logging

All webhook handlers now include comprehensive logging with `[WEBHOOK]` prefix.

### What You'll See

**Successful webhook processing:**
```
[WEBHOOK] Processing checkout.session.completed
[WEBHOOK] Found user_id: 550e8400-e29b-41d4-a716-446655440000
[WEBHOOK] Price ID from subscription: price_1SToSUAxMZBrawG5yJ8vLfMJ
[WEBHOOK] Mapped price price_1SToSU... to tier tier_basic, updating database...
[WEBHOOK SUCCESS] Subscription activated for user 550e8400-...
```

**Failed webhook processing:**
```
[WEBHOOK] Processing checkout.session.completed
[WEBHOOK ERROR] Missing user_id in session metadata
```

### Common Error Messages

| Error | Meaning | Fix |
|-------|---------|-----|
| `Missing user_id in session metadata` | Checkout session wasn't created with user_id | Check create-checkout endpoint |
| `Invalid price ID` | Price ID from Stripe not recognized | Add price ID to `lib/stripe/price-mapping.ts` |
| `Could not determine tier from price` | Price ID not in mapping table | Update price mapping |
| `Failed to update user profile` | Database update failed | Check RLS policies, user exists |
| `No user found with ID` | User doesn't exist in database | User was deleted or ID is wrong |

---

## 2. Verification Script

Check if a user's subscription matches between Stripe and your database.

### Usage

```bash
node scripts/verify-user-subscription.js user@example.com
# or
node scripts/verify-user-subscription.js 550e8400-e29b-41d4-a716-446655440000
```

### Example Output

```
=== Tuck and Tale Subscription Verification ===

Checking: user@example.com

✅ User found in database:

  User ID: 550e8400-e29b-41d4-a716-446655440000
  Email: user@example.com
  Display Name: John Doe
  Subscription Tier: tier_free
  Subscription Status: inactive
  Stripe Customer ID: cus_ABC123
  Stripe Subscription ID: sub_XYZ789

--- Checking Stripe ---

✅ Stripe Customer found:
  Customer ID: cus_ABC123
  Email: user@example.com

✅ Found 1 subscription(s) in Stripe:

  Subscription 1:
    Subscription ID: sub_XYZ789
    Status: active
    Price ID: price_1SToSUAxMZBrawG5yJ8vLfMJ
    Amount: $9.95/month
    Current Period: 2024-11-15 to 2024-12-15

--- Comparison ---

  Active Subscription in Stripe:
    ID: sub_XYZ789
    Status: active
    Price ID: price_1SToSUAxMZBrawG5yJ8vLfMJ
    Expected Tier: tier_basic

  Database shows:
    Tier: tier_free
    Status: inactive
    Subscription ID: sub_XYZ789

❌ MISMATCH: Database tier does not match Stripe subscription!
   Database: tier_free
   Expected: tier_basic
   → User should be on tier_basic but is on tier_free

--- How to Fix ---

Option 1: Use the admin API endpoint:
  POST /api/admin/fix-subscription
  Body: { "email": "user@example.com" }

Option 2: Replay the Stripe webhook:
  1. Go to Stripe Dashboard → Developers → Events
  2. Find the checkout.session.completed event
  3. Click "Resend webhook"
```

### What It Checks

- ✅ User exists in database
- ✅ User has Stripe customer ID
- ✅ Stripe customer exists
- ✅ Active subscriptions in Stripe
- ✅ Price ID mapping to tier
- ✅ Database tier matches Stripe subscription
- ✅ Database subscription ID matches Stripe

---

## 3. Admin Fix Endpoint

Manually sync a user's database record with their active Stripe subscription.

### Usage

**Via cURL:**
```bash
curl -X POST http://localhost:3000/api/admin/fix-subscription \
  -H "Content-Type: application/json" \
  -H "Cookie: sb-iolimejvugpcpnmruqww-auth-token=YOUR_AUTH_TOKEN" \
  -d '{"email": "user@example.com"}'
```

**Via JavaScript:**
```javascript
const response = await fetch('/api/admin/fix-subscription', {
  method: 'POST',
  headers: { 'Content-Type': 'application/json' },
  body: JSON.stringify({ email: 'user@example.com' })
});
const result = await response.json();
console.log(result);
```

### Request Body

```typescript
{
  email?: string;      // User's email address
  userId?: string;     // Or user's UUID
}
```

Provide either `email` or `userId`.

### Response Examples

**Success - User Fixed:**
```json
{
  "message": "Subscription fixed successfully",
  "user": {
    "id": "550e8400-e29b-41d4-a716-446655440000",
    "email": "user@example.com",
    "oldTier": "tier_free",
    "newTier": "tier_basic",
    "subscriptionId": "sub_XYZ789",
    "status": "active"
  }
}
```

**No Active Subscription:**
```json
{
  "message": "User had no active subscription - updated to free tier",
  "user": {
    "id": "550e8400-e29b-41d4-a716-446655440000",
    "email": "user@example.com",
    "oldTier": "tier_basic",
    "newTier": "tier_free"
  }
}
```

**Error:**
```json
{
  "error": "User not found"
}
```

### What It Does

1. Looks up the user by email or ID
2. Fetches all their Stripe subscriptions
3. Finds any active/trialing subscription
4. Determines the correct tier from the subscription's price ID
5. Updates the database to match Stripe
6. Returns the changes made

### Security Note

⚠️ **This endpoint requires authentication.** In production, you should add admin role checking:

```typescript
// Add this after authentication check
const { data: profile } = await supabase
  .from('user_profiles')
  .select('role')
  .eq('id', user.id)
  .single();

if (profile?.role !== 'admin') {
  return NextResponse.json({ error: 'Forbidden' }, { status: 403 });
}
```

---

## Debugging Workflow

When a user reports they paid but didn't get upgraded:

### Step 1: Check Webhook Logs

Look in your server logs for `[WEBHOOK]` messages. If you see nothing, webhooks aren't being received.

**Fix:** Ensure `stripe listen` is running and webhook secret is updated in `.env.local`

### Step 2: Run Verification Script

```bash
node scripts/verify-user-subscription.js user@example.com
```

This shows you exactly what the mismatch is.

### Step 3: Fix the User

Use the admin endpoint:

```bash
curl -X POST http://localhost:3000/api/admin/fix-subscription \
  -H "Content-Type: application/json" \
  -H "Cookie: sb-iolimejvugpcpnmruqww-auth-token=YOUR_TOKEN" \
  -d '{"email": "user@example.com"}'
```

### Step 4: Prevent Future Issues

- Ensure `stripe listen` is always running during development
- Update webhook secret in `.env.local` every time you restart `stripe listen`
- Monitor webhook logs in production Stripe Dashboard
- Set up alerting for failed webhooks

---

## Testing the Fixes

### Test 1: Verify Logging Works

1. Complete a test checkout with `stripe listen` running
2. Check your terminal for `[WEBHOOK]` logs
3. You should see detailed step-by-step processing

### Test 2: Verify Script Works

```bash
node scripts/verify-user-subscription.js your.email@example.com
```

Should show your subscription status.

### Test 3: Verify Admin Endpoint Works

1. Create a user with a Stripe subscription but wrong tier
2. Call the admin endpoint
3. Verify the tier was corrected

---

## Production Considerations

### Webhook Endpoint Configuration

In production, add webhook endpoint in Stripe Dashboard:
- URL: `https://yourdomain.com/api/stripe/webhook`
- Events to listen for:
  - `checkout.session.completed`
  - `customer.subscription.created`
  - `customer.subscription.updated`
  - `customer.subscription.deleted`
  - `invoice.payment_failed`

### Monitoring

Set up monitoring for:
- Failed webhook deliveries (check Stripe Dashboard)
- `[WEBHOOK ERROR]` logs in your application logs
- Users with active Stripe subscriptions but `tier_free` in database

### Alerting

Consider setting up alerts for:
- Webhook signature verification failures
- Database update failures
- Unrecognized price IDs
- Mismatched subscription states

---

## FAQ

**Q: Why don't webhooks work in local development?**
A: Stripe can't reach `localhost` from the internet. You must use `stripe listen` to forward webhooks.

**Q: The webhook secret keeps changing. Is that normal?**
A: Yes! `stripe listen` generates a new webhook secret every time it starts. Always update `.env.local` and restart your dev server.

**Q: Can I use the admin endpoint in production?**
A: Yes, but add proper admin role authorization first. See the security note above.

**Q: What if the price ID isn't recognized?**
A: Add it to `lib/stripe/price-mapping.ts` with the correct tier mapping.

**Q: How do I test webhooks without making real payments?**
A: Use `stripe trigger` commands or the test card `4242 4242 4242 4242` with `stripe listen` running.

**Q: What if a user has multiple subscriptions?**
A: The verification script shows all subscriptions. The admin endpoint uses the first active/trialing one.

---

## Additional Resources

- [STRIPE_TESTING_GUIDE.md](./STRIPE_TESTING_GUIDE.md) - Complete testing guide
- [Stripe CLI Documentation](https://stripe.com/docs/stripe-cli)
- [Stripe Webhooks Documentation](https://stripe.com/docs/webhooks)
- [Stripe Testing Documentation](https://stripe.com/docs/testing)
