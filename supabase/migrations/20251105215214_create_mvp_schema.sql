-- Tuck and Tale MVP Database Schema
-- This migration creates all tables for the MVP application
-- Tables are created in dependency order to avoid foreign key conflicts

-- =========================================
-- 1. API COST LOGS
-- =========================================
-- Tracks all AI API usage and costs for accountability
CREATE TABLE IF NOT EXISTS public.api_cost_logs (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id uuid REFERENCES auth.users(id) ON DELETE SET NULL,
  provider text NOT NULL, -- 'openai', 'leonardo', etc.
  operation text NOT NULL, -- 'story_generation', 'image_generation', etc.
  model_used text, -- actual model name used
  prompt_tokens integer,
  completion_tokens integer,
  total_tokens integer,
  estimated_cost decimal(10, 6), -- USD cost with precision
  metadata jsonb DEFAULT '{}', -- flexible storage for any additional data
  created_at timestamptz DEFAULT now()
);

-- Indexes for api_cost_logs
CREATE INDEX idx_api_cost_logs_user_id ON public.api_cost_logs(user_id);
CREATE INDEX idx_api_cost_logs_provider ON public.api_cost_logs(provider);
CREATE INDEX idx_api_cost_logs_created_at ON public.api_cost_logs(created_at DESC);

-- =========================================
-- 2. SUBSCRIPTION TIERS
-- =========================================
-- No-code configurable pricing tiers and features
CREATE TABLE IF NOT EXISTS public.subscription_tiers (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  tier_name text UNIQUE NOT NULL, -- 'free', 'moonlight', 'starlight', 'supernova'
  display_name text NOT NULL,
  price_monthly decimal(10, 2) DEFAULT 0,
  price_yearly decimal(10, 2),
  stories_per_day integer, -- null = unlimited
  stories_per_month integer, -- null = unlimited
  avatar_regenerations_per_month integer DEFAULT 5,
  features jsonb DEFAULT '{}', -- { "priority_generation": true, "custom_characters": true, etc. }
  display_order integer NOT NULL DEFAULT 0,
  is_active boolean DEFAULT true,
  created_at timestamptz DEFAULT now(),
  updated_at timestamptz DEFAULT now()
);

-- Seed initial subscription tiers
INSERT INTO public.subscription_tiers
  (tier_name, display_name, price_monthly, price_yearly, stories_per_day, stories_per_month, avatar_regenerations_per_month, features, display_order)
VALUES
  ('free', 'Free', 0, 0, 3, 3, 0,
   '{"custom_characters": false, "illustration_styles": ["classic"], "priority_queue": false}',
   1),
  ('moonlight', 'Moonlight', 9.99, 99.99, 5, 50, 5,
   '{"custom_characters": true, "illustration_styles": ["classic", "watercolor"], "priority_queue": false}',
   2),
  ('starlight', 'Starlight', 19.99, 199.99, 10, 200, 10,
   '{"custom_characters": true, "illustration_styles": ["classic", "watercolor", "cartoon"], "priority_queue": true}',
   3),
  ('supernova', 'Supernova', 39.99, 399.99, null, null, null,
   '{"custom_characters": true, "illustration_styles": ["all"], "priority_queue": true, "early_access": true}',
   4)
ON CONFLICT (tier_name) DO NOTHING;

-- =========================================
-- 3. USER PROFILES
-- =========================================
-- Parent account data with usage tracking
CREATE TABLE IF NOT EXISTS public.user_profiles (
  id uuid PRIMARY KEY REFERENCES auth.users(id) ON DELETE CASCADE,
  email text NOT NULL,
  full_name text,
  subscription_tier_id uuid REFERENCES public.subscription_tiers(id),
  stripe_customer_id text UNIQUE,
  stripe_subscription_id text UNIQUE,
  subscription_status text DEFAULT 'free' CHECK (subscription_status IN ('free', 'active', 'cancelled', 'past_due', 'trialing')),
  subscription_starts_at timestamptz,
  subscription_ends_at timestamptz,

  -- Usage tracking (reset via app code, not triggers)
  generations_used_today integer DEFAULT 0,
  generations_used_this_month integer DEFAULT 0,
  daily_limit_reset_at timestamptz DEFAULT (date_trunc('day', now() AT TIME ZONE 'UTC') + interval '1 day'),
  monthly_limit_reset_at timestamptz DEFAULT (date_trunc('month', now() AT TIME ZONE 'UTC') + interval '1 month'),

  created_at timestamptz DEFAULT now(),
  updated_at timestamptz DEFAULT now()
);

