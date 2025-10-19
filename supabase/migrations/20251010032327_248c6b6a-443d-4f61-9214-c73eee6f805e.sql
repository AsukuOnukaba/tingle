-- Fix critical security issues

-- 1. Create posts table (referenced by edge function but missing)
CREATE TABLE IF NOT EXISTS public.posts (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  creator_id UUID NOT NULL,
  title TEXT NOT NULL,
  image_url TEXT NOT NULL,
  is_premium BOOLEAN NOT NULL DEFAULT false,
  price NUMERIC(10, 2),
  created_at TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT now(),
  updated_at TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT now()
);

-- Enable RLS on posts
ALTER TABLE public.posts ENABLE ROW LEVEL SECURITY;

-- RLS policies for posts
CREATE POLICY "Anyone can view posts"
  ON public.posts
  FOR SELECT
  USING (true);

CREATE POLICY "Creators can insert their own posts"
  ON public.posts
  FOR INSERT
  WITH CHECK (auth.uid() = creator_id);

CREATE POLICY "Creators can update their own posts"
  ON public.posts
  FOR UPDATE
  USING (auth.uid() = creator_id);

CREATE POLICY "Creators can delete their own posts"
  ON public.posts
  FOR DELETE
  USING (auth.uid() = creator_id);

-- 2. Create storage bucket for uploads
INSERT INTO storage.buckets (id, name, public, file_size_limit, allowed_mime_types)
VALUES (
  'uploads', 
  'uploads', 
  true,
  10485760, -- 10MB limit
  ARRAY['image/jpeg', 'image/png', 'image/gif', 'image/webp', 'video/mp4', 'video/quicktime']
)
ON CONFLICT (id) DO NOTHING;

-- RLS policies for storage bucket
CREATE POLICY "Anyone can view uploads"
  ON storage.objects
  FOR SELECT
  USING (bucket_id = 'uploads');

CREATE POLICY "Authenticated users can upload to their own folder"
  ON storage.objects
  FOR INSERT
  WITH CHECK (
    bucket_id = 'uploads' 
    AND auth.uid()::text = (storage.foldername(name))[1]
  );

CREATE POLICY "Users can update their own uploads"
  ON storage.objects
  FOR UPDATE
  USING (
    bucket_id = 'uploads' 
    AND auth.uid()::text = (storage.foldername(name))[1]
  );

CREATE POLICY "Users can delete their own uploads"
  ON storage.objects
  FOR DELETE
  USING (
    bucket_id = 'uploads' 
    AND auth.uid()::text = (storage.foldername(name))[1]
  );

-- 3. Add constraint to prevent negative wallet balances
ALTER TABLE public.user_wallets
  ADD CONSTRAINT positive_balance CHECK (balance >= 0);

-- 4. Add unique constraint to prevent duplicate purchases
CREATE UNIQUE INDEX IF NOT EXISTS unique_user_content_purchase 
  ON public.purchases(user_id, content_id) 
  WHERE status = 'completed';

-- 5. Add validation trigger for purchase amount
CREATE OR REPLACE FUNCTION public.validate_purchase_amount()
RETURNS TRIGGER
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
BEGIN
  -- Ensure amount is positive
  IF NEW.amount <= 0 THEN
    RAISE EXCEPTION 'Purchase amount must be positive';
  END IF;
  
  -- Ensure amount doesn't exceed reasonable limit (prevent overflow attacks)
  IF NEW.amount > 999999.99 THEN
    RAISE EXCEPTION 'Purchase amount exceeds maximum allowed';
  END IF;
  
  RETURN NEW;
END;
$$;

CREATE TRIGGER validate_purchase_amount_trigger
  BEFORE INSERT ON public.purchases
  FOR EACH ROW
  EXECUTE FUNCTION public.validate_purchase_amount();

-- 6. Create secure purchase function with transaction handling
CREATE OR REPLACE FUNCTION public.process_purchase(
  p_content_id UUID,
  p_amount NUMERIC
)
RETURNS JSON
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
DECLARE
  v_user_id UUID;
  v_current_balance NUMERIC;
  v_purchase_id UUID;
BEGIN
  -- Get authenticated user
  v_user_id := auth.uid();
  
  IF v_user_id IS NULL THEN
    RAISE EXCEPTION 'Not authenticated';
  END IF;
  
  -- Lock the wallet row for update to prevent race conditions
  SELECT balance INTO v_current_balance
  FROM public.user_wallets
  WHERE user_id = v_user_id
  FOR UPDATE;
  
  -- Check sufficient balance
  IF v_current_balance < p_amount THEN
    RAISE EXCEPTION 'Insufficient balance';
  END IF;
  
  -- Check for duplicate purchase
  IF EXISTS (
    SELECT 1 FROM public.purchases 
    WHERE user_id = v_user_id 
    AND content_id = p_content_id 
    AND status = 'completed'
  ) THEN
    RAISE EXCEPTION 'Content already purchased';
  END IF;
  
  -- Create purchase record
  INSERT INTO public.purchases (user_id, content_id, amount, status)
  VALUES (v_user_id, p_content_id, p_amount, 'completed')
  RETURNING id INTO v_purchase_id;
  
  -- Update wallet balance
  UPDATE public.user_wallets
  SET balance = balance - p_amount,
      updated_at = now()
  WHERE user_id = v_user_id;
  
  -- Return success with purchase details
  RETURN json_build_object(
    'success', true,
    'purchase_id', v_purchase_id,
    'new_balance', v_current_balance - p_amount
  );
  
EXCEPTION
  WHEN OTHERS THEN
    -- Re-raise the exception to rollback transaction
    RAISE;
END;
$$;