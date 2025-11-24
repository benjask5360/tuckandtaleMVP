# 🚀 Stripe Production Deployment Checklist

## Before Going Live

### 1️⃣ Switch Stripe to Live Mode
- [ ] Go to Stripe Dashboard
- [ ] Toggle from **Test mode** to **Live mode** (top right)

### 2️⃣ Get Live Mode API Keys
- [ ] Go to: Developers > API keys
- [ ] Copy **Publishable key** (pk_live_...)
- [ ] Click "Reveal live key" and copy **Secret key** (sk_live_...)

### 3️⃣ Update Vercel Environment Variables
Go to: Vercel Dashboard > Your Project > Settings > Environment Variables

Add these NEW variables (Stripe production keys):
```
NEXT_PUBLIC_STRIPE_PUBLISHABLE_KEY=pk_live_YOUR_KEY
STRIPE_SECRET_KEY=sk_live_YOUR_SECRET
```

Update this variable:
```
NEXT_PUBLIC_APP_URL=https://tuckandtale.com
```

### 4️⃣ Create Production Webhook
- [ ] Go to: Stripe Dashboard > Developers > Webhooks
- [ ] Click "Add endpoint"
- [ ] Endpoint URL: `https://tuckandtale.com/api/stripe/webhook`
- [ ] Select these events:
  - [x] checkout.session.completed
  - [x] customer.subscription.created
  - [x] customer.subscription.updated
  - [x] customer.subscription.deleted
  - [x] invoice.payment_failed
- [ ] Click "Add endpoint"
- [ ] Copy the **Signing secret** (whsec_...)

### 5️⃣ Add Webhook Secret to Vercel
In Vercel environment variables:
```
STRIPE_WEBHOOK_SECRET=whsec_YOUR_WEBHOOK_SECRET
```

### 6️⃣ Update Database with Live Price IDs
⚠️ **IMPORTANT**: You need to create the same products/prices in Stripe **Live mode**

Once created in live mode, update your database:
```sql
-- Update with your LIVE mode price IDs
UPDATE subscription_tiers SET
  stripe_price_monthly = 'price_LIVE_MONTHLY_ID',
  stripe_price_monthly_promo = 'price_LIVE_MONTHLY_PROMO_ID',
  stripe_price_yearly = 'price_LIVE_YEARLY_ID',
  stripe_price_yearly_promo = 'price_LIVE_YEARLY_PROMO_ID'
WHERE id = 'tier_basic';

-- Repeat for tier_plus
UPDATE subscription_tiers SET
  stripe_price_monthly = 'price_LIVE_MONTHLY_ID',
  stripe_price_monthly_promo = 'price_LIVE_MONTHLY_PROMO_ID',
  stripe_price_yearly = 'price_LIVE_YEARLY_ID',
  stripe_price_yearly_promo = 'price_LIVE_YEARLY_PROMO_ID'
WHERE id = 'tier_plus';
```

### 7️⃣ Redeploy on Vercel
- [ ] Go to Vercel Dashboard > Deployments
- [ ] Click "Redeploy" to pick up new environment variables

### 8️⃣ Test Production Checkout
- [ ] Visit: https://tuckandtale.com/test-stripe
- [ ] Click a subscription button
- [ ] Use REAL credit card (you'll be charged!)
- [ ] Complete checkout
- [ ] Verify webhook received (check Stripe Dashboard > Events)
- [ ] Verify subscription updated in database

### 9️⃣ Remove Test Page (Optional)
For security, delete or protect `/test-stripe` in production:
```bash
# Option 1: Delete the test page
rm app/test-stripe/page.tsx

# Option 2: Protect it with auth check
```

---

## 🎯 Quick Summary

**What you need in Vercel for Stripe to work:**

1. `NEXT_PUBLIC_STRIPE_PUBLISHABLE_KEY` = pk_live_...
2. `STRIPE_SECRET_KEY` = sk_live_...
3. `STRIPE_WEBHOOK_SECRET` = whsec_... (from webhook endpoint)
4. `NEXT_PUBLIC_APP_URL` = https://tuckandtale.com

**Plus your existing variables:**
- Supabase keys
- OpenAI key
- Leonardo key
- Gemini key
- Resend key

---

## ⚠️ Critical Notes

1. **Test mode vs Live mode**: Your current test price IDs won't work in production. You need to create the same products/prices in live mode.

2. **Webhook secret is different**: The webhook secret from `stripe listen` is only for local development. Production needs its own secret from the Stripe Dashboard webhook.

3. **Database update required**: After creating live prices, update the database with the new live price IDs.

4. **No test cards in production**: Live mode charges real money. Use caution when testing.

---

## 🧪 Stripe Live Mode Product Setup

You need to recreate your products in **Live mode**:

### Starlight (tier_basic)
1. Go to: Stripe Dashboard > Products (in **Live mode**)
2. Click "Add product"
3. Name: "Starlight"
4. Create 4 prices:
   - Monthly: $19.95
   - Monthly Promo: $9.95
   - Yearly: $149.95
   - Yearly Promo: $99.95
5. Copy each price ID and update database

### Supernova (tier_plus)
Repeat the same process with:
- Monthly: $29.95
- Monthly Promo: $14.95
- Yearly: $249.95
- Yearly Promo: $149.95

---

## 🔍 Verifying Production Setup

Run these checks:

### Check Vercel Environment Variables
```bash
# All should show "Set" in Vercel dashboard
✅ NEXT_PUBLIC_STRIPE_PUBLISHABLE_KEY
✅ STRIPE_SECRET_KEY
✅ STRIPE_WEBHOOK_SECRET
✅ NEXT_PUBLIC_APP_URL
```

### Check Stripe Dashboard
```bash
# In Live mode:
✅ Products created
✅ Prices created
✅ Webhook endpoint configured
✅ Webhook secret copied
```

### Check Database
```bash
# Run this to verify:
SELECT id, stripe_price_monthly, stripe_price_yearly
FROM subscription_tiers
WHERE id IN ('tier_basic', 'tier_plus');

# Should show price IDs starting with price_live_...
```

---

## 📞 Troubleshooting

**Checkout fails immediately**
→ Check NEXT_PUBLIC_STRIPE_PUBLISHABLE_KEY is set in Vercel

**Checkout succeeds but database doesn't update**
→ Check STRIPE_WEBHOOK_SECRET matches Stripe Dashboard webhook
→ Check Vercel function logs for errors

**"No such price" error**
→ You're using test mode price IDs in live mode
→ Create prices in live mode and update database

**Webhook shows errors in Stripe**
→ Check Vercel function logs
→ Verify SUPABASE_SERVICE_KEY is set correctly

---

## ✅ You're Ready When:

- [ ] All Vercel environment variables set
- [ ] Live mode products/prices created in Stripe
- [ ] Database updated with live price IDs
- [ ] Webhook endpoint configured and tested
- [ ] Production checkout tested successfully
- [ ] User subscription updated in database after test purchase