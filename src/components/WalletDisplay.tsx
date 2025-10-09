import { useEffect, useState } from 'react';
import { Wallet } from 'lucide-react';
import { supabase } from '@/integrations/supabase/client';
import { useAuth } from '@/hooks/useAuth';

export const WalletDisplay = () => {
  const { user } = useAuth();
  const [balance, setBalance] = useState<number>(0);

  useEffect(() => {
    if (!user) return;

    const fetchBalance = async () => {
      const { data } = await supabase
        .from('wallets')
        .select('balance')
        .eq('user_id', user.id)
        .single();
      
      if (data) {
        setBalance(data.balance);
      }
    };

    fetchBalance();

    // Subscribe to wallet changes
    const channel = supabase
      .channel('wallet-changes')
      .on(
        'postgres_changes',
        {
          event: '*',
          schema: 'public',
          table: 'wallets',
          filter: `user_id=eq.${user.id}`
        },
        (payload: any) => {
          if (payload.new?.balance !== undefined) {
            setBalance(payload.new.balance);
          }
        }
      )
      .subscribe();

    return () => {
      supabase.removeChannel(channel);
    };
  }, [user]);

  if (!user) return null;

  return (
    <div className="flex items-center gap-2 glass-card px-4 py-2 rounded-full">
      <Wallet className="w-4 h-4 text-primary" />
      <span className="font-semibold">₦{balance.toFixed(2)}</span>
    </div>
  );
};
