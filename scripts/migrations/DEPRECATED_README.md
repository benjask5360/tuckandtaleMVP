# DEPRECATED Migration Scripts

## ⚠️ Important Notice

The migration scripts in this directory that use the `exec_sql` RPC function are **DEPRECATED**.

These scripts were written for local Docker development and rely on a custom `exec_sql` function that doesn't exist in the remote Supabase instance.

## Why These Scripts No Longer Work

1. **exec_sql dependency**: These scripts use `supabase.rpc('exec_sql', ...)` which was available in local Docker Supabase but not in hosted Supabase
2. **Security concerns**: Direct SQL execution via RPC is a security risk
3. **Better alternatives exist**: Supabase CLI and SDK provide safer, more reliable methods

## How to Run Migrations Now

### For Schema Migrations (DDL)
Use the Supabase CLI commands:
```bash
# Create a new migration
npm run db:new my_migration_name

# Push migrations to remote
npm run db:push

# Check migration status
npm run db:status
```

### For Data Migrations (DML)
Use the new migration runner:
```bash
# Run a data migration
npm run db:migrate <migration-name>

# Or directly:
node scripts/run-migration.js <migration-name>
```

## Migrating Old Scripts

If you need to run one of these old scripts, you have two options:

### Option 1: Convert to New Format
Edit `scripts/run-migration.js` and add your migration logic using Supabase SDK methods:
- Use `.from(table).insert()` for inserts
- Use `.from(table).update()` for updates
- Use `.from(table).delete()` for deletes
- Use `.from(table).select()` for queries

### Option 2: Run SQL Directly
1. Extract the SQL from the old script
2. Run it in the Supabase Dashboard SQL Editor
3. Or create a proper migration file in `supabase/migrations/`

## List of Deprecated Scripts

The following scripts use `exec_sql` and should not be used directly:
- apply-migration.js
- apply-pet-color-constraint.js
- deploy-story-migrations.js
- apply-actual-cost-migration.js
- apply-token-tracking-migrations.js
- apply-vignette-migrations.js
- apply-vignette-migrations-simple.js
- apply-vignette-scenes.js
- add-panoramic-image-url.js

## Need Help?

See the [MIGRATIONS.md](../../docs/MIGRATIONS.md) file for complete migration documentation.