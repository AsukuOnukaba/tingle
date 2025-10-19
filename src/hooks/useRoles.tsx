import { useState, useEffect } from 'react';
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

  useEffect(() => {
    if (user) {
      fetchUserRoles();
    } else {
      setRoles([]);
      setIsAdmin(false);
      setIsCreator(false);
      setLoading(false);
    }
  }, [user]);

  const fetchUserRoles = async () => {
    try {
      console.log('🔍 Fetching roles for user:', user?.id);
      const { data, error } = await sb
        .from('user_roles')
        .select('role')
        .eq('user_id', user?.id);

      console.log('✅ Roles data:', data);
      console.log('❌ Roles error:', error);

      if (error) throw error;

      const userRoles = data?.map((r: any) => r.role) || [];
      console.log('👤 User roles:', userRoles);
      setRoles(userRoles);
      setIsAdmin(userRoles.includes('admin'));
      setIsCreator(userRoles.includes('creator'));
      console.log('🔐 Is Admin:', userRoles.includes('admin'));
    } catch (error) {
      console.error('Error fetching roles:', error);
    } finally {
      setLoading(false);
    }
  };

  return { roles, isAdmin, isCreator, loading };
};
