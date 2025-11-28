-- Create blockchain transactions table for multi-chain tracking
CREATE TABLE IF NOT EXISTS public.blockchain_transactions (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id UUID NOT NULL REFERENCES auth.users(id) ON DELETE CASCADE,
  chain TEXT NOT NULL, -- ethereum, base, polygon, bnb, solana
  tx_hash TEXT NOT NULL,
  token TEXT NOT NULL, -- ETH, MATIC, BNB, SOL, USDT, etc.
  direction TEXT NOT NULL CHECK (direction IN ('deposit', 'withdrawal', 'internal')),
  amount NUMERIC NOT NULL,
  status TEXT NOT NULL DEFAULT 'pending' CHECK (status IN ('pending', 'confirmed', 'failed')),
  block_number BIGINT,
  from_address TEXT NOT NULL,
  to_address TEXT NOT NULL,
  gas_used NUMERIC,
  gas_price NUMERIC,
  metadata JSONB DEFAULT '{}',
  created_at TIMESTAMPTZ DEFAULT now(),
  updated_at TIMESTAMPTZ DEFAULT now()
);

-- Create indexes for faster queries
CREATE INDEX idx_blockchain_tx_user_id ON public.blockchain_transactions(user_id);
CREATE INDEX idx_blockchain_tx_chain ON public.blockchain_transactions(chain);
CREATE INDEX idx_blockchain_tx_hash ON public.blockchain_transactions(tx_hash);
CREATE INDEX idx_blockchain_tx_status ON public.blockchain_transactions(status);
CREATE INDEX idx_blockchain_tx_created_at ON public.blockchain_transactions(created_at DESC);

-- Create unique constraint on chain + tx_hash to prevent duplicates
CREATE UNIQUE INDEX idx_blockchain_tx_unique ON public.blockchain_transactions(chain, tx_hash);

-- Add trigger for updated_at
CREATE TRIGGER update_blockchain_transactions_updated_at
  BEFORE UPDATE ON public.blockchain_transactions
  FOR EACH ROW
  EXECUTE FUNCTION public.handle_updated_at();

-- Enable RLS
ALTER TABLE public.blockchain_transactions ENABLE ROW LEVEL SECURITY;

-- Policies
CREATE POLICY "Users can view own blockchain transactions"
  ON public.blockchain_transactions
  FOR SELECT
  USING (auth.uid() = user_id);

CREATE POLICY "Service role can insert blockchain transactions"
  ON public.blockchain_transactions
  FOR INSERT
  WITH CHECK (true);

CREATE POLICY "Service role can update blockchain transactions"
  ON public.blockchain_transactions
  FOR UPDATE
  USING (true);

-- Add wallet addresses for multiple chains to profiles
ALTER TABLE public.profiles
  ADD COLUMN IF NOT EXISTS evm_address TEXT,
  ADD COLUMN IF NOT EXISTS solana_address TEXT,
  ADD COLUMN IF NOT EXISTS connected_wallets JSONB DEFAULT '[]';

-- Create function to credit wallet from blockchain deposit
CREATE OR REPLACE FUNCTION public.credit_wallet_from_chain(
  p_user_id UUID,
  p_amount NUMERIC,
  p_tx_hash TEXT,
  p_chain TEXT
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
  -- Validate amount
  IF p_amount IS NULL OR p_amount <= 0 THEN
    RAISE EXCEPTION 'Invalid amount';
  END IF;

  -- Lock the wallet row for update
  UPDATE wallets
  SET balance = balance + p_amount,
      updated_at = now()
  WHERE user_id = p_user_id
  RETURNING balance INTO v_new_balance;

  IF NOT FOUND THEN
    RAISE EXCEPTION 'Wallet not found for user';
  END IF;

  -- Create transaction record
  INSERT INTO transactions (
    user_id,
    type,
    amount,
    balance_after,
    reference,
    status,
    metadata
  ) VALUES (
    p_user_id,
    'credit',
    p_amount,
    v_new_balance,
    p_tx_hash,
    'completed',
    jsonb_build_object('chain', p_chain, 'source', 'blockchain_deposit')
  )
  RETURNING id INTO v_transaction_id;

  RETURN json_build_object(
    'success', true,
    'transaction_id', v_transaction_id,
    'new_balance', v_new_balance
  );
END;
$$;