-- Add unique constraint on profile_reviews to prevent duplicate reviews from same user
ALTER TABLE public.profile_reviews 
ADD CONSTRAINT profile_reviews_unique_reviewer_profile 
UNIQUE (profile_id, reviewer_id);