-- Create profile automatically when user signs up
CREATE OR REPLACE FUNCTION public.handle_new_user()
RETURNS trigger AS $$
BEGIN
  INSERT INTO public.user_profiles (id, email, created_at, updated_at)
  VALUES (new.id, new.email, now(), now());
  RETURN new;
END;
$$ LANGUAGE plpgsql SECURITY DEFINER;

-- Trigger for auto-creating profile
DROP TRIGGER IF EXISTS on_auth_user_created ON auth.users;
CREATE TRIGGER on_auth_user_created
  AFTER INSERT ON auth.users
  FOR EACH ROW EXECUTE FUNCTION public.handle_new_user();

-- Indexes for user_profiles
CREATE INDEX idx_user_profiles_subscription_tier_id ON public.user_profiles(subscription_tier_id);
CREATE INDEX idx_user_profiles_stripe_customer_id ON public.user_profiles(stripe_customer_id);

-- =========================================
-- 4. CHARACTER PROFILES
-- =========================================
-- Reusable story characters with soft delete support
CREATE TABLE IF NOT EXISTS public.character_profiles (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id uuid REFERENCES auth.users(id) ON DELETE CASCADE NOT NULL,
  character_type text NOT NULL CHECK (
    character_type IN ('child', 'storybook_character', 'pet', 'magical_creature')
  ),
  name text NOT NULL,
  attributes jsonb DEFAULT '{}', -- { "age": 5, "personality": ["brave", "curious"], "favorite_color": "blue", etc. }
  appearance_description text, -- Auto-generated from attributes but editable
  avatar_cache_id uuid, -- Link to cached avatar (set when avatar is generated)
  is_primary boolean DEFAULT false,

  created_at timestamptz DEFAULT now(),
  updated_at timestamptz DEFAULT now(),
  deleted_at timestamptz -- Soft delete support
);

-- Indexes for character_profiles
CREATE INDEX idx_character_profiles_user_id ON public.character_profiles(user_id) WHERE deleted_at IS NULL;
CREATE INDEX idx_character_profiles_type ON public.character_profiles(character_type) WHERE deleted_at IS NULL;
CREATE INDEX idx_character_profiles_deleted_at ON public.character_profiles(deleted_at);

-- =========================================
-- 5. CONTENT
-- =========================================
-- Unified table for all generative content (stories, worksheets, etc.)
CREATE TABLE IF NOT EXISTS public.content (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id uuid REFERENCES auth.users(id) ON DELETE SET NULL,
  content_type text NOT NULL CHECK (
    content_type IN ('story', 'worksheet', 'lesson', 'activity', 'custom')
  ),

  -- Core content fields
  title text NOT NULL,
  body text NOT NULL, -- The actual story text, worksheet content, etc.

  -- Metadata
  theme text, -- 'adventure', 'bedtime', 'educational', etc.
  age_appropriate_for integer[], -- Array of ages like [3,4,5,6]
  duration_minutes integer,
  parent_content_id uuid REFERENCES public.content(id) ON DELETE SET NULL, -- For series/chapters

  -- Generation data
  generation_prompt text,
  generation_metadata jsonb DEFAULT '{}', -- Full API responses, parameters, etc.

  -- User engagement
  is_favorite boolean DEFAULT false,
  read_count integer DEFAULT 0,
  last_accessed_at timestamptz,

  created_at timestamptz DEFAULT now(),
  updated_at timestamptz DEFAULT now(),
  deleted_at timestamptz -- Soft delete support
);

-- Indexes for content
CREATE INDEX idx_content_user_id ON public.content(user_id) WHERE deleted_at IS NULL;
CREATE INDEX idx_content_type ON public.content(content_type) WHERE deleted_at IS NULL;
CREATE INDEX idx_content_parent_id ON public.content(parent_content_id) WHERE deleted_at IS NULL;
CREATE INDEX idx_content_created_at ON public.content(created_at DESC) WHERE deleted_at IS NULL;
CREATE INDEX idx_content_deleted_at ON public.content(deleted_at);

-- =========================================
-- 6. CONTENT CHARACTERS
-- =========================================
-- Junction table linking content to characters
CREATE TABLE IF NOT EXISTS public.content_characters (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  content_id uuid NOT NULL REFERENCES public.content(id) ON DELETE CASCADE,
  character_profile_id uuid REFERENCES public.character_profiles(id) ON DELETE SET NULL,
  role text, -- Flexible text field: 'hero', 'sidekick', 'pet', etc.
  character_name_in_content text, -- Override name for this specific content
  created_at timestamptz DEFAULT now(),

  UNIQUE(content_id, character_profile_id)
);

