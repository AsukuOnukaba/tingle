-- Add is_active column to subscriptions table if it doesn't exist
DO $$ 
BEGIN
  IF NOT EXISTS (
    SELECT 1 FROM information_schema.columns 
    WHERE table_schema = 'public' 
    AND table_name = 'subscriptions' 
    AND column_name = 'is_active'
  ) THEN
    ALTER TABLE public.subscriptions ADD COLUMN is_active BOOLEAN DEFAULT true;
  END IF;
END $$;