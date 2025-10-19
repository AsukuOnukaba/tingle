-- Fix redundant RLS policy on creators table

-- 1. Drop the redundant "Admins can view all creators" SELECT policy
-- This is redundant because "Admins can manage all creator profiles" already covers ALL operations (including SELECT)
DROP POLICY IF EXISTS "Admins can view all creators" ON public.creators;

-- Note: The "Admins can manage all creator profiles" policy already exists and covers:
-- - SELECT (view)
-- - INSERT (create) 
-- - UPDATE (modify)
-- - DELETE (remove)
-- So we don't need a separate SELECT-only policy for admins

-- Current secure policies:
-- 1. "Creators can view their own data" - Allows creators to see only their own earnings
-- 2. "Admins can manage all creator profiles" - Allows admins full access (includes viewing)