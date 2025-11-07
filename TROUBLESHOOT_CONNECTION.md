# Troubleshooting Supabase Connection Issues

## Problem
The Supabase CLI cannot connect to your production database due to network timeout/firewall blocking.

**Error:** `dial tcp 3.131.201.192:5432: i/o timeout`
**Root Cause:** 100% packet loss to `aws-1-us-east-2.pooler.supabase.com`

## Quick Solutions

### Option 1: Use Different Network
The most reliable solution:
1. **Try a different WiFi network** (coffee shop, phone hotspot, etc.)
2. **Use a VPN** if your corporate/home firewall is blocking AWS connections
3. **Use mobile hotspot** from your phone

### Option 2: Check Windows Firewall
1. Open Windows Defender Firewall
2. Click "Allow an app or feature through Windows Defender Firewall"
3. Make sure Node.js and/or your terminal have network access
4. Temporarily disable firewall to test:
   ```powershell
   # Run as Administrator
   netsh advfirewall set allprofiles state off
   # Test connection
   npx supabase db push --linked -p adsdf7897JKH
   # Turn firewall back on
   netsh advfirewall set allprofiles state on
   ```

### Option 3: Use Supabase Studio (Manual but Reliable)
Since the CLI can't connect, use the web interface:

1. **Open Supabase Studio SQL Editor:**
   https://supabase.com/dashboard/project/iolimejvugpcpnmruqww/sql/new

2. **Run Migration 1 - Create Tables:**
   - Copy the ENTIRE contents of: `supabase/migrations/20251108_create_descriptor_system.sql`
   - Paste into SQL Editor
   - Click "Run" (or press Ctrl+Enter)
   - Wait for "Success" message

3. **Run Migration 2 - Seed Data:**
   - Copy the ENTIRE contents of: `supabase/migrations/20251109_seed_descriptors.sql`
   - Paste into SQL Editor
   - Click "Run" (or press Ctrl+Enter)
   - Wait for "Success" message (this may take a few seconds)

4. **Verify Deployment:**
   Run this query in SQL Editor:
   ```sql
   SELECT 'descriptors_attribute' as table_name, COUNT(*) as row_count FROM descriptors_attribute
   UNION ALL
   SELECT 'descriptors_age', COUNT(*) FROM descriptors_age
   UNION ALL
   SELECT 'descriptors_gender', COUNT(*) FROM descriptors_gender
   UNION ALL
   SELECT 'descriptors_pet', COUNT(*) FROM descriptors_pet
   UNION ALL
   SELECT 'descriptors_magical', COUNT(*) FROM descriptors_magical
   UNION ALL
   SELECT 'descriptor_mappings', COUNT(*) FROM descriptor_mappings;
   ```

   Expected results:
   - descriptors_attribute: ~60 rows
   - descriptors_age: 19 rows
   - descriptors_gender: 6 rows
   - descriptors_pet: ~30 rows
   - descriptors_magical: ~30 rows
   - descriptor_mappings: 6 rows

### Option 4: Use Alternative CLI Method
If you have Git Bash installed (often better network handling):

1. Open Git Bash (NOT PowerShell or CMD)
2. Navigate to project:
   ```bash
   cd /f/Projects/tuckandtaleMVP/tuckandtaleMVP
   ```
3. Run migration:
   ```bash
   npx supabase db push --linked -p adsdf7897JKH
   ```

### Option 5: Antivirus/Security Software
Some antivirus software blocks database connections:
1. Check if you have antivirus software (Norton, McAfee, Kaspersky, etc.)
2. Temporarily disable it
3. Retry: `npx supabase db push --linked -p adsdf7897JKH`
4. Re-enable antivirus

### Option 6: Use Direct Connection (Requires Session Pooler Access)
If session pooler is available:
```bash
# This requires waiting for available connections
npx supabase db push --db-url "postgresql://postgres:adsdf7897JKH@aws-0-us-east-2.pooler.supabase.com:5432/postgres"
```

## Network Diagnostics

### Test Supabase Connectivity
```bash
# Test if you can reach Supabase
ping aws-1-us-east-2.pooler.supabase.com

# Test specific port
# (Requires telnet client - enable in Windows Features)
telnet aws-1-us-east-2.pooler.supabase.com 5432
```

### Check Proxy Settings
```bash
# Check if you're behind a proxy
echo %HTTP_PROXY%
echo %HTTPS_PROXY%
```

If proxy is set, you may need to configure Supabase CLI to use it.

## What's Being Deployed

The descriptor system includes:
1. **5 descriptor tables** for modular attribute storage
2. **Comprehensive seed data** with ~150 descriptors
3. **RLS policies** for security
4. **Indexes** for performance
5. **Mapping table** to link profile types to descriptors

## After Successful Deployment

Once migrations are applied, verify the system works:

1. **Check in Supabase Studio:**
   - Go to Table Editor
   - Look for new tables: `descriptors_attribute`, `descriptors_age`, etc.

2. **Test API endpoint:**
   ```bash
   # If app is running locally
   curl http://localhost:3000/api/descriptors/child
   ```

3. **Create a test character** to see enhanced descriptions in action

## Still Having Issues?

If none of these work:
1. **Contact your IT department** if on corporate network
2. **Check router settings** if on home network
3. **Try from a completely different location**
4. **Use Option 3 (Supabase Studio)** - this always works

## Quick Command Reference

```bash
# Check project link status
npx supabase projects list

# Check migration status
npx supabase migration list

# Push migrations (requires working connection)
npx supabase db push --linked -p adsdf7897JKH

# Pull current schema from production
npx supabase db pull
```