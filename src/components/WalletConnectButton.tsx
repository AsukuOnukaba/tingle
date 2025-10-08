import { useState } from "react";
import { Button } from "@/components/ui/button";
import { Wallet } from "lucide-react";
import { useWeb3 } from "@/hooks/useWeb3";

export const WalletConnectButton = () => {
  const { address, isConnected, isConnecting, connect, disconnect } = useWeb3();
  const [error, setError] = useState<string | null>(null);

  const handleConnect = async () => {
    try {
      setError(null);
      console.log("WalletConnect: calling connect()");
      await connect();
      console.log("WalletConnect: connect() resolved");
    } catch (err) {
      console.error("WalletConnect: connect() error", err);
      setError(String(err ?? "unknown"));
    }
  };

  if (isConnected && address) {
    return (
      <>
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
        {error && (
          <div className="text-xs text-red-500 mt-1" role="alert">
            {error}
          </div>
        )}
      </>
    );
  }

  return (
    <>
      <Button
        onClick={handleConnect}
        disabled={isConnecting}
        className="flex items-center gap-2 gradient-primary"
      >
        <Wallet className="w-4 h-4" />
        <span className="hidden sm:inline">
          {isConnecting ? "Connecting..." : "Connect Wallet"}
        </span>
      </Button>
      {error && (
        <div className="text-xs text-red-500 mt-1" role="alert">
          {error}
        </div>
      )}
    </>
  );
};
