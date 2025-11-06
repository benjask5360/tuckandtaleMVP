# Tuck and Tale MVP - Setup Guide

## Local Development Setup ✅

### Supabase (Local Docker)

Your local Supabase instance is now running! Here's what's configured:

**URLs:**
- API URL: `http://127.0.0.1:54321`
- Studio (Database UI): `http://127.0.0.1:54323`
- Database: `postgresql://postgres:postgres@127.0.0.1:54322/postgres`

**Environment Variables (.env.local):**
```
NEXT_PUBLIC_SUPABASE_URL=http://127.0.0.1:54321
NEXT_PUBLIC_SUPABASE_ANON_KEY=eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9...
SUPABASE_SERVICE_KEY=eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9...
```

**Database Schema:**
- `profiles` - User profiles (extends auth.users)
- `children` - Child profiles for personalized stories
- `stories` - Generated bedtime stories
- `subscriptions` - Stripe subscription management
- `usage` - Monthly usage tracking

**Supabase Commands:**
```bash
# Start local Supabase
npx supabase start

# Stop local Supabase
npx supabase stop

# View database in browser
# Navigate to http://127.0.0.1:54323

# Apply new migrations
npx supabase db reset

# Create new migration
npx supabase migration new <migration_name>

# Generate types for TypeScript
npx supabase gen types typescript --local > types/supabase.ts
```

---

## Production Deployment

### 1. Create Production Supabase Project

1. Go to [supabase.com](https://supabase.com/)
2. Create a new project
3. Copy the following from Project Settings > API:
   - Project URL → `NEXT_PUBLIC_SUPABASE_URL`
   - `anon` public key → `NEXT_PUBLIC_SUPABASE_ANON_KEY`
   - `service_role` secret key → `SUPABASE_SERVICE_KEY`

4. Link your local project to production:
```bash
npx supabase link --project-ref <your-project-ref>
```

5. Push migrations to production:
```bash
npx supabase db push
```

### 2. Deploy to Vercel

**Option 1: Using Vercel CLI (Recommended)**
```bash
# Login to Vercel
vercel login

# Deploy to Vercel (first time)
vercel

# Follow the prompts:
# - Set up and deploy: Yes
# - Which scope: Your account
# - Link to existing project: No
# - Project name: tuckandtaleMVP
# - Directory: ./
# - Override settings: No

# Deploy to production
vercel --prod
```

**Option 2: Using Vercel Dashboard**
1. Go to [vercel.com](https://vercel.com/)
2. Click "Add New Project"
3. Import your Git repository
4. Configure project:
   - Framework Preset: Next.js
   - Root Directory: ./
   - Build Command: `npm run build`
   - Output Directory: `.next`

### 3. Configure Environment Variables in Vercel

Go to Project Settings > Environment Variables and add:

**Production Variables:**
```
NEXT_PUBLIC_SUPABASE_URL=<your-production-supabase-url>
NEXT_PUBLIC_SUPABASE_ANON_KEY=<your-production-anon-key>
SUPABASE_SERVICE_KEY=<your-production-service-key>
OPENAI_API_KEY=<your-openai-key>
OPENAI_MODEL=gpt-4-turbo-preview
LEONARDO_API_KEY=<your-leonardo-key>
LEONARDO_MODEL_ID=lucid_realism_512
NEXT_PUBLIC_APP_URL=https://your-domain.vercel.app
NODE_ENV=production
```

**For Stripe (when ready):**
```
STRIPE_PUBLIC_KEY=<your-stripe-public-key>
STRIPE_SECRET_KEY=<your-stripe-secret-key>
STRIPE_WEBHOOK_SECRET=<your-stripe-webhook-secret>
```

---

## Next Steps

### Before Going Live:

1. **Add API Keys:**
   - OpenAI API key (for story generation)
   - Leonardo.ai API key (for illustrations)
   - Stripe keys (for payments)

2. **Update .env.local with your API keys:**
```bash
OPENAI_API_KEY=sk-...
LEONARDO_API_KEY=...
```

3. **Test locally:**
```bash
npm run dev
```

4. **Create Supabase Client Utility:**
Create `lib/supabase.ts` for database access:
```typescript
import { createClient } from '@supabase/supabase-js'

export const supabase = createClient(
  process.env.NEXT_PUBLIC_SUPABASE_URL!,
  process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY!
)
```

5. **Install Supabase Client:**
```bash
npm install @supabase/supabase-js
```

---

## Useful Links

- **Local Supabase Studio:** http://127.0.0.1:54323
- **Supabase Docs:** https://supabase.com/docs
- **Vercel Docs:** https://vercel.com/docs
- **Next.js Docs:** https://nextjs.org/docs

---

## Troubleshooting

### Supabase won't start
```bash
# Stop all containers
npx supabase stop

# Start fresh
npx supabase start
```

### Database schema out of sync
```bash
# Reset database and apply all migrations
npx supabase db reset
```

### Environment variables not updating
```bash
# Restart Next.js dev server
# Kill the current server (Ctrl+C) and run:
npm run dev
```
