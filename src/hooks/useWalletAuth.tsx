import { useState, useEffect } from 'react';
import { BrowserProvider } from 'ethers';
import { supabase } from '@/integrations/supabase/client';
import { useToast } from '@/hooks/use-toast';
import { getBasename, isValidAddress } from '@/lib/basename';
import type { SupabaseClient } from '@supabase/supabase-js';

const sb = supabase as unknown as SupabaseClient<any>;

declare global {
  interface Window {
    ethereum?: {
      request: (args: { method: string; params?: unknown[] }) => Promise<unknown>;
      on?: (event: string, callback: (...args: unknown[]) => void) => void;
      removeListener?: (event: string, callback: (...args: unknown[]) => void) => void;
    };
  }
}

export const useWalletAuth = () => {
  const [walletAddress, setWalletAddress] = useState<string | null>(null);
  const [basename, setBasename] = useState<string | null>(null);
  const [loading, setLoading] = useState(false);
  const [isConnected, setIsConnected] = useState(false);
  const { toast } = useToast();

  useEffect(() => {
    checkWalletConnection();
  }, []);

  const checkWalletConnection = async () => {
    if (typeof window.ethereum !== 'undefined') {
      try {
        const provider = new BrowserProvider(window.ethereum);
        const accounts = await provider.listAccounts();
        
        if (accounts.length > 0) {
          const address = accounts[0].address;
          setWalletAddress(address);
          setIsConnected(true);
          
          // Try to fetch basename
          const name = await getBasename(address);
          setBasename(name);
        }
      } catch (error) {
        console.error('Error checking wallet connection:', error);
      }
    }
  };

  const connectWallet = async (): Promise<string | null> => {
    if (typeof window.ethereum === 'undefined') {
      toast({
        title: "Wallet Not Found",
        description: "Please install MetaMask, OKX Wallet, or another Web3 wallet to continue",
        variant: "destructive",
      });
      return null;
    }

    setLoading(true);

    try {
      const provider = new BrowserProvider(window.ethereum);
      
      // Request account access
      const accounts = await provider.send("eth_requestAccounts", []);
      const address = accounts[0];

      if (!isValidAddress(address)) {
        throw new Error("Invalid wallet address");
      }

      setWalletAddress(address);
      setIsConnected(true);

      // Try to fetch basename
      const name = await getBasename(address);
      setBasename(name);

      toast({
        title: "Wallet Connected",
        description: `Connected to ${name || address.substring(0, 6) + '...' + address.substring(address.length - 4)}`,
      });

      return address;
    } catch (error: any) {
      console.error('Error connecting wallet:', error);
      toast({
        title: "Connection Failed",
        description: error.message || "Failed to connect wallet",
        variant: "destructive",
      });
      return null;
    } finally {
      setLoading(false);
    }
  };

  const signInWithWallet = async (): Promise<boolean> => {
    if (!walletAddress) {
      const address = await connectWallet();
      if (!address) return false;
    }

    setLoading(true);

    try {
      // Check if profile with this wallet exists
      const { data: existingProfile, error: profileError } = await sb
        .from('profiles')
        .select('id, wallet_address')
        .eq('wallet_address', walletAddress)
        .maybeSingle();

      if (profileError && profileError.code !== 'PGRST116') {
        throw profileError;
      }

      if (existingProfile) {
        // Sign in with anonymous auth and link to profile
        const { data: authData, error: authError } = await supabase.auth.signInAnonymously();
        
        if (authError) throw authError;

        // Update profile with auth user ID
        const { error: updateError } = await sb
          .from('profiles')
          .update({ 
            id: authData.user.id,
            updated_at: new Date().toISOString(),
          })
          .eq('wallet_address', walletAddress);

        if (updateError) throw updateError;

        toast({
          title: "Signed In",
          description: `Welcome back, ${basename || 'User'}!`,
        });

        return true;
      } else {
        // New wallet - need to sign up
        return false;
      }
    } catch (error: any) {
      console.error('Error signing in with wallet:', error);
      toast({
        title: "Sign In Failed",
        description: error.message || "Failed to sign in with wallet",
        variant: "destructive",
      });
      return false;
    } finally {
      setLoading(false);
    }
  };

  const signUpWithWallet = async (displayName?: string): Promise<boolean> => {
    if (!walletAddress) {
      const address = await connectWallet();
      if (!address) return false;
    }

    setLoading(true);

    try {
      // Sign up anonymously
      const { data: authData, error: authError } = await supabase.auth.signInAnonymously();
      
      if (authError) throw authError;

      // Create profile with wallet address
      const { error: profileError } = await sb
        .from('profiles')
        .insert({
          id: authData.user.id,
          wallet_address: walletAddress,
          basename: basename,
          display_name: displayName || basename || `User ${walletAddress.substring(0, 6)}`,
          age: 18, // Default age
        });

      if (profileError) throw profileError;

      toast({
        title: "Account Created",
        description: `Welcome to Tingle, ${displayName || basename || 'User'}!`,
      });

      return true;
    } catch (error: any) {
      console.error('Error signing up with wallet:', error);
      toast({
        title: "Sign Up Failed",
        description: error.message || "Failed to create account",
        variant: "destructive",
      });
      return false;
    } finally {
      setLoading(false);
    }
  };

  const disconnectWallet = () => {
    setWalletAddress(null);
    setBasename(null);
    setIsConnected(false);
  };

  return {
    walletAddress,
    basename,
    loading,
    isConnected,
    connectWallet,
    signInWithWallet,
    signUpWithWallet,
    disconnectWallet,
  };
};
