-- Add rate limiting table for spam prevention
CREATE TABLE IF NOT EXISTS public.rate_limits (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id uuid NOT NULL REFERENCES auth.users(id) ON DELETE CASCADE,
  action_type text NOT NULL, -- 'message', 'subscription', 'purchase', 'tip'
  action_count integer NOT NULL DEFAULT 1,
  window_start timestamptz NOT NULL DEFAULT now(),
  created_at timestamptz NOT NULL DEFAULT now(),
  UNIQUE(user_id, action_type, window_start)
);

ALTER TABLE public.rate_limits ENABLE ROW LEVEL SECURITY;

CREATE POLICY "Users can view their own rate limits"
  ON public.rate_limits FOR SELECT
  USING (auth.uid() = user_id);

CREATE POLICY "Users can insert their own rate limits"
  ON public.rate_limits FOR INSERT
  WITH CHECK (auth.uid() = user_id);

CREATE POLICY "Users can update their own rate limits"
  ON public.rate_limits FOR UPDATE
  USING (auth.uid() = user_id);

-- Add moderated_messages table for tracking flagged content
CREATE TABLE IF NOT EXISTS public.moderated_messages (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  message_id uuid NOT NULL REFERENCES public.messages(id) ON DELETE CASCADE,
  flagged_by uuid REFERENCES auth.users(id) ON DELETE SET NULL,
  reason text NOT NULL,
  severity text NOT NULL CHECK (severity IN ('low', 'medium', 'high', 'critical')),
  status text NOT NULL DEFAULT 'pending' CHECK (status IN ('pending', 'reviewed', 'actioned', 'dismissed')),
  reviewed_by uuid REFERENCES auth.users(id) ON DELETE SET NULL,
  reviewed_at timestamptz,
  created_at timestamptz NOT NULL DEFAULT now()
);

ALTER TABLE public.moderated_messages ENABLE ROW LEVEL SECURITY;

CREATE POLICY "Admins can view all moderated messages"
  ON public.moderated_messages FOR SELECT
  USING (public.has_role(auth.uid(), 'admin'));

CREATE POLICY "Users can flag messages"
  ON public.moderated_messages FOR INSERT
  WITH CHECK (auth.uid() = flagged_by);

-- Create function to check rate limits
CREATE OR REPLACE FUNCTION public.check_rate_limit(
  p_user_id uuid,
  p_action_type text,
  p_max_count integer,
  p_window_minutes integer
)
RETURNS boolean
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
DECLARE
  v_count integer;
  v_window_start timestamptz;
BEGIN
  v_window_start := now() - (p_window_minutes || ' minutes')::interval;
  
  -- Get count of actions in current window
  SELECT COALESCE(SUM(action_count), 0)
  INTO v_count
  FROM public.rate_limits
  WHERE user_id = p_user_id
    AND action_type = p_action_type
    AND window_start > v_window_start;
  
  -- Return true if under limit, false if over
  RETURN v_count < p_max_count;
END;
$$;

-- Create function to record rate limit action
CREATE OR REPLACE FUNCTION public.record_rate_limit(
  p_user_id uuid,
  p_action_type text
)
RETURNS void
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
BEGIN
  INSERT INTO public.rate_limits (user_id, action_type, window_start)
  VALUES (p_user_id, p_action_type, date_trunc('minute', now()))
  ON CONFLICT (user_id, action_type, window_start)
  DO UPDATE SET action_count = rate_limits.action_count + 1;
END;
$$;

-- Add indexes for performance
CREATE INDEX IF NOT EXISTS idx_rate_limits_user_action ON public.rate_limits(user_id, action_type, window_start DESC);
CREATE INDEX IF NOT EXISTS idx_moderated_messages_status ON public.moderated_messages(status, created_at DESC);