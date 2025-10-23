import { useState, useEffect } from "react";
import { Button } from "@/components/ui/button";
import { useToast } from "@/hooks/use-toast";
import { supabase } from "@/integrations/supabase/client";
import type { SupabaseClient } from "@supabase/supabase-js";
import { Wallet } from "lucide-react";
import { BrowserProvider } from "ethers";

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

interface WalletConnectProps {
  currentWalletAddress?: string;
  onConnect?: (address: string | null) => void;
}

export const WalletConnect = ({ currentWalletAddress, onConnect }: WalletConnectProps) => {
  const [walletAddress, setWalletAddress] = useState<string | null>(currentWalletAddress || null);
  const [loading, setLoading] = useState(false);
  const { toast } = useToast();

  useEffect(() => {
    if (currentWalletAddress) {
      setWalletAddress(currentWalletAddress);
    }
  }, [currentWalletAddress]);

  const connectWallet = async () => {
    if (typeof window.ethereum === 'undefined') {
      toast({
        title: "Wallet Not Found",
        description: "Please install OKX Wallet extension to connect your wallet",
        variant: "destructive",
      });
      return;
    }

    setLoading(true);

    try {
      const provider = new BrowserProvider(window.ethereum);
      
      // Request account access
      const accounts = await provider.send("eth_requestAccounts", []);
      const address = accounts[0];

      // Get user
      const { data: { user } } = await supabase.auth.getUser();
      
      if (!user) {
        throw new Error("User not authenticated");
      }

      // Update creator wallet address
      const { error } = await sb
        .from('creators')
        .update({ wallet_address: address })
        .eq('user_id', user.id);

      if (error) throw error;

      setWalletAddress(address);
      onConnect?.(address);

      toast({
        title: "Wallet Connected",
        description: `Connected to ${address.substring(0, 6)}...${address.substring(address.length - 4)}`,
      });
    } catch (error) {
      console.error('Error connecting wallet:', error);
      toast({
        title: "Connection Failed",
        description: error.message || "Failed to connect wallet",
        variant: "destructive",
      });
    } finally {
      setLoading(false);
    }
  };

  const disconnectWallet = async () => {
    setLoading(true);

    try {
      const { data: { user } } = await supabase.auth.getUser();
      
      if (!user) {
        throw new Error("User not authenticated");
      }

    const { error } = await sb
      .from('creators')
      .update({ wallet_address: null })
      .eq('user_id', user.id);

      if (error) throw error;

      setWalletAddress(null);
      onConnect?.(null);

      toast({
        title: "Wallet Disconnected",
        description: "Your crypto wallet has been disconnected",
      });
    } catch (error) {
      console.error('Error disconnecting wallet:', error);
      toast({
        title: "Disconnection Failed",
        description: error.message || "Failed to disconnect wallet",
        variant: "destructive",
      });
    } finally {
      setLoading(false);
    }
  };

  return (
    <div className="space-y-3">
      {walletAddress ? (
        <div className="space-y-2">
          <div className="p-3 bg-primary/10 rounded-lg">
            <p className="text-sm text-muted-foreground mb-1">Connected Wallet</p>
            <p className="font-mono text-sm">
              {walletAddress.substring(0, 10)}...{walletAddress.substring(walletAddress.length - 8)}
            </p>
          </div>
          <Button 
            variant="outline" 
            onClick={disconnectWallet}
            disabled={loading}
            className="w-full"
          >
            Disconnect Wallet
          </Button>
        </div>
      ) : (
        <Button 
          onClick={connectWallet}
          disabled={loading}
          className="w-full"
        >
          <Wallet className="mr-2 h-4 w-4" />
          Connect OKX Wallet
        </Button>
      )}
    </div>
  );
};
