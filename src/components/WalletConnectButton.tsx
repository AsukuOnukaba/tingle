import { Button } from "@/components/ui/button";
import { Wallet } from "lucide-react";
import { useWeb3 } from "@/hooks/useWeb3";

export const WalletConnectButton = () => {
  const { address, isConnected, isConnecting, connect, disconnect } = useWeb3();

  if (isConnected && address) {
    return (
      <Button
        onClick={disconnect}
        variant="outline"
        className="flex items-center gap-2"
      >
        <Wallet className="w-4 h-4" />
        <span className="hidden sm:inline">
          {address.slice(0, 6)}...{address.slice(-4)}
        </span>
      </Button>
    );
  }

  return (
    <Button
      onClick={connect}
      disabled={isConnecting}
      className="flex items-center gap-2 gradient-primary"
    >
      <Wallet className="w-4 h-4" />
      <span className="hidden sm:inline">
        {isConnecting ? "Connecting..." : "Connect Wallet"}
      </span>
    </Button>
  );
};
