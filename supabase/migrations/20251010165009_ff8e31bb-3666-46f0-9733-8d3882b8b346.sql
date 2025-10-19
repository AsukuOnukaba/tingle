-- Change default currency from NGN to USD
ALTER TABLE public.user_wallets 
ALTER COLUMN currency SET DEFAULT 'USD';

-- Update existing wallet records to USD
UPDATE public.user_wallets 
SET currency = 'USD' 
WHERE currency = 'NGN';