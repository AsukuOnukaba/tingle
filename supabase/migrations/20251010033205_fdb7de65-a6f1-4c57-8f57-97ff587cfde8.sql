-- Fix security issue: Prevent creator impersonation in posts table

-- Drop the existing weak INSERT policy
DROP POLICY IF EXISTS "Creators can insert their own posts" ON public.posts;

-- Create a new secure INSERT policy that validates:
-- 1. The user is authenticated
-- 2. The creator_id matches the authenticated user's ID
-- 3. The user is an approved creator
CREATE POLICY "Only approved creators can insert their own posts"
ON public.posts
FOR INSERT
WITH CHECK (
  auth.uid() = creator_id
  AND public.is_creator(auth.uid())
);

-- Also update UPDATE and DELETE policies to include creator validation
DROP POLICY IF EXISTS "Creators can update their own posts" ON public.posts;
DROP POLICY IF EXISTS "Creators can delete their own posts" ON public.posts;

CREATE POLICY "Only approved creators can update their own posts"
ON public.posts
FOR UPDATE
USING (
  auth.uid() = creator_id
  AND public.is_creator(auth.uid())
);

CREATE POLICY "Only approved creators can delete their own posts"
ON public.posts
FOR DELETE
USING (
  auth.uid() = creator_id
  AND public.is_creator(auth.uid())
);