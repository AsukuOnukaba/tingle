-- Fix messages table RLS policies for proper delivery
DROP POLICY IF EXISTS "Authenticated users can send messages" ON public.messages;
DROP POLICY IF EXISTS "Users can view their conversations" ON public.messages;
DROP POLICY IF EXISTS "Users can update message status" ON public.messages;

-- Allow authenticated users to insert messages
CREATE POLICY "Users can send messages"
ON public.messages
FOR INSERT
TO authenticated
WITH CHECK (auth.uid() = sender_id);

-- Allow users to view their own messages
CREATE POLICY "Users can view own messages"
ON public.messages
FOR SELECT
TO authenticated
USING (auth.uid() = sender_id OR auth.uid() = recipient_id);

-- Allow recipients to update message read status
CREATE POLICY "Recipients can update message status"
ON public.messages
FOR UPDATE
TO authenticated
USING (auth.uid() = recipient_id)
WITH CHECK (auth.uid() = recipient_id);

-- Fix subscription_plans RLS for public viewing
DROP POLICY IF EXISTS "Public can view active subscription plans" ON public.subscription_plans;
DROP POLICY IF EXISTS "Creators can manage their subscription plans" ON public.subscription_plans;

CREATE POLICY "Anyone can view active plans"
ON public.subscription_plans
FOR SELECT
TO authenticated
USING (is_active = true);

CREATE POLICY "Creators can manage own plans"
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

-- Add unread_messages_count function for notifications
CREATE OR REPLACE FUNCTION public.get_unread_senders_count(p_user_id uuid)
RETURNS integer
LANGUAGE sql
STABLE
SECURITY DEFINER
SET search_path = public
AS $$
  SELECT COUNT(DISTINCT sender_id)::integer
  FROM messages
  WHERE recipient_id = p_user_id
    AND is_read = false;
$$;

-- Add indexes for better performance
CREATE INDEX IF NOT EXISTS idx_messages_conversation ON messages(conversation_id, created_at DESC);
CREATE INDEX IF NOT EXISTS idx_messages_unread ON messages(recipient_id, is_read) WHERE is_read = false;
CREATE INDEX IF NOT EXISTS idx_messages_delivery ON messages(recipient_id, delivery_status);
CREATE INDEX IF NOT EXISTS idx_subscription_plans_creator ON subscription_plans(creator_id) WHERE is_active = true;