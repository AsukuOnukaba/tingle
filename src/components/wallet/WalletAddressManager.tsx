import { useState, useEffect } from "react";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardHeader, CardTitle, CardDescription } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { useToast } from "@/hooks/use-toast";
import { supabase } from "@/integrations/supabase/client";
import { useAuth } from "@/hooks/useAuth";
import { Wallet, ChevronDown, Plus, Loader2, Shield } from "lucide-react";
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuLabel,
  DropdownMenuSeparator,
  DropdownMenuTrigger,
} from "@/components/ui/dropdown-menu";
import {
  detectWallets,
  connectMetaMask,
  connectOKX,
  connectPhantom,
  type WalletProvider,
  type WalletConnection,
} from "@/lib/multiWallet";
import { CHAIN_CONFIGS, type ChainType } from "@/lib/chains";
import { AddressQRCode } from "./AddressQRCode";

interface ConnectedWallet {
  address: string;
  chain: ChainType;
  connected_at: string;
}

export const WalletAddressManager = () => {
  const { user } = useAuth();
  const [availableWallets, setAvailableWallets] = useState<WalletProvider[]>([]);
  const [connectedWallets, setConnectedWallets] = useState<ConnectedWallet[]>([]);
  const [loading, setLoading] = useState(false);
  const [selectedChain, setSelectedChain] = useState<ChainType>('base');
  const [fetchingAddresses, setFetchingAddresses] = useState(true);
  const { toast } = useToast();

  useEffect(() => {
    setAvailableWallets(detectWallets());
    if (user) {
      fetchConnectedWallets();
    }
  }, [user]);

  const fetchConnectedWallets = async () => {
    if (!user) return;
    
    setFetchingAddresses(true);
    try {
      const { data, error } = await (supabase as any)
        .from('profiles')
        .select('connected_wallets, evm_address, solana_address')
        .eq('id', user.id)
        .single();

      if (error) throw error;

      const wallets: ConnectedWallet[] = [];
      
      // Parse connected_wallets JSON
      if (data?.connected_wallets && Array.isArray(data.connected_wallets)) {
        wallets.push(...data.connected_wallets);
      }
      
      // Also check legacy fields
      if (data?.evm_address && !wallets.find(w => w.address === data.evm_address)) {
        wallets.push({ address: data.evm_address, chain: 'base', connected_at: new Date().toISOString() });
      }
      if (data?.solana_address && !wallets.find(w => w.address === data.solana_address)) {
        wallets.push({ address: data.solana_address, chain: 'solana', connected_at: new Date().toISOString() });
      }

      setConnectedWallets(wallets);
    } catch (error) {
      console.error('Error fetching connected wallets:', error);
    } finally {
      setFetchingAddresses(false);
    }
  };

  const registerWithWebhook = async (address: string, chain: ChainType) => {
    if (!user) return;

    try {
      const { data: { session } } = await supabase.auth.getSession();
      
      const response = await supabase.functions.invoke('register-wallet-address', {
        body: { address, chain, userId: user.id },
      });

      if (response.error) {
        console.error('Webhook registration error:', response.error);
        // Don't throw - webhook registration is optional
      } else {
        console.log('Webhook registration success:', response.data);
      }
    } catch (error) {
      console.error('Error registering with webhook:', error);
    }
  };

  const handleConnect = async (provider: WalletProvider) => {
    if (!user) {
      toast({
        title: "Authentication Required",
        description: "Please log in to connect a wallet",
        variant: "destructive",
      });
      return;
    }

    setLoading(true);
    try {
      let connection: WalletConnection;
      const isMobile = /iPhone|iPad|iPod|Android/i.test(navigator.userAgent);

      switch (provider) {
        case 'metamask':
          if (isMobile && !window.ethereum) {
            const deepLink = `https://metamask.app.link/dapp/${window.location.host}${window.location.pathname}`;
            window.location.href = deepLink;
            throw new Error('Opening MetaMask app...');
          }
          connection = await connectMetaMask(selectedChain);
          break;
        case 'okx':
          if (isMobile && !(window as any).okxwallet) {
            const deepLink = `okx://wallet/dapp/url?dappUrl=${encodeURIComponent(window.location.href)}`;
            window.location.href = deepLink;
            throw new Error('Opening OKX Wallet app...');
          }
          connection = await connectOKX(selectedChain);
          break;
        case 'phantom':
          if (isMobile && !(window as any).phantom?.solana) {
            const deepLink = `https://phantom.app/ul/browse/${encodeURIComponent(window.location.href)}?ref=${window.location.host}`;
            window.location.href = deepLink;
            throw new Error('Opening Phantom app...');
          }
          connection = await connectPhantom();
          break;
        case 'walletconnect':
          toast({
            title: "Coming Soon",
            description: "WalletConnect v2 integration coming soon. Use mobile in-app browser for now.",
          });
          return;
        default:
          throw new Error('Unsupported wallet provider');
      }

      // Register with webhook for real-time updates
      await registerWithWebhook(connection.address, connection.chainType);

      // Refresh connected wallets
      await fetchConnectedWallets();

      toast({
        title: "Wallet Connected!",
        description: `${connection.address.substring(0, 6)}...${connection.address.substring(connection.address.length - 4)} connected to ${CHAIN_CONFIGS[connection.chainType].name}`,
      });
    } catch (error: any) {
      console.error('Wallet connection error:', error);
      if (!error.message?.includes('Opening')) {
        toast({
          title: "Connection Failed",
          description: error.message || "Failed to connect wallet",
          variant: "destructive",
        });
      }
    } finally {
      setLoading(false);
    }
  };

  const getWalletName = (provider: WalletProvider): string => {
    const names: Record<WalletProvider, string> = {
      metamask: 'MetaMask',
      okx: 'OKX Wallet',
      phantom: 'Phantom',
      walletconnect: 'WalletConnect',
    };
    return names[provider];
  };

  const getWalletIcon = (provider: WalletProvider): string => {
    const icons: Record<WalletProvider, string> = {
      metamask: '🦊',
      okx: '⚫',
      phantom: '👻',
      walletconnect: '🔗',
    };
    return icons[provider];
  };

  return (
    <Card className="glass-card">
      <CardHeader>
        <CardTitle className="flex items-center gap-2">
          <Wallet className="w-5 h-5" />
          Blockchain Addresses
        </CardTitle>
        <CardDescription>
          Connect your wallet to receive crypto deposits. Addresses are monitored for real-time updates.
        </CardDescription>
      </CardHeader>
      <CardContent className="space-y-6">
        {/* Security Badge */}
        <div className="flex items-center gap-2 p-3 rounded-lg bg-green-500/10 border border-green-500/20">
          <Shield className="w-4 h-4 text-green-500" />
          <p className="text-xs text-green-600 dark:text-green-400">
            <strong>Non-custodial:</strong> Your private keys stay in your wallet. We only store your public addresses.
          </p>
        </div>

        {/* Connected Wallets */}
        {fetchingAddresses ? (
          <div className="flex items-center justify-center py-8">
            <Loader2 className="w-6 h-6 animate-spin text-muted-foreground" />
          </div>
        ) : connectedWallets.length > 0 ? (
          <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
            {connectedWallets.map((wallet, idx) => (
              <AddressQRCode 
                key={`${wallet.chain}-${idx}`}
                address={wallet.address}
                chain={wallet.chain}
              />
            ))}
          </div>
        ) : (
          <div className="text-center py-8 border border-dashed border-border rounded-lg">
            <Wallet className="w-12 h-12 mx-auto mb-3 text-muted-foreground/50" />
            <p className="text-muted-foreground mb-2">No wallets connected yet</p>
            <p className="text-xs text-muted-foreground">
              Connect a wallet to generate deposit addresses
            </p>
          </div>
        )}

        {/* Connect New Wallet */}
        <div className="space-y-3 pt-4 border-t border-border">
          <h4 className="text-sm font-medium flex items-center gap-2">
            <Plus className="w-4 h-4" />
            Connect New Wallet
          </h4>

          {/* Chain Selector */}
          <div className="space-y-2">
            <label className="text-xs text-muted-foreground">Select Network</label>
            <DropdownMenu>
              <DropdownMenuTrigger asChild>
                <Button variant="outline" className="w-full justify-between">
                  <span>{CHAIN_CONFIGS[selectedChain].name}</span>
                  <ChevronDown className="w-4 h-4" />
                </Button>
              </DropdownMenuTrigger>
              <DropdownMenuContent className="w-full min-w-[200px]">
                <DropdownMenuLabel>EVM Chains</DropdownMenuLabel>
                {(['ethereum', 'base', 'polygon', 'bnb'] as ChainType[]).map((chain) => (
                  <DropdownMenuItem
                    key={chain}
                    onClick={() => setSelectedChain(chain)}
                  >
                    <div className="flex items-center justify-between w-full">
                      <span>{CHAIN_CONFIGS[chain].name}</span>
                      {CHAIN_CONFIGS[chain].testnet && (
                        <Badge variant="outline" className="text-xs ml-2">Testnet</Badge>
                      )}
                    </div>
                  </DropdownMenuItem>
                ))}
                <DropdownMenuSeparator />
                <DropdownMenuLabel>Non-EVM Chains</DropdownMenuLabel>
                <DropdownMenuItem onClick={() => setSelectedChain('solana')}>
                  Solana
                </DropdownMenuItem>
              </DropdownMenuContent>
            </DropdownMenu>
          </div>

          {/* Wallet Options */}
          <div className="grid grid-cols-2 gap-2">
            {selectedChain === 'solana' ? (
              <Button
                variant="outline"
                onClick={() => handleConnect('phantom')}
                disabled={loading}
                className="h-auto py-3 flex flex-col items-center gap-2 col-span-2"
              >
                {loading ? (
                  <Loader2 className="w-6 h-6 animate-spin" />
                ) : (
                  <span className="text-2xl">👻</span>
                )}
                <span className="text-xs">Phantom</span>
              </Button>
            ) : (
              availableWallets
                .filter(p => p !== 'phantom' && p !== 'walletconnect')
                .map((provider) => (
                  <Button
                    key={provider}
                    variant="outline"
                    onClick={() => handleConnect(provider)}
                    disabled={loading}
                    className="h-auto py-3 flex flex-col items-center gap-2"
                  >
                    {loading ? (
                      <Loader2 className="w-6 h-6 animate-spin" />
                    ) : (
                      <span className="text-2xl">{getWalletIcon(provider)}</span>
                    )}
                    <span className="text-xs">{getWalletName(provider)}</span>
                  </Button>
                ))
            )}
          </div>

          {/* Mobile Instructions */}
          {/iPhone|iPad|iPod|Android/i.test(navigator.userAgent) && (
            <div className="p-3 rounded-lg bg-primary/10 border border-primary/20">
              <p className="text-xs">
                <strong className="text-primary">Mobile Users:</strong>
              </p>
              <ul className="text-xs text-muted-foreground mt-2 space-y-1 list-disc list-inside">
                <li>Tap a wallet button to open the app</li>
                <li>Or use your wallet's in-app browser</li>
              </ul>
            </div>
          )}
        </div>
      </CardContent>
    </Card>
  );
};
