import { useState, useEffect, useCallback } from 'react';
import { supabase } from '@/integrations/supabase/client';
import type { SupabaseClient } from '@supabase/supabase-js';
import { useAuth } from './useAuth';

const sb = supabase as unknown as SupabaseClient<any>;

export const useRoles = () => {
  const { user } = useAuth();
  const [roles, setRoles] = useState<string[]>([]);
  const [isAdmin, setIsAdmin] = useState(false);
  const [isCreator, setIsCreator] = useState(false);
  const [loading, setLoading] = useState(true);

  const fetchUserRoles = useCallback(async () => {
    console.log('🔄 useRoles: Fetching roles for user:', user?.id);
    
    if (!user?.id) {
      console.log('⚠️ useRoles: No user ID yet, waiting...');
      // Don't set loading to false - wait for auth to complete
      setRoles([]);
      setIsAdmin(false);
      setIsCreator(false);
      return;
    }

    setLoading(true);
    try {
      const { data, error } = await sb
        .from('user_roles')
        .select('role')
        .eq('user_id', user.id);

      if (error) throw error;

      const userRoles = data?.map((r: any) => r.role) || [];
      console.log('✅ useRoles: Fetched roles:', userRoles, 'isAdmin:', userRoles.includes('admin'));
      setRoles(userRoles);
      setIsAdmin(userRoles.includes('admin'));
      setIsCreator(userRoles.includes('creator'));
    } catch (error) {
      console.error('❌ useRoles: Error fetching roles:', error);
      setRoles([]);
      setIsAdmin(false);
      setIsCreator(false);
    } finally {
      setLoading(false);
    }
  }, [user?.id]);

  useEffect(() => {
    fetchUserRoles();
  }, [fetchUserRoles]);

  return { roles, isAdmin, isCreator, loading };
};
