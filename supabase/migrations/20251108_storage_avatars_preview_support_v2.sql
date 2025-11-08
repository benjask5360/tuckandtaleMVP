-- ================================================
-- Storage Bucket Policy Update for Preview Avatars
-- ================================================
-- Updates avatars bucket policies to support preview avatar uploads
-- Preview avatars are stored at: previews/{user_id}/{generationId}.png

-- Drop existing INSERT policy
DROP POLICY IF EXISTS "Users can upload avatars to own folder" ON storage.objects;

-- Create new INSERT policy that supports both regular and preview paths
CREATE POLICY "Users can upload avatars to own folder"
ON storage.objects FOR INSERT
TO authenticated
WITH CHECK (
  bucket_id = 'avatars' AND
  (
    -- Regular path: {user_id}/{character_id}/...
    (storage.foldername(name))[1] = auth.uid()::text
    OR
    -- Preview path: previews/{user_id}/...
    ((storage.foldername(name))[1] = 'previews' AND (storage.foldername(name))[2] = auth.uid()::text)
  )
);

-- Drop existing UPDATE policy
DROP POLICY IF EXISTS "Users can update own avatars" ON storage.objects;

-- Create new UPDATE policy that supports both regular and preview paths
CREATE POLICY "Users can update own avatars"
ON storage.objects FOR UPDATE
TO authenticated
USING (
  bucket_id = 'avatars' AND
  (
    -- Regular path: {user_id}/{character_id}/...
    (storage.foldername(name))[1] = auth.uid()::text
    OR
    -- Preview path: previews/{user_id}/...
    ((storage.foldername(name))[1] = 'previews' AND (storage.foldername(name))[2] = auth.uid()::text)
  )
);

-- Drop existing DELETE policy
DROP POLICY IF EXISTS "Users can delete own avatars" ON storage.objects;

-- Create new DELETE policy that supports both regular and preview paths
CREATE POLICY "Users can delete own avatars"
ON storage.objects FOR DELETE
TO authenticated
USING (
  bucket_id = 'avatars' AND
  (
    -- Regular path: {user_id}/{character_id}/...
    (storage.foldername(name))[1] = auth.uid()::text
    OR
    -- Preview path: previews/{user_id}/...
    ((storage.foldername(name))[1] = 'previews' AND (storage.foldername(name))[2] = auth.uid()::text)
  )
);
