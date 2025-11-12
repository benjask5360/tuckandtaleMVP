# Production Supabase Setup - Complete! ✅

## Your Production Database

**Project URL:** https://iolimejvugpcpnmruqww.supabase.co
**Dashboard:** https://supabase.com/dashboard/project/iolimejvugpcpnmruqww

### ✅ Completed Steps

1. **Production Supabase Project Created**
   - Project Reference: `iolimejvugpcpnmruqww`
   - Region: Configured
   - Database: PostgreSQL with all tables created

2. **Database Schema Deployed**
   - ✅ `profiles` table
   - ✅ `children` table
   - ✅ `stories` table
   - ✅ `subscriptions` table
   - ✅ `usage` table
   - ✅ All Row Level Security (RLS) policies
   - ✅ Indexes for performance
   - ✅ Triggers for auto-updates

3. **Local Project Linked to Production**
   - You can now push future migrations with: `npx supabase db push`

4. **Environment Variables Updated**
   - `.env.production` has all production Supabase keys

---

## Next Steps for Deployment

### 1. Deploy to Vercel

```bash
# Login to Vercel
vercel login

# Deploy
vercel

# Or deploy to production directly
vercel --prod
```

### 2. Add Environment Variables in Vercel

Go to your Vercel project dashboard → Settings → Environment Variables

Add these for **Production**:

```
NEXT_PUBLIC_SUPABASE_URL=https://iolimejvugpcpnmruqww.supabase.co
NEXT_PUBLIC_SUPABASE_ANON_KEY=eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJpc3MiOiJzdXBhYmFzZSIsInJlZiI6ImlvbGltZWp2dWdwY3BubXJ1cXd3Iiwicm9sZSI6ImFub24iLCJpYXQiOjE3NjIzNzQwOTQsImV4cCI6MjA3Nzk1MDA5NH0.imnMAeEpfT3HsCs6bjZi4affIrubNc6ImRWb9HOkvUY
SUPABASE_SERVICE_KEY=eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJpc3MiOiJzdXBhYmFzZSIsInJlZiI6ImlvbGltZWp2dWdwY3BubXJ1cXd3Iiwicm9sZSI6InNlcnZpY2Vfcm9sZSIsImlhdCI6MTc2MjM3NDA5NCwiZXhwIjoyMDc3OTUwMDk0fQ.ybv7KgWy0fdRTik1UkX3nAjdgLsBEExpLUrvnG2FRMA

# When you get these keys:
OPENAI_API_KEY=your_key_here
LEONARDO_API_KEY=your_key_here
STRIPE_PUBLIC_KEY=your_key_here
STRIPE_SECRET_KEY=your_key_here
STRIPE_WEBHOOK_SECRET=your_key_here

NEXT_PUBLIC_APP_URL=https://your-domain.vercel.app
NODE_ENV=production
```

### 3. View Your Production Database

**Supabase Studio:** https://supabase.com/dashboard/project/iolimejvugpcpnmruqww/editor

You can:
- View all tables
- Run SQL queries
- Manage authentication
- View API logs
- Test your database

---

## Database Management

### First-Time Setup
```bash
# 1. Login to Supabase CLI (get access token from https://app.supabase.com/account/tokens)
npx supabase login --token YOUR_ACCESS_TOKEN

# 2. Link to your production project
npx supabase link --project-ref iolimejvugpcpnmruqww

# You'll be prompted for your database password
# Database password: adsdf7897JKH
```

### Push Migrations to Production
```bash
# IMPORTANT: Always use the --linked flag and provide the password

# Push all pending migrations
npx supabase db push --linked --password adsdf7897JKH

# The command will show you which migrations will be applied
# Confirm with 'Y' to proceed
```

### Create New Migrations
```bash
# Create new migration file
npx supabase migration new my_new_feature

# Edit the migration file in supabase/migrations/

# Push to production
npx supabase db push --linked --password adsdf7897JKH
```

### View Migration Status
```bash
# See which migrations are applied locally vs production
npx supabase migration list
```

### Generate TypeScript Types
```bash
# Generate types from your production database
npx supabase gen types typescript --linked > types/supabase.ts
```

---

## Testing Your Setup

### Test Local Connection
```bash
# Your local Supabase is at:
# http://127.0.0.1:54321
# Studio: http://127.0.0.1:54323

npm run dev
```

### Test Production Connection
Update your `.env.local` temporarily to use production values, then:
```bash
npm run dev
# Test that everything connects properly
# IMPORTANT: Switch back to local values after testing!
```

---

## Security Notes

⚠️ **IMPORTANT:**
- ✅ `.env.local` is in `.gitignore` (local secrets safe)
- ✅ `.env.production` is in `.gitignore` (production secrets safe)
- ✅ Never commit API keys to Git
- ✅ Only add environment variables through Vercel dashboard for production

---

## Your Database Schema

### Tables Overview:

1. **profiles** - User accounts (linked to Supabase Auth)
2. **children** - Child profiles with names, ages, favorites
3. **stories** - Generated bedtime stories with illustrations
4. **subscriptions** - Stripe subscription management (Moonlight/Starlight/Supernova tiers)
5. **usage** - Monthly story generation tracking

### RLS Security:
- ✅ All tables protected with Row Level Security
- ✅ Users can only access their own data
- ✅ Automatic profile creation on signup

---

## Useful Commands

```bash
# Start local Supabase
npx supabase start

# Stop local Supabase
npx supabase stop

# View local database in browser
# Open: http://127.0.0.1:54323

# Push migrations to production (IMPORTANT: use --linked flag!)
npx supabase db push --linked --password adsdf7897JKH

# Pull production schema to local
npx supabase db pull

# View migration status (local vs remote)
npx supabase migration list

# View your Supabase projects
npx supabase projects list
```

---

## Troubleshooting

### "Tenant or user not found" Error
**Problem:** Connection fails with this error
**Solution:** Use the `--linked` flag instead of `--db-url`:
```bash
npx supabase db push --linked --password adsdf7897JKH
```

### "Connection timeout" Errors
**Problem:** Can't connect to pooler
**Solution:** This is expected. The `--linked` flag handles the connection correctly. Don't try to use the pooler URL directly.

### "Password authentication failed"
**Problem:** Wrong database password
**Solution:** The correct password is `adsdf7897JKH` (stored in `.env.production`)

### Migrations Not Appearing in Production
**Problem:** Ran `npx supabase db push` but migrations didn't apply
**Solution:** You forgot the `--linked` flag. Always use:
```bash
npx supabase db push --linked --password adsdf7897JKH
```

---

## Support & Resources

- **Supabase Dashboard:** https://supabase.com/dashboard
- **Supabase Docs:** https://supabase.com/docs
- **Vercel Docs:** https://vercel.com/docs
- **Your Production DB:** https://supabase.com/dashboard/project/iolimejvugpcpnmruqww

---

🎉 **You're all set!** Your production database is live and ready to use.

### Quick Reference Card

**Push migrations to production:**
```bash
npx supabase db push --linked --password adsdf7897JKH
```

**Create new migration:**
```bash
npx supabase migration new my_feature_name
```

**Check migration status:**
```bash
npx supabase migration list
```