-- Indexes for content_characters
CREATE INDEX idx_content_characters_content_id ON public.content_characters(content_id);
CREATE INDEX idx_content_characters_character_id ON public.content_characters(character_profile_id);

-- =========================================
-- 7. CONTENT ILLUSTRATIONS
-- =========================================
-- Stores image metadata with Supabase Storage paths
CREATE TABLE IF NOT EXISTS public.content_illustrations (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  content_id uuid NOT NULL REFERENCES public.content(id) ON DELETE CASCADE,

  -- Storage references
  storage_path text NOT NULL, -- Path in Supabase Storage bucket
  image_url text NOT NULL, -- Public URL for the image
  image_hash text, -- For duplicate detection

  -- Leonardo tracking
  leonardo_generation_id text,

  -- Illustration metadata
  illustration_type text NOT NULL CHECK (
    illustration_type IN ('storybook_cover', 'storybook_illustration', 'character_portrait', 'background')
  ),
  sequence_order integer NOT NULL DEFAULT 0, -- 0 = cover, 1+ = scene order

  -- Generation details
  prompt_used text NOT NULL,
  style text, -- 'classic', 'watercolor', 'cartoon', etc.
  generation_metadata jsonb DEFAULT '{}',

  created_at timestamptz DEFAULT now(),

  UNIQUE(content_id, sequence_order)
);

-- Indexes for content_illustrations
CREATE INDEX idx_content_illustrations_content_id ON public.content_illustrations(content_id);
CREATE INDEX idx_content_illustrations_type ON public.content_illustrations(illustration_type);
CREATE INDEX idx_content_illustrations_hash ON public.content_illustrations(image_hash);

-- =========================================
-- 8. AVATAR CACHE
-- =========================================
-- Caches Leonardo avatar generations for reuse
CREATE TABLE IF NOT EXISTS public.avatar_cache (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  character_profile_id uuid REFERENCES public.character_profiles(id) ON DELETE CASCADE,

  -- Leonardo-specific data
  leonardo_generation_id text NOT NULL,
  leonardo_model_id text,

  -- Storage references
  storage_path text NOT NULL, -- Path in Supabase Storage
  image_url text NOT NULL,
  image_hash text, -- For duplicate detection

  -- Style variant tracking
  style text NOT NULL, -- 'classic', 'cartoon', 'realistic', etc.
  is_current boolean DEFAULT false, -- Mark active avatar per style

  -- Generation details
  prompt_used text NOT NULL,
  generation_metadata jsonb DEFAULT '{}',

  created_at timestamptz DEFAULT now()
);

-- Indexes for avatar_cache
CREATE INDEX idx_avatar_cache_character_id ON public.avatar_cache(character_profile_id);
CREATE INDEX idx_avatar_cache_leonardo_id ON public.avatar_cache(leonardo_generation_id);
CREATE INDEX idx_avatar_cache_style ON public.avatar_cache(style);
CREATE INDEX idx_avatar_cache_hash ON public.avatar_cache(image_hash);
CREATE INDEX idx_avatar_cache_current ON public.avatar_cache(character_profile_id, style) WHERE is_current = true;

-- =========================================
-- HELPER FUNCTIONS
-- =========================================

-- Function to update the updated_at timestamp
CREATE OR REPLACE FUNCTION public.handle_updated_at()
RETURNS trigger AS $$
BEGIN
  NEW.updated_at = now();
  RETURN NEW;
END;
$$ LANGUAGE plpgsql;

-- Apply updated_at triggers to relevant tables
DROP TRIGGER IF EXISTS handle_updated_at ON public.subscription_tiers;
CREATE TRIGGER handle_updated_at
  BEFORE UPDATE ON public.subscription_tiers
  FOR EACH ROW EXECUTE FUNCTION public.handle_updated_at();

DROP TRIGGER IF EXISTS handle_updated_at ON public.user_profiles;
CREATE TRIGGER handle_updated_at
  BEFORE UPDATE ON public.user_profiles
  FOR EACH ROW EXECUTE FUNCTION public.handle_updated_at();

DROP TRIGGER IF EXISTS handle_updated_at ON public.character_profiles;
CREATE TRIGGER handle_updated_at
  BEFORE UPDATE ON public.character_profiles
  FOR EACH ROW EXECUTE FUNCTION public.handle_updated_at();

DROP TRIGGER IF EXISTS handle_updated_at ON public.content;
CREATE TRIGGER handle_updated_at
  BEFORE UPDATE ON public.content
  FOR EACH ROW EXECUTE FUNCTION public.handle_updated_at();

-- =========================================
-- ROW LEVEL SECURITY (RLS)
-- =========================================

