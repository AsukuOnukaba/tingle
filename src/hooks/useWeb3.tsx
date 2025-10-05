import { createContext, useContext, ReactNode } from 'react';
import { useAccount, useConnect, useDisconnect, useWriteContract, useReadContract, useChainId } from 'wagmi';
import { parseEther } from 'viem';
import { CONTRACT_ADDRESSES, SUBSCRIPTION_CONTRACT_ABI } from '@/config/web3Config';
import { toast } from '@/hooks/use-toast';

interface Web3ContextType {
  address: string | undefined;
  isConnected: boolean;
  isConnecting: boolean;
  connect: () => void;
  disconnect: () => void;
  subscribe: (creatorAddress: string, price: string) => Promise<void>;
  unsubscribe: (creatorAddress: string) => Promise<void>;
  checkSubscription: (creatorAddress: string) => Promise<boolean>;
}

const Web3Context = createContext<Web3ContextType | undefined>(undefined);

export const Web3Provider = ({ children }: { children: ReactNode }) => {
  const { address, isConnected, chain } = useAccount();
  const chainId = useChainId();
  const { connect: wagmiConnect, connectors, isPending } = useConnect();
  const { disconnect: wagmiDisconnect } = useDisconnect();
  const { writeContractAsync } = useWriteContract();

  const connect = () => {
    const injectedConnector = connectors.find((c) => c.id === 'injected');
    if (injectedConnector) {
      wagmiConnect({ connector: injectedConnector });
    }
  };

  const disconnect = () => {
    wagmiDisconnect();
  };

  const subscribe = async (creatorAddress: string, price: string) => {
    if (!address) {
      toast({
        title: "Wallet not connected",
        description: "Please connect your wallet first.",
        variant: "destructive",
      });
      return;
    }

    try {
      // Get current chain ID from the connected wallet
      const contractAddress = CONTRACT_ADDRESSES[chainId as keyof typeof CONTRACT_ADDRESSES];

      if (!contractAddress || contractAddress === '0x0000000000000000000000000000000000000000') {
        toast({
          title: "Contract not deployed",
          description: "Smart contract not yet deployed on this network.",
          variant: "destructive",
        });
        return;
      }

      const priceInEth = parseEther(price.replace('$', ''));
      const duration = 30 * 24 * 60 * 60; // 30 days in seconds

      await writeContractAsync({
        address: contractAddress as `0x${string}`,
        abi: SUBSCRIPTION_CONTRACT_ABI,
        functionName: 'subscribe',
        args: [creatorAddress as `0x${string}`, BigInt(duration)],
        value: priceInEth,
        account: address as `0x${string}`,
        chain: chain,
      });

      toast({
        title: "Subscription successful!",
        description: "Your subscription has been processed on-chain.",
      });
    } catch (error) {
      console.error('Subscription error:', error);
      toast({
        title: "Transaction failed",
        description: "Failed to process subscription. Please try again.",
        variant: "destructive",
      });
      throw error;
    }
  };

  const unsubscribe = async (creatorAddress: string) => {
    if (!address) {
      toast({
        title: "Wallet not connected",
        description: "Please connect your wallet first.",
        variant: "destructive",
      });
      return;
    }

    try {
      const contractAddress = CONTRACT_ADDRESSES[chainId as keyof typeof CONTRACT_ADDRESSES];

      await writeContractAsync({
        address: contractAddress as `0x${string}`,
        abi: SUBSCRIPTION_CONTRACT_ABI,
        functionName: 'unsubscribe',
        args: [creatorAddress as `0x${string}`],
        account: address as `0x${string}`,
        chain: chain,
      });

      toast({
        title: "Unsubscribed",
        description: "You've been unsubscribed successfully.",
      });
    } catch (error) {
      console.error('Unsubscribe error:', error);
      toast({
        title: "Transaction failed",
        description: "Failed to unsubscribe. Please try again.",
        variant: "destructive",
      });
      throw error;
    }
  };

  const checkSubscription = async (creatorAddress: string): Promise<boolean> => {
    if (!address) return false;

    try {
      const contractAddress = CONTRACT_ADDRESSES[chainId as keyof typeof CONTRACT_ADDRESSES];

      // This would use useReadContract in actual implementation
      // For now, return false as placeholder
      return false;
    } catch (error) {
      console.error('Check subscription error:', error);
      return false;
    }
  };

  return (
    <Web3Context.Provider
      value={{
        address,
        isConnected,
        isConnecting: isPending,
        connect,
        disconnect,
        subscribe,
        unsubscribe,
        checkSubscription,
      }}
    >
      {children}
    </Web3Context.Provider>
  );
};

export const useWeb3 = () => {
  const context = useContext(Web3Context);
  if (context === undefined) {
    throw new Error('useWeb3 must be used within a Web3Provider');
  }
  return context;
};
