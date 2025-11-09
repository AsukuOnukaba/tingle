-- Fix creator_applications RLS policy to ensure authenticated users can insert
DROP POLICY IF EXISTS "Users can insert own application" ON public.creator_applications;

CREATE POLICY "Users can insert own application" 
ON public.creator_applications 
FOR INSERT 
TO authenticated
WITH CHECK (auth.uid() = user_id);

-- Ensure storage bucket for profile images exists and has proper policies
INSERT INTO storage.buckets (id, name, public, file_size_limit, allowed_mime_types)
VALUES ('profile-images', 'profile-images', true, 52428800, ARRAY['image/jpeg', 'image/jpg', 'image/png', 'image/gif', 'image/webp'])
ON CONFLICT (id) DO UPDATE SET
  public = true,
  file_size_limit = 52428800,
  allowed_mime_types = ARRAY['image/jpeg', 'image/jpg', 'image/png', 'image/gif', 'image/webp'];

-- Storage policies for profile-images bucket
DROP POLICY IF EXISTS "Anyone can view profile images" ON storage.objects;
DROP POLICY IF EXISTS "Authenticated users can upload profile images" ON storage.objects;

CREATE POLICY "Anyone can view profile images"
ON storage.objects FOR SELECT
TO public
USING (bucket_id = 'profile-images');

CREATE POLICY "Authenticated users can upload profile images"
ON storage.objects FOR INSERT
TO authenticated
WITH CHECK (
  bucket_id = 'profile-images' 
  AND auth.uid() IS NOT NULL
);

-- Add real-time presence tracking
ALTER TABLE profiles ADD COLUMN IF NOT EXISTS last_activity_at TIMESTAMP WITH TIME ZONE DEFAULT NOW();

-- Function to update online status based on activity
CREATE OR REPLACE FUNCTION update_user_online_status()
RETURNS void
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
BEGIN
  -- Mark users as online if they've been active in the last 5 minutes
  UPDATE profiles
  SET is_online = true
  WHERE last_activity_at > NOW() - INTERVAL '5 minutes'
    AND is_online = false;
  
  -- Mark users as offline if they haven't been active in the last 5 minutes
  UPDATE profiles
  SET is_online = false
  WHERE (last_activity_at IS NULL OR last_activity_at <= NOW() - INTERVAL '5 minutes')
    AND is_online = true;
END;
$$;

-- Create a function that users can call to update their activity
CREATE OR REPLACE FUNCTION update_my_activity()
RETURNS void
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
BEGIN
  UPDATE profiles
  SET last_activity_at = NOW(),
      is_online = true
  WHERE id = auth.uid();
END;
$$;