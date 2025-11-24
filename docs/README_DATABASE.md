# Database Migration System - WORKING ✅

## System Status

✅ **FULLY OPERATIONAL** - Automated migration system working via dedicated pooler

## Quick Start

### Push Migrations
```bash
npm run migrate
```

### Create New Migration
```bash
npm run migrate:new your_migration_name
```

Then edit the generated file in `supabase/migrations/` and run `npm run migrate`.

## How It Works

This project uses a **custom migration system** that connects directly to your Supabase database via the **dedicated pooler** (available on paid Supabase projects).

**Why not use Supabase CLI?**
The Supabase CLI defaults to the shared pooler (`aws-1-us-east-2.pooler.supabase.com`), which experiences authentication timeouts. Paid projects have access to a co-located dedicated pooler that performs much better.

**Connection Details:**
- **Host:** `db.iolimejvugpcpnmruqww.supabase.co`
- **Port:** `6543` (PgBouncer)
- **User:** `postgres`
- **Database:** `postgres`
- **Password:** Set in `.env.local` as `SUPABASE_DB_PASSWORD`

## Migration Workflow

1. **Create migration:**
   ```bash
   npm run migrate:new add_new_feature
   ```
   This creates: `supabase/migrations/[timestamp]_add_new_feature.sql`

2. **Edit the SQL file:**
   Write your database changes (CREATE TABLE, ALTER TABLE, etc.)

3. **Push to database:**
   ```bash
   npm run migrate
   ```

4. **Verify:**
   The script will:
   - Connect to dedicated pooler
   - Check which migrations are already applied
   - Apply new migrations in a transaction
   - Record in `supabase_migrations.schema_migrations` table

## Project Configuration

### Required Environment Variables (`.env.local`)
```
NEXT_PUBLIC_SUPABASE_URL=https://iolimejvugpcpnmruqww.supabase.co
NEXT_PUBLIC_SUPABASE_ANON_KEY=your_anon_key
SUPABASE_SERVICE_KEY=your_service_key
SUPABASE_DB_PASSWORD=your_database_password
```

### Database Info
- **Project:** tuckandtaleMVP
- **Reference:** iolimejvugpcpnmruqww
- **Region:** us-east-2
- **Pool Size:** 20 connections
- **Max Clients:** 200

## Technical Details

### Migration Script (`scripts/db-push-dedicated.js`)

The automation script:
1. Reads all `.sql` files from `supabase/migrations/`
2. Connects to dedicated pooler
3. Queries `supabase_migrations.schema_migrations` for applied migrations
4. Applies new migrations in alphabetical order
5. Each migration runs in a transaction (atomicity guaranteed)
6. Records successful migrations in tracking table

### Why This Approach Works

**Problem:** Supabase CLI uses shared pooler → authentication timeouts
**Solution:** Direct connection to dedicated pooler → reliable, fast

**Shared Pooler (CLI default):**
- Host: `aws-1-us-east-2.pooler.supabase.com`
- Separate server from database
- Shared across many projects
- Authentication queue timeouts under load

**Dedicated Pooler (our solution):**
- Host: `db.iolimejvugpcpnmruqww.supabase.co`
- Co-located with database
- Only for your project
- No authentication delays

## Troubleshooting

### Connection Issues

If you see connection errors, verify your password:
```bash
node -e "require('dotenv').config({path:'.env.local'}); console.log('Password:', process.env.SUPABASE_DB_PASSWORD)"
```

### Migration Conflicts

If migrations get out of sync, check applied migrations in [Supabase Dashboard](https://supabase.com/dashboard/project/iolimejvugpcpnmruqww/sql):
```sql
SELECT * FROM supabase_migrations.schema_migrations ORDER BY version;
```

### Manual Database Changes

You can also make changes directly via [SQL Editor](https://supabase.com/dashboard/project/iolimejvugpcpnmruqww/sql):
```sql
-- Example: Add a column
ALTER TABLE users ADD COLUMN preferences JSONB DEFAULT '{}';
```

## Dashboard Links

- **SQL Editor:** https://supabase.com/dashboard/project/iolimejvugpcpnmruqww/sql
- **Table Editor:** https://supabase.com/dashboard/project/iolimejvugpcpnmruqww/editor
- **Database Settings:** https://supabase.com/dashboard/project/iolimejvugpcpnmruqww/settings/database

## Scripts Reference

```bash
# Migration commands
npm run migrate              # Push all new migrations
npm run migrate:new <name>   # Create new migration file

# Database scripts (in scripts/ folder)
node scripts/db-push-dedicated.js    # Main migration script
```

## Success Indicators

When migrations work correctly, you'll see:
```
🚀 Pushing Migrations via Dedicated Pooler
━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━
✅ Connected to dedicated pooler
📊 Applied migrations: X
📁 Found migration files: Y

🔄 Applying: [migration_name].sql
   ✅ Success

━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━
✨ All migrations applied!
```

## Migration History

Current applied migrations: **1**
- `20251114154451_test_connection.sql` - System verification test

---

**Last Updated:** 2025-11-14
**Status:** ✅ Production Ready
