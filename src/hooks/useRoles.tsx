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
    if (!user?.id) {
      setRoles([]);
      setIsAdmin(false);
      setIsCreator(false);
      setLoading(false);
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
      setRoles(userRoles);
      setIsAdmin(userRoles.includes('admin'));
      setIsCreator(userRoles.includes('creator'));
    } catch (error) {
      console.error('Error fetching roles:', error);
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
