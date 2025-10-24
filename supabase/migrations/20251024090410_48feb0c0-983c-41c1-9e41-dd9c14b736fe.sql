-- Create subscriptions table with subscriber_id if it doesn't exist
CREATE TABLE IF NOT EXISTS public.subscriptions (
  id UUID NOT NULL DEFAULT gen_random_uuid() PRIMARY KEY,
  subscriber_id UUID NOT NULL,
  creator_id UUID NOT NULL,
  is_active BOOLEAN DEFAULT true,
  expires_at TIMESTAMP WITH TIME ZONE,
  created_at TIMESTAMP WITH TIME ZONE DEFAULT now()
);

-- If table exists but column doesn't, add it
DO $$ 
BEGIN
  IF NOT EXISTS (
    SELECT 1 FROM information_schema.columns 
    WHERE table_schema = 'public' 
    AND table_name = 'subscriptions' 
    AND column_name = 'subscriber_id'
  ) THEN
    ALTER TABLE public.subscriptions ADD COLUMN subscriber_id UUID NOT NULL;
  END IF;
END $$;

-- Enable RLS
ALTER TABLE public.subscriptions ENABLE ROW LEVEL SECURITY;

-- Drop existing policies if they exist
DROP POLICY IF EXISTS "Users can create subscriptions" ON public.subscriptions;
DROP POLICY IF EXISTS "Users can view their subscriptions" ON public.subscriptions;
DROP POLICY IF EXISTS "Users can update their subscriptions" ON public.subscriptions;
DROP POLICY IF EXISTS "Users can delete their subscriptions" ON public.subscriptions;

-- Create RLS policies
CREATE POLICY "Users can create subscriptions" 
ON public.subscriptions 
FOR INSERT 
WITH CHECK (auth.uid() = subscriber_id);

CREATE POLICY "Users can view their subscriptions" 
ON public.subscriptions 
FOR SELECT 
USING (auth.uid() = subscriber_id OR auth.uid() = creator_id);

CREATE POLICY "Users can update their subscriptions" 
ON public.subscriptions 
FOR UPDATE 
USING (auth.uid() = subscriber_id);

CREATE POLICY "Users can delete their subscriptions" 
ON public.subscriptions 
FOR DELETE 
USING (auth.uid() = subscriber_id);