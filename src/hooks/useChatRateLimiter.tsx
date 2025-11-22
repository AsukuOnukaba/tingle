import { useState, useCallback } from 'react';
import { supabase } from '@/integrations/supabase/client';
import { useAuth } from './useAuth';
import { toast } from 'sonner';

interface RateLimitConfig {
  maxMessages: number;
  windowMinutes: number;
}

const DEFAULT_CONFIG: RateLimitConfig = {
  maxMessages: 30, // Max 30 messages per 10 minutes
  windowMinutes: 10
};

export const useChatRateLimiter = (config: RateLimitConfig = DEFAULT_CONFIG) => {
  const { user } = useAuth();
  const [isLimited, setIsLimited] = useState(false);

  const checkRateLimit = useCallback(async (): Promise<boolean> => {
    if (!user) return false;

    try {
      const { data, error } = await (supabase as any).rpc('check_rate_limit', {
        p_user_id: user.id,
        p_action_type: 'message',
        p_max_count: config.maxMessages,
        p_window_minutes: config.windowMinutes
      });

      if (error) throw error;

      const canProceed = data === true;
      setIsLimited(!canProceed);

      if (!canProceed) {
        toast.error('Slow down! You\'re sending too many messages. Please wait a moment.');
      }

      return canProceed;
    } catch (error) {
      console.error('Rate limit check failed:', error);
      return true; // Fail open to not block legitimate users
    }
  }, [user, config]);

  const recordAction = useCallback(async () => {
    if (!user) return;

    try {
      await (supabase as any).rpc('record_rate_limit', {
        p_user_id: user.id,
        p_action_type: 'message'
      });
    } catch (error) {
      console.error('Failed to record rate limit action:', error);
    }
  }, [user]);

  return { checkRateLimit, recordAction, isLimited };
};
