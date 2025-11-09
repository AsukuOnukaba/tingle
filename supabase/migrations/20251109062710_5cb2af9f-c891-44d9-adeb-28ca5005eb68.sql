-- Fix creator_applications RLS policies
-- Drop existing problematic policies
DROP POLICY IF EXISTS "Users can insert own application" ON public.creator_applications;

-- Create proper insert policy that allows users to create their own applications
CREATE POLICY "Users can insert own application" ON public.creator_applications
FOR INSERT
TO authenticated
WITH CHECK (auth.uid() = user_id);

-- Ensure the table has proper RLS enabled
ALTER TABLE public.creator_applications ENABLE ROW LEVEL SECURITY;

-- Make conversation_id optional and add index for better performance
CREATE INDEX IF NOT EXISTS idx_messages_conversation ON public.messages(sender_id, recipient_id);
CREATE INDEX IF NOT EXISTS idx_messages_users ON public.messages(sender_id, recipient_id, created_at);