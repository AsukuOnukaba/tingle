-- Add RLS policies for email_verification_tokens
CREATE POLICY "Service role can manage verification tokens"
  ON public.email_verification_tokens FOR ALL
  USING (true);

CREATE POLICY "Users can view own verification tokens"
  ON public.email_verification_tokens FOR SELECT
  USING (auth.uid() = user_id);