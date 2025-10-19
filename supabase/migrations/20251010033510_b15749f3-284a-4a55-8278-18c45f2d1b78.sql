-- Add currency to user_wallets table
ALTER TABLE public.user_wallets 
ADD COLUMN IF NOT EXISTS currency TEXT NOT NULL DEFAULT 'NGN';

-- Create transactions table
CREATE TABLE IF NOT EXISTS public.transactions (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id UUID NOT NULL REFERENCES auth.users(id) ON DELETE CASCADE,
  amount NUMERIC(10, 2) NOT NULL,
  type TEXT NOT NULL CHECK (type IN ('credit', 'debit')),
  reference TEXT UNIQUE NOT NULL,
  status TEXT NOT NULL DEFAULT 'pending' CHECK (status IN ('pending', 'completed', 'failed')),
  description TEXT,
  blockchain_hash TEXT,
  created_at TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT now()
);

-- Enable RLS on transactions
ALTER TABLE public.transactions ENABLE ROW LEVEL SECURITY;

-- RLS Policies for transactions
CREATE POLICY "Users can view their own transactions"
ON public.transactions
FOR SELECT
USING (auth.uid() = user_id);

CREATE POLICY "Users can insert their own transactions"
ON public.transactions
FOR INSERT
WITH CHECK (auth.uid() = user_id);

-- Add wallet_address to creators table for blockchain integration
ALTER TABLE public.creators
ADD COLUMN IF NOT EXISTS wallet_address TEXT;

-- Create index for faster transaction queries
CREATE INDEX IF NOT EXISTS idx_transactions_user_id ON public.transactions(user_id);
CREATE INDEX IF NOT EXISTS idx_transactions_reference ON public.transactions(reference);
CREATE INDEX IF NOT EXISTS idx_transactions_created_at ON public.transactions(created_at DESC);

-- Function to update wallet balance
CREATE OR REPLACE FUNCTION public.credit_wallet(
  p_user_id UUID,
  p_amount NUMERIC,
  p_reference TEXT,
  p_description TEXT DEFAULT NULL
)
RETURNS JSON
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
DECLARE
  v_transaction_id UUID;
  v_new_balance NUMERIC;
BEGIN
  -- Lock the wallet row
  SELECT balance INTO v_new_balance
  FROM public.user_wallets
  WHERE user_id = p_user_id
  FOR UPDATE;
  
  -- Create transaction record
  INSERT INTO public.transactions (user_id, amount, type, reference, status, description)
  VALUES (p_user_id, p_amount, 'credit', p_reference, 'completed', p_description)
  RETURNING id INTO v_transaction_id;
  
  -- Update wallet balance
  UPDATE public.user_wallets
  SET balance = balance + p_amount,
      updated_at = now()
  WHERE user_id = p_user_id
  RETURNING balance INTO v_new_balance;
  
  RETURN json_build_object(
    'success', true,
    'transaction_id', v_transaction_id,
    'new_balance', v_new_balance
  );
END;
$$;

-- Function to debit wallet
CREATE OR REPLACE FUNCTION public.debit_wallet(
  p_user_id UUID,
  p_amount NUMERIC,
  p_reference TEXT,
  p_description TEXT DEFAULT NULL
)
RETURNS JSON
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
DECLARE
  v_transaction_id UUID;
  v_new_balance NUMERIC;
  v_current_balance NUMERIC;
BEGIN
  -- Lock the wallet row
  SELECT balance INTO v_current_balance
  FROM public.user_wallets
  WHERE user_id = p_user_id
  FOR UPDATE;
  
  -- Check sufficient balance
  IF v_current_balance < p_amount THEN
    RAISE EXCEPTION 'Insufficient balance';
  END IF;
  
  -- Create transaction record
  INSERT INTO public.transactions (user_id, amount, type, reference, status, description)
  VALUES (p_user_id, p_amount, 'debit', p_reference, 'completed', p_description)
  RETURNING id INTO v_transaction_id;
  
  -- Update wallet balance
  UPDATE public.user_wallets
  SET balance = balance - p_amount,
      updated_at = now()
  WHERE user_id = p_user_id
  RETURNING balance INTO v_new_balance;
  
  RETURN json_build_object(
    'success', true,
    'transaction_id', v_transaction_id,
    'new_balance', v_new_balance
  );
END;
$$;