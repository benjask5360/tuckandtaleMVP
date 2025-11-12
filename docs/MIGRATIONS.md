# Database Migration Guide

## Overview

This project uses Supabase as its database provider. All database operations, including schema changes and data migrations, are managed through the Supabase CLI and custom migration scripts.

**Important**: This project now uses a **remote-first** approach. Both development and production environments connect to the same remote Supabase database. Docker-based local development has been retired.

## Prerequisites

- Node.js 18+ installed
- Supabase CLI installed (via npm devDependencies)
- Access to the remote Supabase project
- Environment variables configured in `.env.local`

## Environment Setup

Ensure your `.env.local` file contains the remote database credentials:

```env
NEXT_PUBLIC_SUPABASE_URL=https://iolimejvugpcpnmruqww.supabase.co
NEXT_PUBLIC_SUPABASE_ANON_KEY=your_anon_key_here
SUPABASE_SERVICE_KEY=your_service_key_here
```

## Available Commands

All database commands are available as npm scripts:

```bash
# Push pending migrations to remote database
npm run db:push

# Pull remote schema (rarely needed)
npm run db:pull

# Check for schema differences
npm run db:diff

# View migration history
npm run db:status

# Create a new migration file
npm run db:new <migration_name>

# Run data migrations
npm run db:migrate <migration_name>
```

## Creating Migrations

### Schema Migrations (DDL)

For structural changes (tables, columns, indexes, etc.):

1. **Create a migration file**:
   ```bash
   npm run db:new add_user_preferences_table
   ```
   This creates a timestamped file in `supabase/migrations/`

2. **Edit the migration file**:
   ```sql
   -- supabase/migrations/20240101120000_add_user_preferences_table.sql
   CREATE TABLE user_preferences (
     id UUID DEFAULT gen_random_uuid() PRIMARY KEY,
     user_id UUID REFERENCES auth.users(id) ON DELETE CASCADE,
     theme TEXT DEFAULT 'light',
     notifications_enabled BOOLEAN DEFAULT true,
     created_at TIMESTAMPTZ DEFAULT NOW(),
     updated_at TIMESTAMPTZ DEFAULT NOW()
   );

   -- Add RLS policies
   ALTER TABLE user_preferences ENABLE ROW LEVEL SECURITY;

   CREATE POLICY "Users can view own preferences"
     ON user_preferences FOR SELECT
     USING (auth.uid() = user_id);
   ```

3. **Push the migration**:
   ```bash
   npm run db:push
   ```

### Data Migrations (DML)

For data changes (inserts, updates, deletes):

1. **Edit the migration runner** (`scripts/run-migration.js`):
   ```javascript
   case 'seed-default-tiers':
     await insertData('subscription_tiers', [
       {
         name: 'Free',
         price_per_month: 0,
         tokens_per_month: 500,
         character_limit: 2,
         storage_limit: '100MB',
         priority_support: false
       },
       {
         name: 'Pro',
         price_per_month: 9.99,
         tokens_per_month: 5000,
         character_limit: 10,
         storage_limit: '1GB',
         priority_support: true
       }
     ]);
     break;
   ```

2. **Run the migration**:
   ```bash
   npm run db:migrate seed-default-tiers
   ```

## Best Practices

### 1. Migration Naming

- Use descriptive names: `add_user_avatar_column` not `update_users`
- Include action verbs: `create_`, `add_`, `remove_`, `update_`
- Keep names concise but clear

### 2. Migration Safety

- **Always test locally first** (if possible)
- Include rollback statements when appropriate
- Use transactions for multi-step operations
- Never drop columns/tables without backup

### 3. RLS (Row Level Security)

Always consider RLS when creating tables:

```sql
-- Enable RLS
ALTER TABLE my_table ENABLE ROW LEVEL SECURITY;

-- Add policies
CREATE POLICY "policy_name" ON my_table
  FOR SELECT USING (auth.uid() = user_id);
```

### 4. Timestamps

Include timestamps on all tables:

```sql
created_at TIMESTAMPTZ DEFAULT NOW(),
updated_at TIMESTAMPTZ DEFAULT NOW()
```

And add update trigger:

```sql
CREATE TRIGGER update_my_table_updated_at
  BEFORE UPDATE ON my_table
  FOR EACH ROW
  EXECUTE FUNCTION update_updated_at_column();
```

## Troubleshooting

### Migration Won't Push

If you see errors about migration history:

1. **Check migration status**:
   ```bash
   npm run db:status
   ```

2. **Verify file naming**:
   - Files must match pattern: `YYYYMMDDHHMMSS_name.sql`
   - No special characters except underscores

3. **Check for conflicts**:
   - Ensure no duplicate timestamps
   - Verify migrations are in correct order

### Connection Issues

If CLI can't connect to remote:

1. **Verify environment variables**:
   ```bash
   echo $NEXT_PUBLIC_SUPABASE_URL
   ```

2. **Re-link project**:
   ```bash
   npx supabase link --project-ref iolimejvugpcpnmruqww
   ```

3. **Check network**:
   - Ensure no firewall blocking
   - Verify internet connection

### Data Migration Fails

If data migrations fail:

1. **Check constraints**:
   - Foreign key violations
   - Unique constraints
   - Check constraints

2. **Verify permissions**:
   - Service key has sufficient privileges
   - RLS policies aren't blocking

3. **Debug with SDK**:
   ```javascript
   const { data, error } = await supabase
     .from('table')
     .select('*');
   console.log('Error:', error);
   ```

## Legacy Migration Scripts

The scripts in `scripts/migrations/` that use `exec_sql` are deprecated. They were designed for local Docker development and won't work with remote Supabase.

To migrate these old scripts:

1. Extract the SQL statements
2. Either:
   - Create a proper migration file in `supabase/migrations/`
   - Add to `scripts/run-migration.js` using SDK methods
   - Run directly in Supabase Dashboard SQL Editor

See `scripts/migrations/DEPRECATED_README.md` for details.

## Security Notes

- **Never commit sensitive data** in migration files
- **Use environment variables** for configuration
- **Apply RLS policies** to all user-facing tables
- **Test migrations** in a staging environment first
- **Keep service keys secure** and rotate regularly

## Additional Resources

- [Supabase CLI Documentation](https://supabase.com/docs/guides/cli)
- [Supabase Migrations Guide](https://supabase.com/docs/guides/getting-started/local-development#database-migrations)
- [PostgreSQL Documentation](https://www.postgresql.org/docs/)
- [RLS Best Practices](https://supabase.com/docs/guides/auth/row-level-security)