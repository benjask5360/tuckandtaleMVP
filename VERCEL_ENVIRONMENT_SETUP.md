# Vercel Environment Variables Setup

This guide explains what environment variables you need to add to Vercel for production deployment.

## 🔑 Required Environment Variables for Vercel

Go to: **Vercel Dashboard > Your Project > Settings > Environment Variables**

### 1. Stripe Configuration (CRITICAL for payments)

```bash
# Production Publishable Key (client-side)
NEXT_PUBLIC_STRIPE_PUBLISHABLE_KEY=pk_live_YOUR_PRODUCTION_KEY

# Production Secret Key (server-side)
STRIPE_SECRET_KEY=sk_live_YOUR_PRODUCTION_SECRET

# Production Webhook Secret (from Stripe Dashboard webhook)
STRIPE_WEBHOOK_SECRET=whsec_YOUR_PRODUCTION_WEBHOOK_SECRET
```

⚠️ **Important Notes:**
- Use `pk_live_` and `sk_live_` for production (NOT `pk_test_` / `sk_test_`)
- The webhook secret will be different for production
- Get production webhook secret from: Stripe Dashboard > Developers > Webhooks

---

### 2. Supabase Configuration (Already in Vercel?)

```bash
# Public URL (client-side)
NEXT_PUBLIC_SUPABASE_URL=https://api.tuckandtale.com

# Public Anon Key (client-side)
NEXT_PUBLIC_SUPABASE_ANON_KEY=eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9...

# Service Role Key (server-side)
SUPABASE_SERVICE_KEY=eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9...

# Database Password (if needed)
SUPABASE_DB_PASSWORD=your_db_password
```

---

### 3. AI Service Keys (Already in Vercel?)

```bash
# OpenAI
OPENAI_API_KEY=sk-proj-...

# Leonardo.ai
LEONARDO_API_KEY=your_leonardo_key

# Google Gemini
GOOGLE_GEMINI_API_KEY=AIzaSy...
```

---

### 4. Email Service (Already in Vercel?)

```bash
# Resend
RESEND_API_KEY=re_...
```

---

### 5. App Configuration

```bash
# Production URL (important for Stripe redirects)
NEXT_PUBLIC_APP_URL=https://tuckandtale.com

# Node Environment
NODE_ENV=production
```

---

## 🎯 Stripe-Specific Setup for Production

### Step 1: Create Production Webhook in Stripe

