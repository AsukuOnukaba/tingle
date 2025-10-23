-- ============================================
-- FIX 1: Create withdrawal_requests table
-- ============================================
CREATE TABLE public.withdrawal_requests (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id UUID NOT NULL REFERENCES auth.users(id) ON DELETE CASCADE,
  amount NUMERIC(10, 2) NOT NULL,
  net_amount NUMERIC(10, 2) NOT NULL,
  commission NUMERIC(10, 2) NOT NULL,
  recipient_code TEXT NOT NULL,
  reference TEXT UNIQUE NOT NULL,
  transfer_code TEXT,
  status TEXT NOT NULL DEFAULT 'pending' CHECK (status IN ('pending', 'completed', 'failed')),
  error_message TEXT,
  created_at TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT now(),
  updated_at TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT now()
);

-- Enable RLS
ALTER TABLE public.withdrawal_requests ENABLE ROW LEVEL SECURITY;

-- Users can view their own withdrawal requests
CREATE POLICY "Users can view own withdrawal requests"
ON public.withdrawal_requests FOR SELECT
TO authenticated
USING (auth.uid() = user_id);

-- Admins can view all withdrawal requests
CREATE POLICY "Admins can view all withdrawal requests"
ON public.withdrawal_requests FOR SELECT
TO authenticated
USING (has_role(auth.uid(), 'admin'::app_role));

-- Only service role can insert/update (edge functions)
CREATE POLICY "Service role can insert withdrawal requests"
ON public.withdrawal_requests FOR INSERT
TO service_role
WITH CHECK (true);

CREATE POLICY "Service role can update withdrawal requests"
ON public.withdrawal_requests FOR UPDATE
TO service_role
USING (true);

-- ============================================
-- FIX 2: Add authorization checks to wallet functions
-- ============================================

-- Update credit_wallet with authorization checks
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
  -- CRITICAL SECURITY: Verify caller authorization
  IF auth.uid() IS NULL THEN
    RAISE EXCEPTION 'Authentication required';
  END IF;
  
  -- Only allow service role or admin to credit arbitrary users
  -- Regular users cannot call this function for other users
  IF current_user != 'service_role' AND 
     NOT has_role(auth.uid(), 'admin'::app_role) AND 
     p_user_id != auth.uid() THEN
    RAISE EXCEPTION 'Unauthorized: Cannot credit other users wallets';
  END IF;

  -- Validate amount
  IF p_amount IS NULL OR p_amount <= 0 OR p_amount > 10000000 THEN
    RAISE EXCEPTION 'Invalid amount: must be between 0 and 10,000,000';
  END IF;

  -- Validate reference
  IF p_reference IS NULL OR length(p_reference) > 255 THEN
    RAISE EXCEPTION 'Invalid reference';
  END IF;

  -- Lock the wallet row for update to prevent race conditions
  UPDATE wallets
  SET balance = balance + p_amount,
      updated_at = now()
  WHERE user_id = p_user_id
  RETURNING balance INTO v_new_balance;

  -- If no wallet exists, raise error
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
    p_reference,
    'completed',
    jsonb_build_object('description', COALESCE(p_description, 'Wallet credit'))
  )
  RETURNING id INTO v_transaction_id;

  -- Return success with new balance
  RETURN json_build_object(
    'success', true,
    'transaction_id', v_transaction_id,
    'new_balance', v_new_balance
  );
END;
$$;

-- Update debit_wallet with authorization checks
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
  -- CRITICAL SECURITY: Verify caller authorization
  IF auth.uid() IS NULL THEN
    RAISE EXCEPTION 'Authentication required';
  END IF;
  
  -- Only allow service role or admin to debit arbitrary users
  -- Regular users cannot call this function for other users
  IF current_user != 'service_role' AND 
     NOT has_role(auth.uid(), 'admin'::app_role) AND 
     p_user_id != auth.uid() THEN
    RAISE EXCEPTION 'Unauthorized: Cannot debit other users wallets';
  END IF;

  -- Validate amount
  IF p_amount IS NULL OR p_amount <= 0 OR p_amount > 10000000 THEN
    RAISE EXCEPTION 'Invalid amount: must be between 0 and 10,000,000';
  END IF;

  -- Validate reference
  IF p_reference IS NULL OR length(p_reference) > 255 THEN
    RAISE EXCEPTION 'Invalid reference';
  END IF;

  -- Lock the wallet and check balance
  SELECT balance INTO v_current_balance
  FROM wallets
  WHERE user_id = p_user_id
  FOR UPDATE;

  -- If no wallet exists, raise error
  IF NOT FOUND THEN
    RAISE EXCEPTION 'Wallet not found for user';
  END IF;

  -- Check sufficient balance
  IF v_current_balance < p_amount THEN
    RAISE EXCEPTION 'Insufficient balance';
  END IF;

  -- Debit the wallet
  UPDATE wallets
  SET balance = balance - p_amount,
      updated_at = now()
  WHERE user_id = p_user_id
  RETURNING balance INTO v_new_balance;

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
    'debit',
    p_amount,
    v_new_balance,
    p_reference,
    'completed',
    jsonb_build_object('description', COALESCE(p_description, 'Wallet debit'))
  )
  RETURNING id INTO v_transaction_id;

  -- Return success with new balance
  RETURN json_build_object(
    'success', true,
    'transaction_id', v_transaction_id,
    'new_balance', v_new_balance
  );
END;
$$;

-- ============================================
-- FIX 3: Allow recipients to mark messages as read
-- ============================================

-- Add policy for recipients to update only is_read field
CREATE POLICY "Recipients can mark messages as read"
ON public.messages
FOR UPDATE
TO authenticated
USING (auth.uid() = recipient_id)
WITH CHECK (
  auth.uid() = recipient_id AND
  -- Ensure only is_read field can be changed
  (SELECT sender_id FROM messages WHERE id = messages.id) = sender_id AND
  (SELECT recipient_id FROM messages WHERE id = messages.id) = recipient_id AND
  (SELECT text FROM messages WHERE id = messages.id) = text AND
  (SELECT type FROM messages WHERE id = messages.id) = type
);

-- ============================================
-- FIX 4: Restrict profile visibility to relationships
-- ============================================

-- Drop the overly broad policy
DROP POLICY IF EXISTS "Authenticated users can view all profiles" ON public.profiles;

-- Create relationship-based access control
CREATE POLICY "Users can view profiles they interact with"
ON public.profiles FOR SELECT
TO authenticated
USING (
  auth.uid() = id OR -- Own profile
  EXISTS (
    SELECT 1 FROM subscriptions 
    WHERE subscriber_id = auth.uid() 
    AND creator_id = profiles.id 
    AND is_active = true
  ) OR
  EXISTS (
    SELECT 1 FROM messages
    WHERE (sender_id = auth.uid() AND recipient_id = profiles.id)
       OR (recipient_id = auth.uid() AND sender_id = profiles.id)
  ) OR
  EXISTS (
    SELECT 1 FROM creators
    WHERE user_id = profiles.id 
    AND status = 'approved'
  ) OR
  has_role(auth.uid(), 'admin'::app_role)
);