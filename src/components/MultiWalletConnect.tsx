import { useState, useEffect } from "react";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { useToast } from "@/hooks/use-toast";
import { supabase } from "@/integrations/supabase/client";
import { Wallet, ChevronDown, ExternalLink } from "lucide-react";
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
  disconnectWallet,
  type WalletProvider,
  type WalletConnection,
} from "@/lib/multiWallet";
import { CHAIN_CONFIGS, type ChainType } from "@/lib/chains";

interface MultiWalletConnectProps {
  onConnect?: (connection: WalletConnection) => void;
}

export const MultiWalletConnect = ({ onConnect }: MultiWalletConnectProps) => {
  const [availableWallets, setAvailableWallets] = useState<WalletProvider[]>([]);
  const [connections, setConnections] = useState<WalletConnection[]>([]);
  const [loading, setLoading] = useState(false);
  const [selectedChain, setSelectedChain] = useState<ChainType>('base');
  const { toast } = useToast();

  useEffect(() => {
    setAvailableWallets(detectWallets());
  }, []);

  const handleConnect = async (provider: WalletProvider) => {
    setLoading(true);
    try {
      let connection: WalletConnection;

      switch (provider) {
        case 'metamask':
          connection = await connectMetaMask(selectedChain);
          break;
        case 'okx':
          connection = await connectOKX(selectedChain);
          break;
        case 'phantom':
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

      // Save to database
      const { data: { user } } = await supabase.auth.getUser();
      if (user) {
        const updateField = connection.chainType === 'solana' ? 'solana_address' : 'evm_address';
        const updateData: any = {
          [updateField]: connection.address,
        };
        
        const { error } = await (supabase as any)
          .from('profiles')
          .update(updateData)
          .eq('id', user.id);

        if (error) throw error;
      }

      setConnections([...connections, connection]);
      onConnect?.(connection);

      toast({
        title: "Wallet Connected",
        description: `Connected to ${connection.address.substring(0, 6)}...${connection.address.substring(connection.address.length - 4)}`,
      });
    } catch (error: any) {
      console.error('Wallet connection error:', error);
      toast({
        title: "Connection Failed",
        description: error.message || "Failed to connect wallet",
        variant: "destructive",
      });
    } finally {
      setLoading(false);
    }
  };

  const handleDisconnect = async (provider: WalletProvider) => {
    try {
      await disconnectWallet(provider);
      setConnections(connections.filter(c => c.provider !== provider));
      
      toast({
        title: "Wallet Disconnected",
        description: "Your wallet has been disconnected",
      });
    } catch (error: any) {
      toast({
        title: "Disconnection Failed",
        description: error.message,
        variant: "destructive",
      });
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

  const getWalletLogo = (provider: WalletProvider): string => {
    return `🦊`; // You can replace with actual logos
  };

  return (
    <Card className="glass-card">
      <CardHeader>
        <CardTitle className="flex items-center gap-2">
          <Wallet className="w-5 h-5" />
          Multi-Chain Wallet
        </CardTitle>
      </CardHeader>
      <CardContent className="space-y-4">
        {/* Chain Selector */}
        <div className="space-y-2">
          <label className="text-sm font-medium">Select Network</label>
          <DropdownMenu>
            <DropdownMenuTrigger asChild>
              <Button variant="outline" className="w-full justify-between">
                <span>{CHAIN_CONFIGS[selectedChain].name}</span>
                <ChevronDown className="w-4 h-4" />
              </Button>
            </DropdownMenuTrigger>
            <DropdownMenuContent className="w-full">
              <DropdownMenuLabel>EVM Chains</DropdownMenuLabel>
              {(['ethereum', 'base', 'polygon', 'bnb'] as ChainType[]).map((chain) => (
                <DropdownMenuItem
                  key={chain}
                  onClick={() => setSelectedChain(chain)}
                >
                  <div className="flex items-center justify-between w-full">
                    <span>{CHAIN_CONFIGS[chain].name}</span>
                    {CHAIN_CONFIGS[chain].testnet && (
                      <Badge variant="outline" className="text-xs">Testnet</Badge>
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

        {/* Connected Wallets */}
        {connections.length > 0 && (
          <div className="space-y-2">
            <label className="text-sm font-medium">Connected Wallets</label>
            {connections.map((connection, idx) => (
              <div
                key={idx}
                className="p-3 rounded-lg border border-border bg-accent/20 flex items-center justify-between"
              >
                <div className="flex items-center gap-3">
                  <span className="text-2xl">{getWalletLogo(connection.provider)}</span>
                  <div>
                    <p className="text-sm font-medium">{getWalletName(connection.provider)}</p>
                    <p className="text-xs text-muted-foreground font-mono">
                      {connection.address.substring(0, 8)}...{connection.address.substring(connection.address.length - 6)}
                    </p>
                  </div>
                </div>
                <Button
                  size="sm"
                  variant="ghost"
                  onClick={() => handleDisconnect(connection.provider)}
                >
                  Disconnect
                </Button>
              </div>
            ))}
          </div>
        )}

        {/* Available Wallets */}
        <div className="space-y-2">
          <label className="text-sm font-medium">Connect Wallet</label>
          <div className="grid grid-cols-2 gap-2">
            {availableWallets.map((provider) => (
              <Button
                key={provider}
                variant="outline"
                onClick={() => handleConnect(provider)}
                disabled={loading || connections.some(c => c.provider === provider)}
                className="h-auto py-3 flex flex-col items-center gap-2"
              >
                <span className="text-2xl">{getWalletLogo(provider)}</span>
                <span className="text-xs">{getWalletName(provider)}</span>
              </Button>
            ))}
          </div>
        </div>

        {/* Mobile Instructions */}
        {/iPhone|iPad|iPod|Android/i.test(navigator.userAgent) && (
          <div className="p-3 rounded-lg bg-primary/10 border border-primary/20">
            <p className="text-xs text-muted-foreground">
              <strong>Mobile:</strong> If wallet doesn't open, try using the in-app browser of your wallet app (MetaMask, OKX, or Phantom).
            </p>
          </div>
        )}

        {/* Info */}
        <div className="text-xs text-muted-foreground space-y-1">
          <p className="flex items-center gap-1">
            <ExternalLink className="w-3 h-3" />
            Non-custodial: Your keys stay in your wallet
          </p>
          <p>Supported: {availableWallets.length} wallet(s) detected</p>
        </div>
      </CardContent>
    </Card>
  );
};
