-- Add RLS policy to allow authenticated users to view all profiles on explore page
CREATE POLICY "Authenticated users can view all profiles"
ON public.profiles
FOR SELECT
TO authenticated
USING (true);