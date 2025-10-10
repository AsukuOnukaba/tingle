-- Create profiles table
CREATE TABLE public.profiles (
  id uuid PRIMARY KEY REFERENCES auth.users(id) ON DELETE CASCADE,
  display_name text NOT NULL,
  age integer NOT NULL,
  location text,
  bio text,
  profile_image text,
  rating numeric DEFAULT 4.8,
  price numeric DEFAULT 19.99,
  is_online boolean DEFAULT false,
  created_at timestamptz DEFAULT now(),
  updated_at timestamptz DEFAULT now()
);

-- Create wallets table
CREATE TABLE public.wallets (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id uuid REFERENCES auth.users(id) ON DELETE CASCADE UNIQUE NOT NULL,
  balance numeric DEFAULT 0 CHECK (balance >= 0),
  created_at timestamptz DEFAULT now(),
  updated_at timestamptz DEFAULT now()
);

-- Create subscriptions table
CREATE TABLE public.subscriptions (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  subscriber_id uuid REFERENCES auth.users(id) ON DELETE CASCADE NOT NULL,
  creator_id uuid REFERENCES public.profiles(id) ON DELETE CASCADE NOT NULL,
  is_active boolean DEFAULT true,
  created_at timestamptz DEFAULT now(),
  expires_at timestamptz,
  UNIQUE(subscriber_id, creator_id)
);

-- Create likes table
CREATE TABLE public.likes (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id uuid REFERENCES auth.users(id) ON DELETE CASCADE NOT NULL,
  profile_id uuid REFERENCES public.profiles(id) ON DELETE CASCADE NOT NULL,
  created_at timestamptz DEFAULT now(),
  UNIQUE(user_id, profile_id)
);

-- Enable RLS
ALTER TABLE public.profiles ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.wallets ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.subscriptions ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.likes ENABLE ROW LEVEL SECURITY;

-- Profiles policies (public read, own profile write)
CREATE POLICY "Profiles are viewable by everyone"
  ON public.profiles FOR SELECT
  USING (true);

CREATE POLICY "Users can update own profile"
  ON public.profiles FOR UPDATE
  USING (auth.uid() = id);

CREATE POLICY "Users can insert own profile"
  ON public.profiles FOR INSERT
  WITH CHECK (auth.uid() = id);

-- Wallets policies (users can only see and update their own wallet)
CREATE POLICY "Users can view own wallet"
  ON public.wallets FOR SELECT
  USING (auth.uid() = user_id);

CREATE POLICY "Users can update own wallet"
  ON public.wallets FOR UPDATE
  USING (auth.uid() = user_id);

CREATE POLICY "Users can insert own wallet"
  ON public.wallets FOR INSERT
  WITH CHECK (auth.uid() = user_id);

-- Subscriptions policies
CREATE POLICY "Users can view their subscriptions"
  ON public.subscriptions FOR SELECT
  USING (auth.uid() = subscriber_id OR auth.uid() = creator_id);

CREATE POLICY "Users can create subscriptions"
  ON public.subscriptions FOR INSERT
  WITH CHECK (auth.uid() = subscriber_id);

CREATE POLICY "Users can update their subscriptions"
  ON public.subscriptions FOR UPDATE
  USING (auth.uid() = subscriber_id);

CREATE POLICY "Users can delete their subscriptions"
  ON public.subscriptions FOR DELETE
  USING (auth.uid() = subscriber_id);

-- Likes policies
CREATE POLICY "Users can view all likes"
  ON public.likes FOR SELECT
  USING (true);

CREATE POLICY "Users can create likes"
  ON public.likes FOR INSERT
  WITH CHECK (auth.uid() = user_id);

CREATE POLICY "Users can delete own likes"
  ON public.likes FOR DELETE
  USING (auth.uid() = user_id);

-- Create trigger function for updated_at
CREATE OR REPLACE FUNCTION public.handle_updated_at()
RETURNS TRIGGER AS $$
BEGIN
  NEW.updated_at = now();
  RETURN NEW;
END;
$$ LANGUAGE plpgsql;

-- Add triggers
CREATE TRIGGER set_updated_at
  BEFORE UPDATE ON public.profiles
  FOR EACH ROW
  EXECUTE FUNCTION public.handle_updated_at();

CREATE TRIGGER set_updated_at
  BEFORE UPDATE ON public.wallets
  FOR EACH ROW
  EXECUTE FUNCTION public.handle_updated_at();

-- Create function to auto-create wallet and profile on user signup
CREATE OR REPLACE FUNCTION public.handle_new_user()
RETURNS TRIGGER AS $$
BEGIN
  INSERT INTO public.wallets (user_id, balance)
  VALUES (NEW.id, 100); -- Start with 100 credits
  
  RETURN NEW;
END;
$$ LANGUAGE plpgsql SECURITY DEFINER;

-- Trigger for new user
CREATE TRIGGER on_auth_user_created
  AFTER INSERT ON auth.users
  FOR EACH ROW
  EXECUTE FUNCTION public.handle_new_user();