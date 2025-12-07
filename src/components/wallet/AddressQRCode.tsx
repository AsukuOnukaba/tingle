import { useState } from "react";
import { QRCodeSVG } from "qrcode.react";
import { Button } from "@/components/ui/button";
import { Card, CardContent } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { useToast } from "@/hooks/use-toast";
import { Copy, Check, ExternalLink, QrCode } from "lucide-react";
import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
  DialogTrigger,
} from "@/components/ui/dialog";
import { CHAIN_CONFIGS, type ChainType } from "@/lib/chains";

interface AddressQRCodeProps {
  address: string;
  chain: ChainType;
  size?: 'sm' | 'md' | 'lg';
}

const chainColors: Record<ChainType, string> = {
  ethereum: 'bg-blue-500',
  base: 'bg-blue-400',
  polygon: 'bg-purple-500',
  bnb: 'bg-yellow-500',
  solana: 'bg-gradient-to-r from-purple-500 to-cyan-400',
};

const chainIcons: Record<ChainType, string> = {
  ethereum: 'Ξ',
  base: 'Ⓑ',
  polygon: 'Ⓟ',
  bnb: '◆',
  solana: '◎',
};

export const AddressQRCode = ({ address, chain, size = 'md' }: AddressQRCodeProps) => {
  const [copied, setCopied] = useState(false);
  const { toast } = useToast();

  const copyAddress = async () => {
    await navigator.clipboard.writeText(address);
    setCopied(true);
    toast({
      title: "Copied!",
      description: "Address copied to clipboard",
    });
    setTimeout(() => setCopied(false), 2000);
  };

  const getExplorerUrl = () => {
    const config = CHAIN_CONFIGS[chain];
    const baseUrl = config.blockExplorerUrls[0];
    return chain === 'solana' 
      ? `${baseUrl}/account/${address}`
      : `${baseUrl}/address/${address}`;
  };

  const truncateAddress = (addr: string) => {
    return `${addr.substring(0, 8)}...${addr.substring(addr.length - 6)}`;
  };

  const qrSize = size === 'sm' ? 120 : size === 'md' ? 180 : 240;

  return (
    <Card className="border-border/50 bg-card/50 backdrop-blur-sm">
      <CardContent className="p-4">
        <div className="flex items-center justify-between mb-3">
          <div className="flex items-center gap-2">
            <div className={`w-8 h-8 rounded-full ${chainColors[chain]} flex items-center justify-center text-white font-bold text-sm`}>
              {chainIcons[chain]}
            </div>
            <div>
              <p className="font-medium text-sm">{CHAIN_CONFIGS[chain].name}</p>
              <p className="text-xs text-muted-foreground">
                {CHAIN_CONFIGS[chain].nativeCurrency.symbol}
              </p>
            </div>
          </div>
          {CHAIN_CONFIGS[chain].testnet && (
            <Badge variant="outline" className="text-xs">Testnet</Badge>
          )}
        </div>

        <div className="flex items-center gap-2 p-2 rounded-lg bg-muted/50 border border-border/50">
          <code className="text-xs flex-1 font-mono truncate">
            {truncateAddress(address)}
          </code>
          <Button
            size="icon"
            variant="ghost"
            className="h-7 w-7 shrink-0"
            onClick={copyAddress}
          >
            {copied ? (
              <Check className="h-3.5 w-3.5 text-green-500" />
            ) : (
              <Copy className="h-3.5 w-3.5" />
            )}
          </Button>
        </div>

        <div className="flex gap-2 mt-3">
          <Dialog>
            <DialogTrigger asChild>
              <Button variant="outline" size="sm" className="flex-1">
                <QrCode className="h-4 w-4 mr-2" />
                QR Code
              </Button>
            </DialogTrigger>
            <DialogContent className="sm:max-w-md">
              <DialogHeader>
                <DialogTitle className="flex items-center gap-2">
                  <div className={`w-6 h-6 rounded-full ${chainColors[chain]} flex items-center justify-center text-white font-bold text-xs`}>
                    {chainIcons[chain]}
                  </div>
                  {CHAIN_CONFIGS[chain].name} Deposit Address
                </DialogTitle>
              </DialogHeader>
              <div className="flex flex-col items-center space-y-4 py-4">
                <div className="p-4 bg-white rounded-xl">
                  <QRCodeSVG 
                    value={address}
                    size={qrSize}
                    level="H"
                    includeMargin={true}
                  />
                </div>
                <div className="w-full p-3 rounded-lg bg-muted">
                  <p className="text-xs text-muted-foreground mb-1">Send only {CHAIN_CONFIGS[chain].nativeCurrency.symbol} to this address:</p>
                  <code className="text-xs font-mono break-all">{address}</code>
                </div>
                <div className="flex gap-2 w-full">
                  <Button
                    variant="outline"
                    size="sm"
                    className="flex-1"
                    onClick={copyAddress}
                  >
                    {copied ? <Check className="h-4 w-4 mr-2" /> : <Copy className="h-4 w-4 mr-2" />}
                    Copy
                  </Button>
                  <Button
                    variant="outline"
                    size="sm"
                    className="flex-1"
                    asChild
                  >
                    <a href={getExplorerUrl()} target="_blank" rel="noopener noreferrer">
                      <ExternalLink className="h-4 w-4 mr-2" />
                      View
                    </a>
                  </Button>
                </div>
              </div>
            </DialogContent>
          </Dialog>

          <Button
            variant="outline"
            size="sm"
            className="flex-1"
            asChild
          >
            <a href={getExplorerUrl()} target="_blank" rel="noopener noreferrer">
              <ExternalLink className="h-4 w-4 mr-2" />
              Explorer
            </a>
          </Button>
        </div>
      </CardContent>
    </Card>
  );
};
