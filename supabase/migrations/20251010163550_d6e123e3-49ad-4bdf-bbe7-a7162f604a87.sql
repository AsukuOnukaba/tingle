-- Admin RLS policies to allow viewing across the platform
-- Purchases: allow admins to view all purchases
CREATE POLICY "Admins can view all purchases"
ON public.purchases
FOR SELECT
TO authenticated
USING (has_role(auth.uid(), 'admin'::app_role));

-- User wallets: allow admins to view all wallets (for stats)
CREATE POLICY "Admins can view all wallets"
ON public.user_wallets
FOR SELECT
TO authenticated
USING (has_role(auth.uid(), 'admin'::app_role));