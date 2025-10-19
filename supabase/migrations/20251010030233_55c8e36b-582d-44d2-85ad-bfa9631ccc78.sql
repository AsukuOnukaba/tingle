-- Create user_wallets table to manage user balances
CREATE TABLE public.user_wallets (
  id UUID NOT NULL DEFAULT gen_random_uuid() PRIMARY KEY,
  user_id UUID NOT NULL UNIQUE REFERENCES auth.users(id) ON DELETE CASCADE,
  balance DECIMAL(10, 2) NOT NULL DEFAULT 0.00 CHECK (balance >= 0),
  created_at TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT now(),
  updated_at TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT now()
);

-- Create premium_content table to store content information and pricing
CREATE TABLE public.premium_content (
  id UUID NOT NULL DEFAULT gen_random_uuid() PRIMARY KEY,
  creator_id UUID NOT NULL REFERENCES auth.users(id) ON DELETE CASCADE,
  title TEXT NOT NULL,
  description TEXT,
  type TEXT NOT NULL CHECK (type IN ('image', 'video')),
  url TEXT NOT NULL,
  thumbnail_url TEXT,
  price DECIMAL(10, 2) NOT NULL CHECK (price >= 0),
  is_active BOOLEAN NOT NULL DEFAULT true,
  created_at TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT now(),
  updated_at TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT now()
);

-- Create purchases table to track all purchases
CREATE TABLE public.purchases (
  id UUID NOT NULL DEFAULT gen_random_uuid() PRIMARY KEY,
  user_id UUID NOT NULL REFERENCES auth.users(id) ON DELETE CASCADE,
  content_id UUID NOT NULL REFERENCES public.premium_content(id) ON DELETE CASCADE,
  amount DECIMAL(10, 2) NOT NULL,
  status TEXT NOT NULL CHECK (status IN ('completed', 'pending', 'failed')) DEFAULT 'completed',
  created_at TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT now(),
  UNIQUE(user_id, content_id)
);

-- Enable Row Level Security
ALTER TABLE public.user_wallets ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.premium_content ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.purchases ENABLE ROW LEVEL SECURITY;

-- RLS Policies for user_wallets
CREATE POLICY "Users can view their own wallet"
ON public.user_wallets
FOR SELECT
USING (auth.uid() = user_id);

CREATE POLICY "Users can update their own wallet"
ON public.user_wallets
FOR UPDATE
USING (auth.uid() = user_id);

CREATE POLICY "Users can insert their own wallet"
ON public.user_wallets
FOR INSERT
WITH CHECK (auth.uid() = user_id);

-- RLS Policies for premium_content
CREATE POLICY "Anyone can view active premium content"
ON public.premium_content
FOR SELECT
USING (is_active = true);

CREATE POLICY "Creators can insert their own content"
ON public.premium_content
FOR INSERT
WITH CHECK (auth.uid() = creator_id);

CREATE POLICY "Creators can update their own content"
ON public.premium_content
FOR UPDATE
USING (auth.uid() = creator_id);

CREATE POLICY "Creators can delete their own content"
ON public.premium_content
FOR DELETE
USING (auth.uid() = creator_id);

-- RLS Policies for purchases
CREATE POLICY "Users can view their own purchases"
ON public.purchases
FOR SELECT
USING (auth.uid() = user_id);

CREATE POLICY "Users can create their own purchases"
ON public.purchases
FOR INSERT
WITH CHECK (auth.uid() = user_id);

-- Function to update updated_at timestamp
CREATE OR REPLACE FUNCTION public.update_updated_at_column()
RETURNS TRIGGER AS $$
BEGIN
  NEW.updated_at = now();
  RETURN NEW;
END;
$$ LANGUAGE plpgsql SET search_path = public;

-- Triggers for automatic timestamp updates
CREATE TRIGGER update_user_wallets_updated_at
BEFORE UPDATE ON public.user_wallets
FOR EACH ROW
EXECUTE FUNCTION public.update_updated_at_column();

CREATE TRIGGER update_premium_content_updated_at
BEFORE UPDATE ON public.premium_content
FOR EACH ROW
EXECUTE FUNCTION public.update_updated_at_column();

-- Function to handle new user wallet creation
CREATE OR REPLACE FUNCTION public.handle_new_user_wallet()
RETURNS TRIGGER
LANGUAGE plpgsql
SECURITY DEFINER SET search_path = public
AS $$
BEGIN
  INSERT INTO public.user_wallets (user_id, balance)
  VALUES (NEW.id, 100.00);
  RETURN NEW;
END;
$$;

-- Trigger to create wallet for new users (with starting balance of 100)
CREATE TRIGGER on_auth_user_created_wallet
AFTER INSERT ON auth.users
FOR EACH ROW
EXECUTE FUNCTION public.handle_new_user_wallet();

-- Function to check if user has purchased content
CREATE OR REPLACE FUNCTION public.has_purchased_content(_user_id UUID, _content_id UUID)
RETURNS BOOLEAN
LANGUAGE sql
STABLE
SECURITY DEFINER
SET search_path = public
AS $$
  SELECT EXISTS (
    SELECT 1
    FROM public.purchases
    WHERE user_id = _user_id
      AND content_id = _content_id
      AND status = 'completed'
  )
$$;