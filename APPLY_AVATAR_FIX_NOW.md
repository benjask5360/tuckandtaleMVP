# Fix First Avatar Save Issue - APPLY NOW

## The Problem
The Supabase CLI is having connection issues ("Initialising login role..." hangs), but we need to apply the avatar fix to resolve the first avatar save issue.

## The Solution - Apply Directly in Supabase Dashboard

### Step 1: Open Supabase SQL Editor
1. Go to your [Supabase Dashboard](https://supabase.com/dashboard)
2. Select your project: **tuckandtaleMVP**
3. Click on **SQL Editor** in the left sidebar

### Step 2: Run This SQL
Copy and paste this ENTIRE SQL block and run it:

```sql
-- ============================================================================
-- FIX FIRST AVATAR SAVE ISSUE
-- ============================================================================

-- Drop the problematic UPDATE policy
DROP POLICY IF EXISTS "Users can update avatar cache" ON public.avatar_cache;

-- Create fixed UPDATE policy that avoids race condition
CREATE POLICY "Users can update avatar cache" ON public.avatar_cache
FOR UPDATE
USING (
  -- User can update if they created the avatar OR own the linked character
  created_by_user_id = auth.uid()
  OR
  EXISTS (
    SELECT 1 FROM public.character_profiles
    WHERE character_profiles.id = avatar_cache.character_profile_id
    AND character_profiles.user_id = auth.uid()
  )
)
WITH CHECK (
  -- Only verify avatar ownership - avoid race condition
  created_by_user_id = auth.uid()
);

-- Verify the fix
SELECT
  'Policy fixed successfully!' as status,
  polname,
  pg_get_expr(polwithcheck, polrelid) as with_check_clause
FROM pg_policy
WHERE polrelid = 'public.avatar_cache'::regclass
  AND polname = 'Users can update avatar cache';
```

### Step 3: Verify Success
You should see output showing:
- status: "Policy fixed successfully!"
- The new WITH CHECK clause: `(created_by_user_id = auth.uid())`

### Step 4: Test the Fix
1. Create a NEW user account (or use an existing test account with no profiles)
2. Create the first profile with an avatar
3. The avatar should now save correctly!

## What This Fix Does
- **Removes the race condition** where the character profile isn't fully committed when avatar tries to link
- **Simplifies the WITH CHECK clause** to only verify avatar ownership
- **Allows first avatar to save** without checking if the character exists (which was failing)

## CLI Issues Resolution

The Supabase CLI is having connection issues, likely due to:
- Network/firewall restrictions
- Windows-specific connection issues
- Migration history conflicts

### To fix CLI for future use:
1. Clear all local migrations: `rm -rf supabase/migrations/*`
2. Pull fresh from remote: `npx supabase db pull`
3. If still hanging, try:
   - Restart terminal/computer
   - Check Windows firewall settings
   - Use WSL2 if on Windows
   - Update Supabase CLI: `npm update supabase`

But for now, **just apply the SQL fix above directly in the dashboard** - it will solve your avatar issue immediately!