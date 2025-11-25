# Database Schema Reference

Generated: November 12, 2024

## Overview

This document provides a reference for the current database schema pulled from the remote Supabase instance.

## Schema Files

### 📁 Full Schema Backup
**File:** `schema_backup.sql` (147KB)
- Complete DDL for all tables, views, functions, and policies
- Includes auth, public, and storage schemas
- Can be used to recreate the entire database structure

### 📊 Table Statistics
**File:** `table_stats.txt` (2.3KB)
- Current table sizes and row counts
- Index usage statistics
- Performance metrics

## Database Tables Summary

Based on the current production database:

### Core Tables
- **user_profiles** - User account information (2 rows)
- **character_profiles** - Character definitions for stories (13 rows)
- **content** - Generated story content (99 rows)
- **stories** - Story metadata and settings

### API & Usage Tracking
- **api_cost_logs** - API usage and cost tracking (229 rows)
- **generation_usage** - Generation statistics (2 rows)
- **api_prices** - API pricing configuration (10 rows)

### Vignette System
- **vignette_panels** - Vignette panel content (550 rows)
- **avatar_cache** - Cached avatar images (131 rows)

### Descriptors System
- **descriptors_age** - Age descriptors (100 rows)
- **descriptors_gender** - Gender descriptors (56 rows)
- **descriptors_pet** - Pet descriptors (71 rows)
- **descriptors_attribute** - Attribute descriptors (73 rows)
- **descriptors_magical** - Magical descriptors (25 rows)
- **descriptor_mappings** - Descriptor relationships (9 rows)

### Configuration
- **ai_configs** - AI model configurations (8 rows)
- **story_parameters** - Story generation parameters (87 rows)
- **subscription_tiers** - Subscription plans (4 rows)

### Content Relationships
- **content_characters** - Character-content relationships (50 rows)
- **content_illustrations** - Illustration metadata (0 rows)

## Total Database Size

- **Total Tables:** 19 in public schema
- **Total Size:** ~3MB (data + indexes)
- **Largest Table:** api_cost_logs (704 KB)
- **Most Rows:** vignette_panels (550 rows)

## How to Use These Files

### View the Full Schema
```bash
# View the complete schema definition
cat supabase/schema_backup.sql

# Search for specific table definitions
grep -A 20 "CREATE TABLE public.user_profiles" supabase/schema_backup.sql
```

### Restore Schema (if needed)
```sql
-- In Supabase SQL editor, you can use parts of schema_backup.sql
-- to recreate specific tables or functions
```

### Update Schema Reference
```bash
# Pull latest schema from remote
npx supabase db dump --schema public,auth,storage -f supabase/schema_backup.sql

# Update table statistics
npx supabase inspect db table-stats --linked > supabase/table_stats.txt
```

## Migration Notes

- The schema includes all migrations up to 20251114
- Some migration history inconsistencies exist from the Docker-to-remote transition
- Use the Supabase Dashboard SQL editor for schema changes
- Use `npm run db:migrate` for data migrations

## Important Tables for Development

### user_profiles
- Primary user data table
- Links to auth.users
- Contains subscription and usage information

### character_profiles
- Stores character definitions
- Used for story personalization
- Links to user_profiles

### api_cost_logs
- Tracks all API calls and costs
- Important for usage monitoring
- Contains metadata for debugging

### content
- Stores generated stories and vignettes
- Links to characters and users
- Contains generation metadata

## Security

All tables have Row Level Security (RLS) enabled with appropriate policies for:
- User data isolation
- Service role access
- Anonymous read access where appropriate

## Related Documentation

- [MIGRATIONS.md](../docs/MIGRATIONS.md) - Migration guide
- [SETUP.md](../docs/SETUP.md) - Development setup
- [Supabase Dashboard](https://supabase.com/dashboard/project/iolimejvugpcpnmruqww) - Live database management