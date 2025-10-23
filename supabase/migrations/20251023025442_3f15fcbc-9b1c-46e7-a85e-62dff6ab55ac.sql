-- Drop the existing overly permissive policy that exposes financial data
DROP POLICY IF EXISTS "Anyone can view approved creators" ON public.creators;

-- Create a more secure policy that requires authentication to view creators
-- This protects financial information (pending_balance, total_earned) from public access
CREATE POLICY "Authenticated users can view approved creators" 
ON public.creators 
FOR SELECT 
TO authenticated
USING (status = 'approved');