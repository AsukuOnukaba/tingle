-- Add cover_image column to profiles table
ALTER TABLE public.profiles 
ADD COLUMN IF NOT EXISTS cover_image TEXT;

-- Create user_photos table for gallery
CREATE TABLE IF NOT EXISTS public.user_photos (
  id UUID NOT NULL DEFAULT gen_random_uuid() PRIMARY KEY,
  user_id UUID NOT NULL REFERENCES auth.users(id) ON DELETE CASCADE,
  file_url TEXT NOT NULL,
  thumbnail_url TEXT,
  caption TEXT,
  is_premium BOOLEAN DEFAULT false,
  price NUMERIC DEFAULT 0,
  created_at TIMESTAMP WITH TIME ZONE DEFAULT now(),
  updated_at TIMESTAMP WITH TIME ZONE DEFAULT now()
);

-- Enable RLS
ALTER TABLE public.user_photos ENABLE ROW LEVEL SECURITY;

-- RLS Policies for user_photos
CREATE POLICY "Users can view their own photos"
  ON public.user_photos
  FOR SELECT
  USING (auth.uid() = user_id);

CREATE POLICY "Users can view free photos from others"
  ON public.user_photos
  FOR SELECT
  USING (is_premium = false);

CREATE POLICY "Subscribers can view premium photos"
  ON public.user_photos
  FOR SELECT
  USING (
    is_premium = true 
    AND EXISTS (
      SELECT 1 FROM subscriptions 
      WHERE subscriber_id = auth.uid() 
      AND creator_id = user_photos.user_id 
      AND is_active = true
    )
  );

CREATE POLICY "Users can insert their own photos"
  ON public.user_photos
  FOR INSERT
  WITH CHECK (auth.uid() = user_id);

CREATE POLICY "Users can update their own photos"
  ON public.user_photos
  FOR UPDATE
  USING (auth.uid() = user_id);

CREATE POLICY "Users can delete their own photos"
  ON public.user_photos
  FOR DELETE
  USING (auth.uid() = user_id);

-- Create storage bucket for profile images if not exists
INSERT INTO storage.buckets (id, name, public)
VALUES ('profile-images', 'profile-images', true)
ON CONFLICT (id) DO NOTHING;

-- Storage policies for profile images
CREATE POLICY "Anyone can view profile images"
  ON storage.objects
  FOR SELECT
  USING (bucket_id = 'profile-images');

CREATE POLICY "Users can upload their own profile images"
  ON storage.objects
  FOR INSERT
  WITH CHECK (
    bucket_id = 'profile-images' 
    AND auth.uid()::text = (storage.foldername(name))[1]
  );

CREATE POLICY "Users can update their own profile images"
  ON storage.objects
  FOR UPDATE
  USING (
    bucket_id = 'profile-images' 
    AND auth.uid()::text = (storage.foldername(name))[1]
  );

CREATE POLICY "Users can delete their own profile images"
  ON storage.objects
  FOR DELETE
  USING (
    bucket_id = 'profile-images' 
    AND auth.uid()::text = (storage.foldername(name))[1]
  );

-- Create storage bucket for user photos if not exists
INSERT INTO storage.buckets (id, name, public)
VALUES ('user-photos', 'user-photos', true)
ON CONFLICT (id) DO NOTHING;

-- Storage policies for user photos
CREATE POLICY "Anyone can view user photos"
  ON storage.objects
  FOR SELECT
  USING (bucket_id = 'user-photos');

CREATE POLICY "Users can upload their own user photos"
  ON storage.objects
  FOR INSERT
  WITH CHECK (
    bucket_id = 'user-photos' 
    AND auth.uid()::text = (storage.foldername(name))[1]
  );

CREATE POLICY "Users can update their own user photos"
  ON storage.objects
  FOR UPDATE
  USING (
    bucket_id = 'user-photos' 
    AND auth.uid()::text = (storage.foldername(name))[1]
  );

CREATE POLICY "Users can delete their own user photos"
  ON storage.objects
  FOR DELETE
  USING (
    bucket_id = 'user-photos' 
    AND auth.uid()::text = (storage.foldername(name))[1]
  );