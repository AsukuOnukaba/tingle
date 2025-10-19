-- Fix security issue: Protect creator earnings from public access

-- 1. Drop the existing public policy that exposes earnings
DROP POLICY IF EXISTS "Anyone can view approved creators" ON public.creators;

-- 2. Create restricted SELECT policies for the creators table

-- Allow creators to view their own full data (including earnings)
CREATE POLICY "Creators can view their own data"
ON public.creators
FOR SELECT
USING (auth.uid() = user_id);

-- Allow admins to view all creator data
CREATE POLICY "Admins can view all creators"
ON public.creators
FOR SELECT
USING (has_role(auth.uid(), 'admin'::app_role));

-- 3. Create a public view that excludes sensitive financial data
CREATE OR REPLACE VIEW public.public_creators AS
SELECT 
  id,
  user_id,
  status,
  bio,
  total_uploads,
  created_at,
  updated_at
  -- Explicitly exclude: earnings (sensitive financial data)
FROM public.creators
WHERE status = 'approved';

-- 4. Grant SELECT permission on the view to anon and authenticated users
GRANT SELECT ON public.public_creators TO anon, authenticated;

-- 5. Add a comment to document the security measure
COMMENT ON VIEW public.public_creators IS 'Public view of creators excluding sensitive financial data (earnings). Use this view for public-facing creator listings.';