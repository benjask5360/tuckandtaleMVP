-- Create Storage Buckets for Tuck and Tale
-- This migration creates the necessary storage buckets for avatars, illustrations, and user uploads

-- =========================================
-- STORAGE BUCKETS
-- =========================================

-- 1. Avatars Bucket
-- For character avatar images
INSERT INTO storage.buckets (id, name, public, file_size_limit, allowed_mime_types)
VALUES (
  'avatars',
  'avatars',
  true, -- Public bucket so images can be displayed
  5242880, -- 5MB limit per file
  ARRAY['image/jpeg', 'image/png', 'image/webp', 'image/gif']
)
ON CONFLICT (id) DO NOTHING;

-- 2. Illustrations Bucket
-- For story and content illustrations
INSERT INTO storage.buckets (id, name, public, file_size_limit, allowed_mime_types)
VALUES (
  'illustrations',
  'illustrations',
  true, -- Public bucket
  10485760, -- 10MB limit per file (larger for high-quality illustrations)
  ARRAY['image/jpeg', 'image/png', 'image/webp', 'image/gif']
)
ON CONFLICT (id) DO NOTHING;

-- 3. User Uploads Bucket
-- For future user uploads (optional/reserved for later)
INSERT INTO storage.buckets (id, name, public, file_size_limit, allowed_mime_types)
VALUES (
  'user-uploads',
  'user-uploads',
  false, -- Private bucket for security
  5242880, -- 5MB limit
  ARRAY['image/jpeg', 'image/png', 'image/webp', 'image/gif', 'application/pdf']
)
ON CONFLICT (id) DO NOTHING;

-- =========================================
-- STORAGE POLICIES
-- =========================================

-- Avatars Bucket Policies
-- Allow users to upload avatars to their own folder
CREATE POLICY "Users can upload avatars to own folder"
ON storage.objects FOR INSERT
TO authenticated
WITH CHECK (
  bucket_id = 'avatars' AND
  (storage.foldername(name))[1] = auth.uid()::text
);

-- Allow users to update their own avatars
CREATE POLICY "Users can update own avatars"
ON storage.objects FOR UPDATE
TO authenticated
USING (
  bucket_id = 'avatars' AND
  (storage.foldername(name))[1] = auth.uid()::text
);

-- Allow users to delete their own avatars
CREATE POLICY "Users can delete own avatars"
ON storage.objects FOR DELETE
TO authenticated
USING (
  bucket_id = 'avatars' AND
  (storage.foldername(name))[1] = auth.uid()::text
);

-- Allow public read access to avatars (for displaying in stories)
CREATE POLICY "Public can view avatars"
ON storage.objects FOR SELECT
TO public
USING (bucket_id = 'avatars');

-- Illustrations Bucket Policies
-- Allow users to upload illustrations to their own folder
CREATE POLICY "Users can upload illustrations to own folder"
ON storage.objects FOR INSERT
TO authenticated
WITH CHECK (
  bucket_id = 'illustrations' AND
  (storage.foldername(name))[1] = auth.uid()::text
);

-- Allow users to update their own illustrations
CREATE POLICY "Users can update own illustrations"
ON storage.objects FOR UPDATE
TO authenticated
USING (
  bucket_id = 'illustrations' AND
  (storage.foldername(name))[1] = auth.uid()::text
);

-- Allow users to delete their own illustrations
CREATE POLICY "Users can delete own illustrations"
ON storage.objects FOR DELETE
TO authenticated
USING (
  bucket_id = 'illustrations' AND
  (storage.foldername(name))[1] = auth.uid()::text
);

-- Allow public read access to illustrations
CREATE POLICY "Public can view illustrations"
ON storage.objects FOR SELECT
TO public
USING (bucket_id = 'illustrations');

-- User Uploads Bucket Policies (Private)
-- Allow users to upload to their own folder
CREATE POLICY "Users can upload to own folder"
ON storage.objects FOR INSERT
TO authenticated
WITH CHECK (
  bucket_id = 'user-uploads' AND
  (storage.foldername(name))[1] = auth.uid()::text
);

-- Allow users to view their own uploads
CREATE POLICY "Users can view own uploads"
ON storage.objects FOR SELECT
TO authenticated
USING (
  bucket_id = 'user-uploads' AND
  (storage.foldername(name))[1] = auth.uid()::text
);

-- Allow users to update their own uploads
CREATE POLICY "Users can update own uploads"
ON storage.objects FOR UPDATE
TO authenticated
USING (
  bucket_id = 'user-uploads' AND
  (storage.foldername(name))[1] = auth.uid()::text
);

-- Allow users to delete their own uploads
CREATE POLICY "Users can delete own uploads"
ON storage.objects FOR DELETE
TO authenticated
USING (
  bucket_id = 'user-uploads' AND
  (storage.foldername(name))[1] = auth.uid()::text
);

-- =========================================
-- STORAGE BUCKET SETUP COMPLETE
-- =========================================
-- Bucket structure:
-- avatars/{user_id}/{character_id}/{style}_{timestamp}.webp
-- illustrations/{user_id}/{content_id}/{type}_{order}_{timestamp}.webp
-- user-uploads/{user_id}/{type}/{filename}