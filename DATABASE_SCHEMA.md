# Tuck and Tale Database Schema

## Overview

This document describes the complete database schema for the Tuck and Tale MVP application. The schema is designed for flexibility, future expansion, and no-code configuration wherever possible.

## Database Tables

### 1. `api_cost_logs`
**Purpose:** Track all AI API usage and costs for accountability and optimization.

| Column | Type | Description |
|--------|------|-------------|
| `id` | uuid | Primary key |
| `user_id` | uuid | Reference to auth.users (nullable for testing) |
| `provider` | text | API provider ('openai', 'leonardo', etc.) |
| `operation` | text | Operation type ('story_generation', 'image_generation', etc.) |
| `model_used` | text | The actual model name used |
| `prompt_tokens` | integer | Number of prompt tokens (OpenAI) |
| `completion_tokens` | integer | Number of completion tokens (OpenAI) |
| `total_tokens` | integer | Total token count |
| `estimated_cost` | decimal(10,6) | Estimated USD cost |
| `metadata` | jsonb | Flexible storage for additional data |
| `created_at` | timestamptz | Creation timestamp |

---

### 2. `subscription_tiers`
**Purpose:** No-code configurable pricing tiers and features. This table can be edited directly in the database to change pricing, limits, and features without redeploying.

| Column | Type | Description |
|--------|------|-------------|
| `id` | uuid | Primary key |
| `tier_name` | text | Unique tier identifier ('free', 'moonlight', etc.) |
| `display_name` | text | Display name for UI |
| `price_monthly` | decimal(10,2) | Monthly price in USD |
| `price_yearly` | decimal(10,2) | Yearly price in USD |
| `stories_per_day` | integer | Daily story limit (null = unlimited) |
| `stories_per_month` | integer | Monthly story limit (null = unlimited) |
| `avatar_regenerations_per_month` | integer | Avatar regeneration limit |
| `features` | jsonb | Feature flags (e.g., {"priority_generation": true}) |
| `display_order` | integer | Display order in UI |
| `is_active` | boolean | Whether tier is currently available |
| `created_at` | timestamptz | Creation timestamp |
| `updated_at` | timestamptz | Last update timestamp |

**Pre-seeded Tiers:**
- **Free**: 3 stories/day, basic features
- **Moonlight**: $9.99/mo, 50 stories/month, custom characters
- **Starlight**: $19.99/mo, 200 stories/month, priority queue
- **Supernova**: $39.99/mo, unlimited, early access features

---

### 3. `user_profiles`
**Purpose:** Store parent account data, subscription status, and usage counters.

| Column | Type | Description |
|--------|------|-------------|
| `id` | uuid | Primary key (references auth.users) |
| `email` | text | User email |
| `full_name` | text | User's full name |
| `subscription_tier_id` | uuid | Current subscription tier |
| `stripe_customer_id` | text | Stripe customer ID |
| `stripe_subscription_id` | text | Stripe subscription ID |
| `subscription_status` | text | Status ('free', 'active', 'cancelled', etc.) |
| `subscription_starts_at` | timestamptz | Subscription start date |
| `subscription_ends_at` | timestamptz | Subscription end date |
| `generations_used_today` | integer | Daily usage counter |
| `generations_used_this_month` | integer | Monthly usage counter |
| `daily_limit_reset_at` | timestamptz | Next daily reset (00:00 UTC) |
| `monthly_limit_reset_at` | timestamptz | Next monthly reset |
| `created_at` | timestamptz | Creation timestamp |
| `updated_at` | timestamptz | Last update timestamp |

**Notes:**
- Usage resets are handled by application code (not database triggers)
- Profile is automatically created when user signs up

---

### 4. `character_profiles`
**Purpose:** Store reusable story characters with flexible attributes.

| Column | Type | Description |
|--------|------|-------------|
| `id` | uuid | Primary key |
| `user_id` | uuid | Owner of the character |
| `character_type` | text | Type ('child', 'storybook_character', 'pet', 'magical_creature') |
| `name` | text | Character name |
| `attributes` | jsonb | Flexible attributes (age, personality, favorites, etc.) |
| `appearance_description` | text | AI-generated appearance description |
| `avatar_cache_id` | uuid | Link to cached avatar |
| `is_primary` | boolean | Whether this is the primary character |
| `created_at` | timestamptz | Creation timestamp |
| `updated_at` | timestamptz | Last update timestamp |
| `deleted_at` | timestamptz | Soft delete timestamp |

**Character Types:**
- `child`: User's child
- `storybook_character`: Custom fictional characters
- `pet`: Family pets
- `magical_creature`: Fantasy characters

---

### 5. `content`
**Purpose:** Unified table for all generative content (stories now, worksheets/lessons later).

