import { useEffect } from 'react';
import { supabase } from '@/integrations/supabase/client';
import { useAuth } from './useAuth';

/**
 * Hook to track user presence and update online status
 * Updates activity every 2 minutes while user is active
 */
export const usePresence = () => {
  const { user } = useAuth();

  useEffect(() => {
    if (!user) return;

    // Update activity immediately on mount
    const updateActivity = async () => {
      try {
        // Use raw SQL since types aren't updated yet - cast to any to bypass type errors
        const { error } = await (supabase as any)
          .from('profiles')
          .update({ 
            last_activity_at: new Date().toISOString(),
            is_online: true 
          })
          .eq('id', user.id);
        
        if (error) {
          console.error('Error updating activity:', error);
        }
      } catch (error) {
        console.error('Error updating activity:', error);
      }
    };

    updateActivity();

    // Set up interval to update activity every 2 minutes
    const interval = setInterval(updateActivity, 2 * 60 * 1000);

    // Update activity on page visibility change
    const handleVisibilityChange = () => {
      if (document.visibilityState === 'visible') {
        updateActivity();
      }
    };

    document.addEventListener('visibilitychange', handleVisibilityChange);

    // Update activity when user interacts with the page
    const handleUserActivity = () => {
      updateActivity();
    };

    // Throttle activity updates to once per minute max
    let lastUpdate = Date.now();
    const throttledUpdate = () => {
      const now = Date.now();
      if (now - lastUpdate > 60 * 1000) {
        lastUpdate = now;
        updateActivity();
      }
    };

    window.addEventListener('click', throttledUpdate);
    window.addEventListener('keypress', throttledUpdate);
    window.addEventListener('scroll', throttledUpdate);

    // Cleanup
    return () => {
      clearInterval(interval);
      document.removeEventListener('visibilitychange', handleVisibilityChange);
      window.removeEventListener('click', throttledUpdate);
      window.removeEventListener('keypress', throttledUpdate);
      window.removeEventListener('scroll', throttledUpdate);
    };
  }, [user]);
};
