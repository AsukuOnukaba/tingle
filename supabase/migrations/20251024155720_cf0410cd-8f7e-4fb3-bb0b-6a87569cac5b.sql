-- Add wallet_address to profiles table for Base Account authentication
ALTER TABLE public.profiles ADD COLUMN IF NOT EXISTS wallet_address TEXT UNIQUE;

-- Create index for faster wallet address lookups
CREATE INDEX IF NOT EXISTS idx_profiles_wallet_address ON public.profiles(wallet_address);

-- Add basename field to store readable wallet names
ALTER TABLE public.profiles ADD COLUMN IF NOT EXISTS basename TEXT;

-- Create function to handle wallet-based authentication
CREATE OR REPLACE FUNCTION public.handle_wallet_auth(
  p_wallet_address TEXT,
  p_basename TEXT DEFAULT NULL,
  p_display_name TEXT DEFAULT NULL
)
RETURNS json
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
DECLARE
  v_user_id UUID;
  v_profile_exists BOOLEAN;
BEGIN
  -- Check if profile with this wallet already exists
  SELECT id INTO v_user_id
  FROM public.profiles
  WHERE wallet_address = p_wallet_address;

  IF v_user_id IS NULL THEN
    -- Create new anonymous user in auth.users via Supabase
    -- This will be handled by the client-side code
    RAISE EXCEPTION 'Profile not found. Create profile first.';
  ELSE
    -- Update basename if provided
    IF p_basename IS NOT NULL THEN
      UPDATE public.profiles
      SET basename = p_basename,
          updated_at = now()
      WHERE id = v_user_id;
    END IF;
  END IF;

  RETURN json_build_object(
    'success', true,
    'user_id', v_user_id
  );
END;
$$;

-- Update RLS policies to allow wallet-based access
CREATE POLICY "Allow wallet authentication" ON public.profiles
FOR SELECT
USING (wallet_address IS NOT NULL);

-- Add comment for documentation
COMMENT ON COLUMN public.profiles.wallet_address IS 'Base blockchain wallet address for Web3 authentication';
COMMENT ON COLUMN public.profiles.basename IS 'Human-readable Basename (e.g., user.base.eth) resolved from wallet address';