-- Drop the existing overly permissive policy
DROP POLICY IF EXISTS "Profiles are viewable by everyone" ON public.profiles;

-- Create a more secure policy that requires authentication
CREATE POLICY "Authenticated users can view all profiles" 
ON public.profiles 
FOR SELECT 
TO authenticated
USING (true);

-- Keep the policy for users to view their own profile even when not fully authenticated
CREATE POLICY "Users can view their own profile" 
ON public.profiles 
FOR SELECT 
TO authenticated
USING (auth.uid() = id);