| Column | Type | Description |
|--------|------|-------------|
| `id` | uuid | Primary key |
| `user_id` | uuid | Content owner |
| `content_type` | text | Type ('story', 'worksheet', 'lesson', 'activity', 'custom') |
| `title` | text | Content title |
| `body` | text | The actual content text |
| `theme` | text | Content theme |
| `age_appropriate_for` | integer[] | Age range (e.g., [3,4,5,6]) |
| `duration_minutes` | integer | Reading/activity time |
| `parent_content_id` | uuid | For series/chapters |
| `generation_prompt` | text | The prompt used to generate |
| `generation_metadata` | jsonb | Full API response, parameters |
| `is_favorite` | boolean | User favorited |
| `read_count` | integer | Times accessed |
| `last_accessed_at` | timestamptz | Last access time |
| `created_at` | timestamptz | Creation timestamp |
| `updated_at` | timestamptz | Last update timestamp |
| `deleted_at` | timestamptz | Soft delete timestamp |

---

### 6. `content_characters`
**Purpose:** Junction table linking content to characters.

| Column | Type | Description |
|--------|------|-------------|
| `id` | uuid | Primary key |
| `content_id` | uuid | Reference to content |
| `character_profile_id` | uuid | Reference to character |
| `role` | text | Flexible role (hero, sidekick, pet, etc.) |
| `character_name_in_content` | text | Override name for this content |
| `created_at` | timestamptz | Creation timestamp |

---

### 7. `content_illustrations`
**Purpose:** Store image metadata with Supabase Storage paths.

| Column | Type | Description |
|--------|------|-------------|
| `id` | uuid | Primary key |
| `content_id` | uuid | Reference to content |
| `storage_path` | text | Path in Supabase Storage |
| `image_url` | text | Public URL |
| `image_hash` | text | For duplicate detection |
| `leonardo_generation_id` | text | Leonardo tracking ID |
| `illustration_type` | text | Type ('storybook_cover', 'storybook_illustration', etc.) |
| `sequence_order` | integer | Order (0=cover, 1+=scenes) |
| `prompt_used` | text | Generation prompt |
| `style` | text | Art style |
| `generation_metadata` | jsonb | Full Leonardo response |
| `created_at` | timestamptz | Creation timestamp |

**Illustration Types:**
- `storybook_cover`: Main cover image
- `storybook_illustration`: Scene illustrations
- `character_portrait`: Character images
- `background`: Background scenes

---

### 8. `avatar_cache`
**Purpose:** Cache Leonardo avatar generations for reuse and cost savings.

| Column | Type | Description |
|--------|------|-------------|
| `id` | uuid | Primary key |
| `character_profile_id` | uuid | Reference to character |
| `leonardo_generation_id` | text | Leonardo generation ID |
| `leonardo_model_id` | text | Model used |
| `storage_path` | text | Path in Supabase Storage |
| `image_url` | text | Public URL |
| `image_hash` | text | For duplicate detection |
| `style` | text | Art style variant |
| `is_current` | boolean | Active avatar for this style |
| `prompt_used` | text | Generation prompt |
| `generation_metadata` | jsonb | Full Leonardo response |
| `created_at` | timestamptz | Creation timestamp |

---

## Security

### Row Level Security (RLS)
All user-owned tables have RLS enabled with the following policies:

- **api_cost_logs**: Users can view their own costs
- **user_profiles**: Users can view/update their own profile
- **character_profiles**: Users can manage their own characters
- **content**: Users can manage their own content
- **content_characters**: Managed through content ownership
- **content_illustrations**: Managed through content ownership
- **avatar_cache**: Managed through character ownership

### Authentication
- User authentication is handled by Supabase Auth
- Profile creation is automatic on signup via database trigger

---

## Storage Structure

### Supabase Storage Buckets
Images are stored in Supabase Storage (not in the database):

1. **avatars/** - Character avatar images
   - Path: `avatars/{user_id}/{character_id}/{style}_{timestamp}.webp`

2. **illustrations/** - Story and content illustrations
   - Path: `illustrations/{user_id}/{content_id}/{type}_{order}_{timestamp}.webp`

3. **user-uploads/** - Future user uploads
   - Path: `user-uploads/{user_id}/{type}/{filename}`

---

## Key Design Principles

1. **Flexibility**: JSONB columns for metadata and attributes
2. **No-code Configuration**: subscription_tiers is fully editable via database
3. **Soft Deletes**: content and character_profiles support restoration
4. **Cost Tracking**: Comprehensive API usage logging from day one
5. **Future-proof**: Unified content table supports multiple content types
6. **Performance**: Indexes on all foreign keys and frequently queried columns

---

## Migration Status

✅ **Deployed to Production**: November 5, 2024

All tables, indexes, and RLS policies have been successfully deployed to both local and production Supabase instances.

---

## Maintenance Notes

### Usage Reset Strategy
- Daily resets: Handled by Edge Function at 00:00 UTC
- Monthly resets: Triggered by Stripe webhook on billing cycle

### Avatar Caching
- Avatars are generated on-demand (lazy loading)
- Old avatars are archived (is_current = false) not deleted
- Multiple style variants can be cached per character

### Content Types
The system is designed to expand beyond stories:
- Worksheets (educational content)
- Lessons (learning materials)
- Activities (interactive content)
- Custom (user-defined types)

All use the same `content` table with different `content_type` values.