-- Enable RLS on all user-owned tables
ALTER TABLE public.api_cost_logs ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.user_profiles ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.character_profiles ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.content ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.content_characters ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.content_illustrations ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.avatar_cache ENABLE ROW LEVEL SECURITY;

-- RLS Policies for api_cost_logs
CREATE POLICY "Users can view own API costs" ON public.api_cost_logs
  FOR SELECT USING (auth.uid() = user_id);

CREATE POLICY "System can insert API costs" ON public.api_cost_logs
  FOR INSERT WITH CHECK (true);

-- RLS Policies for user_profiles
CREATE POLICY "Users can view own profile" ON public.user_profiles
  FOR SELECT USING (auth.uid() = id);

CREATE POLICY "Users can update own profile" ON public.user_profiles
  FOR UPDATE USING (auth.uid() = id);

-- RLS Policies for character_profiles
CREATE POLICY "Users can view own characters" ON public.character_profiles
  FOR SELECT USING (auth.uid() = user_id);

CREATE POLICY "Users can create own characters" ON public.character_profiles
  FOR INSERT WITH CHECK (auth.uid() = user_id);

CREATE POLICY "Users can update own characters" ON public.character_profiles
  FOR UPDATE USING (auth.uid() = user_id);

CREATE POLICY "Users can soft delete own characters" ON public.character_profiles
  FOR DELETE USING (auth.uid() = user_id);

-- RLS Policies for content
CREATE POLICY "Users can view own content" ON public.content
  FOR SELECT USING (auth.uid() = user_id);

CREATE POLICY "Users can create own content" ON public.content
  FOR INSERT WITH CHECK (auth.uid() = user_id);

CREATE POLICY "Users can update own content" ON public.content
  FOR UPDATE USING (auth.uid() = user_id);

CREATE POLICY "Users can soft delete own content" ON public.content
  FOR DELETE USING (auth.uid() = user_id);

-- RLS Policies for content_characters
CREATE POLICY "Users can view content characters" ON public.content_characters
  FOR SELECT USING (
    EXISTS (
      SELECT 1 FROM public.content
      WHERE content.id = content_characters.content_id
      AND content.user_id = auth.uid()
    )
  );

CREATE POLICY "Users can manage content characters" ON public.content_characters
  FOR ALL USING (
    EXISTS (
      SELECT 1 FROM public.content
      WHERE content.id = content_characters.content_id
      AND content.user_id = auth.uid()
    )
  );

-- RLS Policies for content_illustrations
CREATE POLICY "Users can view content illustrations" ON public.content_illustrations
  FOR SELECT USING (
    EXISTS (
      SELECT 1 FROM public.content
      WHERE content.id = content_illustrations.content_id
      AND content.user_id = auth.uid()
    )
  );

CREATE POLICY "Users can manage content illustrations" ON public.content_illustrations
  FOR ALL USING (
    EXISTS (
      SELECT 1 FROM public.content
      WHERE content.id = content_illustrations.content_id
      AND content.user_id = auth.uid()
    )
  );

-- RLS Policies for avatar_cache
CREATE POLICY "Users can view avatar cache" ON public.avatar_cache
  FOR SELECT USING (
    EXISTS (
      SELECT 1 FROM public.character_profiles
      WHERE character_profiles.id = avatar_cache.character_profile_id
      AND character_profiles.user_id = auth.uid()
    )
  );

CREATE POLICY "Users can manage avatar cache" ON public.avatar_cache
  FOR ALL USING (
    EXISTS (
      SELECT 1 FROM public.character_profiles
      WHERE character_profiles.id = avatar_cache.character_profile_id
      AND character_profiles.user_id = auth.uid()
    )
  );

-- =========================================
-- STORAGE BUCKETS SETUP
-- =========================================
-- Note: These buckets need to be created via Supabase Dashboard or API
-- as SQL cannot create storage buckets directly

-- Recommended bucket structure:
-- 1. 'avatars' - For character avatar images
-- 2. 'illustrations' - For story/content illustrations
-- 3. 'user-uploads' - For any future user uploads

-- Example storage paths:
-- avatars/{user_id}/{character_id}/{style}_{timestamp}.webp
-- illustrations/{user_id}/{content_id}/{type}_{order}_{timestamp}.webp

-- =========================================
-- MIGRATION COMPLETE
-- =========================================
-- This migration creates the complete MVP schema for Tuck and Tale
-- All tables are designed for flexibility and future expansion
-- subscription_tiers is fully no-code configurable
-- Soft deletes on content and character_profiles for restoration
-- RLS policies ensure data security and isolation