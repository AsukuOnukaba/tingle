-- Add wallet_address column to creators table
ALTER TABLE public.creators ADD COLUMN IF NOT EXISTS wallet_address text;

-- Update messages RLS policies to allow proper message delivery
DROP POLICY IF EXISTS "Users can insert their own messages" ON public.messages;
DROP POLICY IF EXISTS "Users can view their own messages" ON public.messages;
DROP POLICY IF EXISTS "Recipients can mark messages as read" ON public.messages;
DROP POLICY IF EXISTS "Users can update their own messages" ON public.messages;

-- Allow authenticated users to send messages
CREATE POLICY "Authenticated users can send messages"
ON public.messages
FOR INSERT
TO authenticated
WITH CHECK (auth.uid() = sender_id);

-- Allow users to view messages they sent or received
CREATE POLICY "Users can view their conversations"
ON public.messages
FOR SELECT
TO authenticated
USING (auth.uid() = sender_id OR auth.uid() = recipient_id);

-- Allow users to update their own messages and recipients to mark as read
CREATE POLICY "Users can update message status"
ON public.messages
FOR UPDATE
TO authenticated
USING (auth.uid() = sender_id OR auth.uid() = recipient_id)
WITH CHECK (auth.uid() = sender_id OR auth.uid() = recipient_id);

-- Ensure subscription_plans are publicly viewable
DROP POLICY IF EXISTS "Anyone can view active plans" ON public.subscription_plans;

CREATE POLICY "Public can view active subscription plans"
ON public.subscription_plans
FOR SELECT
TO authenticated, anon
USING (is_active = true);

-- Allow creators to manage their own plans
DROP POLICY IF EXISTS "Creators can manage own plans" ON public.subscription_plans;

CREATE POLICY "Creators can manage their subscription plans"
ON public.subscription_plans
FOR ALL
TO authenticated
USING (
  EXISTS (
    SELECT 1 FROM creators
    WHERE creators.id = subscription_plans.creator_id
    AND creators.user_id = auth.uid()
  )
)
WITH CHECK (
  EXISTS (
    SELECT 1 FROM creators
    WHERE creators.id = subscription_plans.creator_id
    AND creators.user_id = auth.uid()
  )
);