-- Add unique constraint to typing_status table for proper upsert behavior
ALTER TABLE typing_status 
ADD CONSTRAINT typing_status_conversation_user_unique 
UNIQUE (conversation_id, user_id);

-- Fix messages RLS policy to allow authenticated users to insert messages
DROP POLICY IF EXISTS "Users can insert their own messages" ON messages;

CREATE POLICY "Users can insert their own messages"
ON messages
FOR INSERT
TO authenticated
WITH CHECK (auth.uid() = sender_id);