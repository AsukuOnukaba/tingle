-- Add wallets table if missing
CREATE TABLE IF NOT EXISTS public.wallets (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id uuid NOT NULL UNIQUE REFERENCES auth.users(id) ON DELETE CASCADE,
  balance numeric NOT NULL DEFAULT 0,
  currency text NOT NULL DEFAULT 'NGN',
  created_at timestamptz NOT NULL DEFAULT now(),
  updated_at timestamptz NOT NULL DEFAULT now()
);

-- Ensure transactions table exists and has reference unique constraint
CREATE TABLE IF NOT EXISTS public.transactions (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id uuid NOT NULL REFERENCES auth.users(id) ON DELETE CASCADE,
  amount numeric NOT NULL,
  currency text NOT NULL DEFAULT 'NGN',
  type text NOT NULL, -- topup, withdrawal, fee, adjustment
  status text NOT NULL DEFAULT 'pending', -- pending, completed, failed
  reference text NOT NULL, -- provider or client reference used as idempotency key
  balance_after numeric,
  metadata jsonb DEFAULT '{}'::jsonb,
  created_at timestamptz NOT NULL DEFAULT now(),
  updated_at timestamptz NOT NULL DEFAULT now()
);

DO $$
BEGIN
  IF NOT EXISTS (
    SELECT 1 FROM pg_constraint c
    JOIN pg_class t ON c.conrelid = t.oid
    WHERE c.conname = 'uniq_transactions_reference' AND t.relname = 'transactions'
  ) THEN
    ALTER TABLE public.transactions
    ADD CONSTRAINT uniq_transactions_reference UNIQUE (reference);
  END IF;
END;
$$;

-- Payouts table
CREATE TABLE IF NOT EXISTS public.payouts (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id uuid NOT NULL REFERENCES auth.users(id) ON DELETE CASCADE,
  amount numeric NOT NULL,
  fee numeric NOT NULL,
  net_amount numeric NOT NULL,
  provider text,
  provider_reference text UNIQUE,
  status text NOT NULL DEFAULT 'pending' CHECK (status IN ('pending','completed','failed')),
  metadata jsonb DEFAULT '{}'::jsonb,
  created_at timestamptz NOT NULL DEFAULT now(),
  updated_at timestamptz NOT NULL DEFAULT now()
);

-- Stored procedure: topup_wallet (idempotent)
CREATE OR REPLACE FUNCTION public.topup_wallet(p_user uuid, p_amount numeric, p_reference text)
RETURNS TABLE(success boolean, new_balance numeric) LANGUAGE plpgsql AS $$
BEGIN
  -- try insert transaction (will fail on duplicate reference)
  INSERT INTO public.transactions(user_id, amount, currency, type, status, reference, created_at)
  VALUES (p_user, p_amount, 'NGN', 'topup', 'pending', p_reference, now());

  -- atomically update wallet
  UPDATE public.wallets
  SET balance = balance + p_amount, updated_at = now()
  WHERE user_id = p_user
  RETURNING balance INTO new_balance;

  -- mark transaction completed
  UPDATE public.transactions
  SET status = 'completed', balance_after = new_balance, updated_at = now()
  WHERE reference = p_reference;

  success := true;
  RETURN NEXT;
EXCEPTION WHEN unique_violation THEN
  -- already processed; return current balance
  SELECT balance INTO new_balance FROM public.wallets WHERE user_id = p_user;
  success := false;
  RETURN NEXT;
END;
$$;

-- Stored procedure: withdraw_wallet (inserts payout + deducts atomically)
CREATE OR REPLACE FUNCTION public.withdraw_wallet(p_user uuid, p_amount numeric, p_fee numeric, p_reference text)
RETURNS TABLE(success boolean, payout_id uuid, new_balance numeric) LANGUAGE plpgsql AS $$
DECLARE
  _net numeric := p_amount - p_fee;
BEGIN
  -- uniqueness of provider reference enforced by payouts.provider_reference
  INSERT INTO public.payouts(user_id, amount, fee, net_amount, provider_reference, status, created_at)
  VALUES (p_user, p_amount, p_fee, _net, p_reference, 'pending', now())
  RETURNING id INTO payout_id;

  -- deduct atomically only if sufficient funds
  UPDATE public.wallets
  SET balance = balance - p_amount, updated_at = now()
  WHERE user_id = p_user AND balance >= p_amount
  RETURNING balance INTO new_balance;

  IF NOT FOUND THEN
    RAISE EXCEPTION 'insufficient_balance';
  END IF;

  -- insert ledger entries
  INSERT INTO public.transactions(user_id, amount, currency, type, status, reference, balance_after, created_at)
  VALUES (p_user, -p_amount, 'NGN', 'withdrawal', 'completed', 'withdraw_' || p_reference, new_balance, now());

  INSERT INTO public.transactions(user_id, amount, currency, type, status, reference, balance_after, created_at)
  VALUES (p_user, -p_fee, 'NGN', 'fee', 'completed', 'fee_' || p_reference, new_balance, now());

  success := true;
  RETURN NEXT;
EXCEPTION WHEN unique_violation THEN
  -- duplicate payout/provider_reference -> return existing payout id and balance
  SELECT id INTO payout_id FROM public.payouts WHERE provider_reference = p_reference;
  SELECT balance INTO new_balance FROM public.wallets WHERE user_id = p_user;
  success := false;
  RETURN NEXT;
END;
$$;