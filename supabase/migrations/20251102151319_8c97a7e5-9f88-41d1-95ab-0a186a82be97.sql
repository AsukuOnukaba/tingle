-- Add rating field to profiles
ALTER TABLE profiles ADD COLUMN IF NOT EXISTS rating NUMERIC DEFAULT 0 CHECK (rating >= 0 AND rating <= 5);

-- Create profile_reviews table for comments and ratings
CREATE TABLE IF NOT EXISTS public.profile_reviews (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  profile_id UUID NOT NULL REFERENCES profiles(id) ON DELETE CASCADE,
  reviewer_id UUID NOT NULL REFERENCES profiles(id) ON DELETE CASCADE,
  rating INTEGER NOT NULL CHECK (rating >= 1 AND rating <= 5),
  comment TEXT,
  created_at TIMESTAMP WITH TIME ZONE DEFAULT now(),
  updated_at TIMESTAMP WITH TIME ZONE DEFAULT now(),
  UNIQUE(profile_id, reviewer_id)
);

-- Enable RLS on profile_reviews
ALTER TABLE public.profile_reviews ENABLE ROW LEVEL SECURITY;

-- RLS policies for profile_reviews
CREATE POLICY "Anyone can view reviews"
ON public.profile_reviews
FOR SELECT
USING (true);

CREATE POLICY "Users can create reviews"
ON public.profile_reviews
FOR INSERT
WITH CHECK (auth.uid() = reviewer_id);

CREATE POLICY "Users can update own reviews"
ON public.profile_reviews
FOR UPDATE
USING (auth.uid() = reviewer_id);

CREATE POLICY "Users can delete own reviews"
ON public.profile_reviews
FOR DELETE
USING (auth.uid() = reviewer_id);

-- Create content_flags table for moderation
CREATE TABLE IF NOT EXISTS public.content_flags (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  content_type TEXT NOT NULL CHECK (content_type IN ('profile_image', 'cover_image', 'user_photo', 'message', 'profile_review')),
  content_id UUID NOT NULL,
  flagged_by UUID NOT NULL REFERENCES profiles(id) ON DELETE CASCADE,
  reason TEXT NOT NULL CHECK (reason IN ('nudity', 'harassment', 'spam', 'inappropriate', 'other')),
  description TEXT,
  status TEXT NOT NULL DEFAULT 'pending' CHECK (status IN ('pending', 'reviewed', 'resolved', 'dismissed')),
  created_at TIMESTAMP WITH TIME ZONE DEFAULT now(),
  reviewed_at TIMESTAMP WITH TIME ZONE,
  reviewed_by UUID REFERENCES profiles(id)
);

-- Enable RLS on content_flags
ALTER TABLE public.content_flags ENABLE ROW LEVEL SECURITY;

-- RLS policies for content_flags
CREATE POLICY "Users can flag content"
ON public.content_flags
FOR INSERT
WITH CHECK (auth.uid() = flagged_by);

CREATE POLICY "Users can view own flags"
ON public.content_flags
FOR SELECT
USING (auth.uid() = flagged_by);

CREATE POLICY "Admins can manage all flags"
ON public.content_flags
FOR ALL
USING (has_role(auth.uid(), 'admin'::app_role));

-- Function to update profile rating based on reviews
CREATE OR REPLACE FUNCTION update_profile_rating()
RETURNS TRIGGER AS $$
BEGIN
  UPDATE profiles
  SET rating = (
    SELECT COALESCE(AVG(rating), 0)
    FROM profile_reviews
    WHERE profile_id = COALESCE(NEW.profile_id, OLD.profile_id)
  )
  WHERE id = COALESCE(NEW.profile_id, OLD.profile_id);
  RETURN NEW;
END;
$$ LANGUAGE plpgsql SECURITY DEFINER;

-- Trigger to auto-update profile rating
DROP TRIGGER IF EXISTS update_rating_on_review ON profile_reviews;
CREATE TRIGGER update_rating_on_review
AFTER INSERT OR UPDATE OR DELETE ON profile_reviews
FOR EACH ROW
EXECUTE FUNCTION update_profile_rating();

-- Update all profiles to be visible on explore by default
UPDATE profiles SET is_online = true WHERE is_online IS NULL;

-- Add index for better performance
CREATE INDEX IF NOT EXISTS idx_profile_reviews_profile_id ON profile_reviews(profile_id);
CREATE INDEX IF NOT EXISTS idx_profile_reviews_reviewer_id ON profile_reviews(reviewer_id);
CREATE INDEX IF NOT EXISTS idx_content_flags_content ON content_flags(content_type, content_id);
CREATE INDEX IF NOT EXISTS idx_profiles_rating ON profiles(rating DESC);