1. Go to: [Stripe Dashboard > Developers > Webhooks](https://dashboard.stripe.com/webhooks)
2. Click **"Add endpoint"**
3. Enter endpoint URL:
   ```
   https://tuckandtale.com/api/stripe/webhook
   ```
   Or if using Vercel domain:
   ```
   https://your-project.vercel.app/api/stripe/webhook
   ```

4. Select events to listen for:
   - ✅ `checkout.session.completed`
   - ✅ `customer.subscription.created`
   - ✅ `customer.subscription.updated`
   - ✅ `customer.subscription.deleted`
   - ✅ `invoice.payment_failed`

5. Click **"Add endpoint"**

6. Copy the **"Signing secret"** (starts with `whsec_`)

7. Add it to Vercel as `STRIPE_WEBHOOK_SECRET`

### Step 2: Switch to Live Mode Keys

1. In Stripe Dashboard, toggle from **Test mode** to **Live mode**
2. Go to: Developers > API keys
3. Copy:
   - **Publishable key** (starts with `pk_live_`)
   - **Secret key** (starts with `sk_live_`) - Click "Reveal test key"
4. Add these to Vercel

---

## 📋 Environment Variables Checklist

Copy this checklist to ensure you have everything:

### For Stripe to Work in Production:
- [ ] `NEXT_PUBLIC_STRIPE_PUBLISHABLE_KEY` (pk_live_...)
- [ ] `STRIPE_SECRET_KEY` (sk_live_...)
- [ ] `STRIPE_WEBHOOK_SECRET` (whsec_...)
- [ ] `NEXT_PUBLIC_APP_URL` (your production URL)

### Already Should Be Set:
- [ ] `NEXT_PUBLIC_SUPABASE_URL`
- [ ] `NEXT_PUBLIC_SUPABASE_ANON_KEY`
- [ ] `SUPABASE_SERVICE_KEY`
- [ ] `OPENAI_API_KEY`
- [ ] `LEONARDO_API_KEY`
- [ ] `GOOGLE_GEMINI_API_KEY`
- [ ] `RESEND_API_KEY`

---

## 🔒 Security Best Practices

### ✅ DO:
- Use **live mode** keys for production
- Use **test mode** keys for development/staging
- Store webhook secrets securely
- Keep secret keys in Vercel (never commit to git)
- Use different webhook secrets for dev/staging/production

### ❌ DON'T:
- Commit `.env.local` to git (it's in `.gitignore`)
- Share secret keys publicly
- Use test mode keys in production
- Reuse webhook secrets across environments

---

## 🧪 Testing Production Webhooks

After deployment, test your webhook:

```bash
# Install Stripe CLI
stripe login

# Forward production events to your webhook
stripe listen --forward-to https://tuckandtale.com/api/stripe/webhook --live

# Or trigger a test event
stripe trigger checkout.session.completed --live
```

---

## 🚨 Common Issues & Solutions

### Issue: Webhook returns 401 or 403
**Solution**: Check that `STRIPE_WEBHOOK_SECRET` in Vercel matches the secret from Stripe Dashboard webhook settings

### Issue: Payments work but database doesn't update
**Solution**:
1. Check Vercel logs for webhook errors
2. Verify `SUPABASE_SERVICE_KEY` is set correctly
3. Check webhook events are arriving (Stripe Dashboard > Developers > Webhooks > Your endpoint)

### Issue: "No such price" error
**Solution**: Make sure you've created the prices in **live mode** (not test mode) and updated the price IDs in the database

### Issue: Redirects fail after checkout
**Solution**: Verify `NEXT_PUBLIC_APP_URL` is set to your production domain (not localhost)

---

## 📱 Where to Find These Values

| Variable | Where to Find |
|----------|--------------|
| Stripe Publishable Key | Stripe Dashboard > Developers > API keys (Live mode) |
| Stripe Secret Key | Stripe Dashboard > Developers > API keys (Live mode) |
| Stripe Webhook Secret | Stripe Dashboard > Developers > Webhooks > [Your endpoint] |
| Supabase Keys | Supabase Dashboard > Settings > API |
| OpenAI Key | OpenAI Platform > API keys |
| Leonardo Key | Leonardo.ai Dashboard > API Settings |
| Gemini Key | Google AI Studio > Get API Key |
| Resend Key | Resend Dashboard > API Keys |

---

## 🎯 Quick Copy Template for Vercel

Copy this and fill in your values:

```bash
# Stripe Production
NEXT_PUBLIC_STRIPE_PUBLISHABLE_KEY=pk_live_
STRIPE_SECRET_KEY=sk_live_
STRIPE_WEBHOOK_SECRET=whsec_

# Supabase
NEXT_PUBLIC_SUPABASE_URL=https://api.tuckandtale.com
NEXT_PUBLIC_SUPABASE_ANON_KEY=
SUPABASE_SERVICE_KEY=

# AI Services
OPENAI_API_KEY=
LEONARDO_API_KEY=
GOOGLE_GEMINI_API_KEY=

# Email
RESEND_API_KEY=

# App
NEXT_PUBLIC_APP_URL=https://tuckandtale.com
NODE_ENV=production
```

---

## ✅ Deployment Verification

After setting up environment variables:

1. Redeploy from Vercel Dashboard
2. Test checkout: Visit `/test-stripe` on production
3. Complete a test purchase in live mode
4. Check Stripe Dashboard > Payments for the transaction
5. Verify user subscription updated in database
6. Check Vercel logs for any errors

---

## 📞 Need Help?

If you encounter issues:
1. Check Vercel logs: Vercel Dashboard > Deployments > [Latest] > Functions
2. Check Stripe logs: Stripe Dashboard > Developers > Events
3. Verify all environment variables are set (no typos!)
4. Make sure webhook endpoint is publicly accessible