-- Fix the security definer issue with the public_creators view

-- Drop the existing view
DROP VIEW IF EXISTS public.public_creators;

-- Recreate the view with SECURITY INVOKER
CREATE OR REPLACE VIEW public.public_creators 
WITH (security_invoker = true) AS
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

-- Grant SELECT permission on the view to anon and authenticated users
GRANT SELECT ON public.public_creators TO anon, authenticated;

-- Add a comment to document the security measure
COMMENT ON VIEW public.public_creators IS 'Public view of creators excluding sensitive financial data (earnings). Use this view for public-facing creator listings. Uses SECURITY INVOKER to enforce caller permissions.';