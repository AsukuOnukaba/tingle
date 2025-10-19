-- Create enum for user roles
CREATE TYPE public.app_role AS ENUM ('admin', 'creator', 'user');

-- Create user_roles table for role management
CREATE TABLE public.user_roles (
  id UUID NOT NULL DEFAULT gen_random_uuid() PRIMARY KEY,
  user_id UUID NOT NULL REFERENCES auth.users(id) ON DELETE CASCADE,
  role public.app_role NOT NULL,
  created_at TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT now(),
  UNIQUE(user_id, role)
);

-- Create creators table to track creator information
CREATE TABLE public.creators (
  id UUID NOT NULL DEFAULT gen_random_uuid() PRIMARY KEY,
  user_id UUID NOT NULL UNIQUE REFERENCES auth.users(id) ON DELETE CASCADE,
  status TEXT NOT NULL CHECK (status IN ('pending', 'approved', 'rejected')) DEFAULT 'pending',
  bio TEXT,
  earnings DECIMAL(10, 2) NOT NULL DEFAULT 0.00,
  total_uploads INTEGER NOT NULL DEFAULT 0,
  created_at TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT now(),
  updated_at TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT now()
);

-- Create withdrawals table to track withdrawal requests
CREATE TABLE public.withdrawals (
  id UUID NOT NULL DEFAULT gen_random_uuid() PRIMARY KEY,
  creator_id UUID NOT NULL REFERENCES public.creators(id) ON DELETE CASCADE,
  amount DECIMAL(10, 2) NOT NULL CHECK (amount > 0),
  status TEXT NOT NULL CHECK (status IN ('pending', 'approved', 'rejected', 'completed')) DEFAULT 'pending',
  created_at TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT now(),
  updated_at TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT now()
);

-- Enable Row Level Security
ALTER TABLE public.user_roles ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.creators ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.withdrawals ENABLE ROW LEVEL SECURITY;

-- Security definer function to check user role
CREATE OR REPLACE FUNCTION public.has_role(_user_id UUID, _role public.app_role)
RETURNS BOOLEAN
LANGUAGE sql
STABLE
SECURITY DEFINER
SET search_path = public
AS $$
  SELECT EXISTS (
    SELECT 1
    FROM public.user_roles
    WHERE user_id = _user_id
      AND role = _role
  )
$$;

-- Security definer function to check if user is a creator
CREATE OR REPLACE FUNCTION public.is_creator(_user_id UUID)
RETURNS BOOLEAN
LANGUAGE sql
STABLE
SECURITY DEFINER
SET search_path = public
AS $$
  SELECT EXISTS (
    SELECT 1
    FROM public.creators
    WHERE user_id = _user_id
      AND status = 'approved'
  )
$$;

-- RLS Policies for user_roles
CREATE POLICY "Users can view their own roles"
ON public.user_roles
FOR SELECT
USING (auth.uid() = user_id OR public.has_role(auth.uid(), 'admin'));

CREATE POLICY "Admins can manage all roles"
ON public.user_roles
FOR ALL
USING (public.has_role(auth.uid(), 'admin'));

-- RLS Policies for creators
CREATE POLICY "Anyone can view approved creators"
ON public.creators
FOR SELECT
USING (status = 'approved' OR auth.uid() = user_id OR public.has_role(auth.uid(), 'admin'));

CREATE POLICY "Users can create their own creator profile"
ON public.creators
FOR INSERT
WITH CHECK (auth.uid() = user_id);

CREATE POLICY "Creators can update their own profile"
ON public.creators
FOR UPDATE
USING (auth.uid() = user_id OR public.has_role(auth.uid(), 'admin'));

CREATE POLICY "Admins can manage all creator profiles"
ON public.creators
FOR ALL
USING (public.has_role(auth.uid(), 'admin'));

-- RLS Policies for withdrawals
CREATE POLICY "Creators can view their own withdrawals"
ON public.withdrawals
FOR SELECT
USING (
  EXISTS (
    SELECT 1 FROM public.creators
    WHERE creators.id = withdrawals.creator_id
    AND creators.user_id = auth.uid()
  )
  OR public.has_role(auth.uid(), 'admin')
);

CREATE POLICY "Creators can create withdrawal requests"
ON public.withdrawals
FOR INSERT
WITH CHECK (
  EXISTS (
    SELECT 1 FROM public.creators
    WHERE creators.id = withdrawals.creator_id
    AND creators.user_id = auth.uid()
  )
);

CREATE POLICY "Admins can manage all withdrawals"
ON public.withdrawals
FOR ALL
USING (public.has_role(auth.uid(), 'admin'));

-- Trigger for creators updated_at
CREATE TRIGGER update_creators_updated_at
BEFORE UPDATE ON public.creators
FOR EACH ROW
EXECUTE FUNCTION public.update_updated_at_column();

-- Trigger for withdrawals updated_at
CREATE TRIGGER update_withdrawals_updated_at
BEFORE UPDATE ON public.withdrawals
FOR EACH ROW
EXECUTE FUNCTION public.update_updated_at_column();

-- Function to update creator earnings when content is purchased
CREATE OR REPLACE FUNCTION public.update_creator_earnings()
RETURNS TRIGGER
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
DECLARE
  creator_user_id UUID;
  platform_fee DECIMAL(10, 2);
  creator_earning DECIMAL(10, 2);
BEGIN
  -- Get the creator's user_id from premium_content
  SELECT creator_id INTO creator_user_id
  FROM public.premium_content
  WHERE id = NEW.content_id;

  -- Calculate earnings (80% to creator, 20% platform fee)
  creator_earning := NEW.amount * 0.80;
  platform_fee := NEW.amount * 0.20;

  -- Update creator's earnings
  UPDATE public.creators
  SET earnings = earnings + creator_earning
  WHERE user_id = creator_user_id;

  RETURN NEW;
END;
$$;

-- Trigger to update earnings on purchase
CREATE TRIGGER on_purchase_update_earnings
AFTER INSERT ON public.purchases
FOR EACH ROW
WHEN (NEW.status = 'completed')
EXECUTE FUNCTION public.update_creator_earnings();

-- Function to update content count when premium content is added
CREATE OR REPLACE FUNCTION public.update_creator_upload_count()
RETURNS TRIGGER
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
BEGIN
  UPDATE public.creators
  SET total_uploads = total_uploads + 1
  WHERE user_id = NEW.creator_id;

  RETURN NEW;
END;
$$;

-- Trigger to update upload count
CREATE TRIGGER on_content_upload_update_count
AFTER INSERT ON public.premium_content
FOR EACH ROW
EXECUTE FUNCTION public.update_creator_upload_count();