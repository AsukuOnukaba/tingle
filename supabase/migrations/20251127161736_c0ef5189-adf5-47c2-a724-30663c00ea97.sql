-- Add idempotency and payment gateway tracking to transactions
ALTER TABLE transactions 
  ADD COLUMN IF NOT EXISTS idempotency_key TEXT UNIQUE,
  ADD COLUMN IF NOT EXISTS gateway TEXT;

-- Create index for fast idempotency lookups
CREATE INDEX IF NOT EXISTS idx_transactions_idempotency_key ON transactions(idempotency_key) WHERE idempotency_key IS NOT NULL;

-- Add gateway tracking to payment_intents
ALTER TABLE payment_intents
  ADD COLUMN IF NOT EXISTS gateway TEXT DEFAULT 'paystack';

-- Create table for tracking subscription entitlements
CREATE TABLE IF NOT EXISTS subscription_entitlements (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  subscription_id UUID NOT NULL REFERENCES subscriptions(id) ON DELETE CASCADE,
  user_id UUID NOT NULL,
  creator_id UUID NOT NULL,
  entitlement_type TEXT NOT NULL, -- 'premium_chat', 'premium_content', 'priority_messages'
  expires_at TIMESTAMPTZ NOT NULL,
  is_active BOOLEAN DEFAULT true,
  created_at TIMESTAMPTZ DEFAULT now(),
  updated_at TIMESTAMPTZ DEFAULT now(),
  UNIQUE(subscription_id, entitlement_type)
);

-- Enable RLS on subscription_entitlements
ALTER TABLE subscription_entitlements ENABLE ROW LEVEL SECURITY;

-- RLS policies for subscription_entitlements
CREATE POLICY "Users can view own entitlements"
  ON subscription_entitlements FOR SELECT
  TO authenticated
  USING (user_id = auth.uid());

CREATE POLICY "Service role can manage entitlements"
  ON subscription_entitlements FOR ALL
  TO service_role
  USING (true)
  WITH CHECK (true);

-- Create index for fast entitlement lookups
CREATE INDEX IF NOT EXISTS idx_subscription_entitlements_user_creator ON subscription_entitlements(user_id, creator_id, is_active);
CREATE INDEX IF NOT EXISTS idx_subscription_entitlements_active ON subscription_entitlements(is_active, expires_at) WHERE is_active = true;

-- Function to check premium chat access
CREATE OR REPLACE FUNCTION check_premium_chat_access(p_user_id UUID, p_creator_id UUID)
RETURNS BOOLEAN
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
BEGIN
  RETURN EXISTS (
    SELECT 1
    FROM subscription_entitlements
    WHERE user_id = p_user_id
      AND creator_id = p_creator_id
      AND entitlement_type = 'premium_chat'
      AND is_active = true
      AND expires_at > now()
  );
END;
$$;

-- Add comment for documentation
COMMENT ON COLUMN transactions.idempotency_key IS 'Unique key to prevent duplicate transactions';
COMMENT ON COLUMN transactions.gateway IS 'Payment gateway used: paystack, flutterwave, coinbase';
COMMENT ON TABLE subscription_entitlements IS 'Tracks granular subscription entitlements for access control';