-- Create creator_applications table to track applications
CREATE TABLE public.creator_applications (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id UUID NOT NULL,
  full_legal_name TEXT NOT NULL,
  display_name TEXT NOT NULL,
  age INTEGER NOT NULL,
  date_of_birth DATE NOT NULL,
  gender TEXT NOT NULL,
  country TEXT NOT NULL,
  city TEXT NOT NULL,
  email TEXT NOT NULL,
  bio TEXT NOT NULL,
  content_type TEXT NOT NULL,
  monthly_price NUMERIC(10, 2) NOT NULL,
  profile_photo_url TEXT,
  government_id_url TEXT,
  instagram_url TEXT,
  tiktok_url TEXT,
  twitter_url TEXT,
  status TEXT NOT NULL DEFAULT 'pending' CHECK (status IN ('pending', 'approved', 'rejected')),
  created_at TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT now(),
  updated_at TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT now(),
  UNIQUE(user_id)
);

-- Enable RLS
ALTER TABLE public.creator_applications ENABLE ROW LEVEL SECURITY;

-- Users can insert their own application
CREATE POLICY "Users can create their own application"
ON public.creator_applications
FOR INSERT
TO authenticated
WITH CHECK (auth.uid() = user_id);

-- Users can view their own application
CREATE POLICY "Users can view their own application"
ON public.creator_applications
FOR SELECT
TO authenticated
USING (auth.uid() = user_id OR has_role(auth.uid(), 'admin'));

-- Admins can update applications
CREATE POLICY "Admins can update applications"
ON public.creator_applications
FOR UPDATE
TO authenticated
USING (has_role(auth.uid(), 'admin'))
WITH CHECK (has_role(auth.uid(), 'admin'));

-- Admins can view all applications
CREATE POLICY "Admins can view all applications"
ON public.creator_applications
FOR SELECT
TO authenticated
USING (has_role(auth.uid(), 'admin'));

-- Create trigger to update updated_at
CREATE TRIGGER update_creator_applications_updated_at
BEFORE UPDATE ON public.creator_applications
FOR EACH ROW
EXECUTE FUNCTION public.update_updated_at_column();