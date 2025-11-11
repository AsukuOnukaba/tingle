-- Fix storage bucket to allow PDF files for government ID uploads
UPDATE storage.buckets
SET allowed_mime_types = ARRAY[
  'image/jpeg',
  'image/jpg', 
  'image/png',
  'image/webp',
  'image/gif',
  'application/pdf'
]
WHERE id = 'profile-images';

-- Add delivery status to messages table
ALTER TABLE messages 
ADD COLUMN IF NOT EXISTS delivery_status TEXT DEFAULT 'sent' CHECK (delivery_status IN ('sent', 'delivered', 'read'));

ALTER TABLE messages
ADD COLUMN IF NOT EXISTS delivered_at TIMESTAMP WITH TIME ZONE;

ALTER TABLE messages
ADD COLUMN IF NOT EXISTS read_at TIMESTAMP WITH TIME ZONE;

-- Create typing indicators table for real-time typing status
CREATE TABLE IF NOT EXISTS typing_status (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  conversation_id TEXT NOT NULL,
  user_id UUID NOT NULL REFERENCES profiles(id) ON DELETE CASCADE,
  is_typing BOOLEAN DEFAULT false,
  updated_at TIMESTAMP WITH TIME ZONE DEFAULT NOW()
);

-- Enable RLS on typing_status
ALTER TABLE typing_status ENABLE ROW LEVEL SECURITY;

-- Allow users to update their own typing status
CREATE POLICY "Users can update own typing status"
ON typing_status
FOR ALL
USING (auth.uid() = user_id)
WITH CHECK (auth.uid() = user_id);

-- Allow users to view typing status in their conversations
CREATE POLICY "Users can view typing status in their conversations"
ON typing_status
FOR SELECT
USING (
  conversation_id IN (
    SELECT conversation_id FROM messages 
    WHERE sender_id = auth.uid() OR recipient_id = auth.uid()
  )
);

-- Add index for faster lookups
CREATE INDEX IF NOT EXISTS idx_typing_status_conversation ON typing_status(conversation_id);
CREATE INDEX IF NOT EXISTS idx_messages_delivery_status ON messages(delivery_status);

-- Enable realtime for typing status
ALTER PUBLICATION supabase_realtime ADD TABLE typing_status;