import { useEffect, useState } from 'react';
import { supabase } from '@/integrations/supabase/client';

export const useCurrentProfile = () => {
  const [currentProfileId, setCurrentProfileId] = useState<string | null>(null);
  
  useEffect(() => {
    // Get current user's ID from auth
    const getCurrentUser = async () => {
      const { data: { user } } = await supabase.auth.getUser();
      if (user) {
        setCurrentProfileId(user.id);
      }
    };
    
    getCurrentUser();
    
    // Subscribe to auth changes
    const { data: { subscription } } = supabase.auth.onAuthStateChange((event, session) => {
      if (session?.user) {
        setCurrentProfileId(session.user.id);
      } else {
        setCurrentProfileId(null);
      }
    });
    
    return () => {
      subscription.unsubscribe();
    };
  }, []);
  
  return { currentProfileId };
};
