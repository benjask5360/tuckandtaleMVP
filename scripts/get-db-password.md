# Get Database Password

The issue is that we need your **database password**, not the service role JWT.

## Where to Find It

1. Go to: https://supabase.com/dashboard/project/iolimejvugpcpnmruqww/settings/database

2. Look for the **Database Password** section

3. If you don't see it, click "Reset Database Password" to set a new one

4. Copy the password (it will look like a random string)

## Add to .env.local

Add this line to your `.env.local`:

```bash
SUPABASE_DB_PASSWORD=your_actual_database_password_here
```

Keep the existing `SUPABASE_SERVICE_KEY` - we need both!

The SERVICE_KEY is for API calls, the DB_PASSWORD is for direct Postgres connections.

## Alternative: Use Connection String

In the same settings page, there's a "Connection string" section.

Look for the **URI** format and copy it. It should look like:

```
postgresql://postgres.[PROJECT-REF]:[YOUR-PASSWORD]@aws-1-us-east-2.pooler.supabase.com:6543/postgres
```

Once you have the password, we can test the connection again!
