import { BrowserProvider } from "ethers";
import type { ChainType } from "./chains";
import { getChainConfig } from "./chains";

// Wallet provider types
export type WalletProvider = 'metamask' | 'okx' | 'walletconnect' | 'phantom';

export interface WalletConnection {
  provider: WalletProvider;
  address: string;
  chainType: ChainType;
}

/**
 * Detect available wallet providers
 */
export const detectWallets = (): WalletProvider[] => {
  const available: WalletProvider[] = [];
  
  if ((window as any).ethereum?.isMetaMask) {
    available.push('metamask');
  }
  
  if ((window as any).okxwallet) {
    available.push('okx');
  }
  
  if ((window as any).phantom?.solana) {
    available.push('phantom');
  }
  
  // WalletConnect is always available as it's a protocol
  available.push('walletconnect');
  
  return available;
};

/**
 * Connect to MetaMask (EVM chains)
 */
export const connectMetaMask = async (chainType: ChainType = 'ethereum'): Promise<WalletConnection> => {
  if (!(window as any).ethereum?.isMetaMask) {
    throw new Error('MetaMask not installed. Please install MetaMask extension.');
  }

  try {
    const provider = new BrowserProvider((window as any).ethereum);
    
    // Switch to correct chain
    await switchChain(chainType, 'metamask');
    
    // Request account access
    const accounts = await provider.send("eth_requestAccounts", []);
    const address = accounts[0];

    return {
      provider: 'metamask',
      address,
      chainType,
    };
  } catch (error) {
    console.error('MetaMask connection error:', error);
    throw error;
  }
};

/**
 * Connect to OKX Wallet (EVM chains)
 */
export const connectOKX = async (chainType: ChainType = 'ethereum'): Promise<WalletConnection> => {
  if (!(window as any).okxwallet) {
    throw new Error('OKX Wallet not installed. Please install OKX Wallet extension.');
  }

  try {
    const provider = new BrowserProvider((window as any).okxwallet);
    
    // Switch to correct chain
    await switchChain(chainType, 'okx');
    
    // Request account access
    const accounts = await provider.send("eth_requestAccounts", []);
    const address = accounts[0];

    return {
      provider: 'okx',
      address,
      chainType,
    };
  } catch (error) {
    console.error('OKX Wallet connection error:', error);
    throw error;
  }
};

/**
 * Connect to Phantom (Solana only)
 */
export const connectPhantom = async (): Promise<WalletConnection> => {
  if (!(window as any).phantom?.solana) {
    throw new Error('Phantom not installed. Please install Phantom wallet.');
  }

  try {
    const resp = await (window as any).phantom.solana.connect();
    const address = resp.publicKey.toString();

    return {
      provider: 'phantom',
      address,
      chainType: 'solana',
    };
  } catch (error) {
    console.error('Phantom connection error:', error);
    throw error;
  }
};

/**
 * Connect via WalletConnect v2 (Universal for mobile wallets)
 */
export const connectWalletConnect = async (chainType: ChainType = 'ethereum'): Promise<WalletConnection> => {
  // For mobile, trigger deep link
  if (/iPhone|iPad|iPod|Android/i.test(navigator.userAgent)) {
    return connectMobileWallet(chainType);
  }
  
  throw new Error('WalletConnect v2 SDK integration required. Please use MetaMask or OKX for now.');
};

/**
 * Connect mobile wallet via deep link
 */
export const connectMobileWallet = async (chainType: ChainType): Promise<WalletConnection> => {
  // Detect which mobile wallet app is available
  const isMobile = /iPhone|iPad|iPod|Android/i.test(navigator.userAgent);
  
  if (!isMobile) {
    throw new Error('This function is for mobile devices only');
  }

  if (chainType === 'solana') {
    // Phantom deep link
    const phantomUrl = `phantom://browse/${encodeURIComponent(window.location.href)}`;
    window.location.href = phantomUrl;
    throw new Error('Redirecting to Phantom app...');
  } else {
    // MetaMask deep link for EVM chains
    const metamaskUrl = `metamask://dapp/${window.location.host}${window.location.pathname}`;
    window.location.href = metamaskUrl;
    throw new Error('Redirecting to MetaMask app...');
  }
};

/**
 * Switch chain for EVM wallets
 */
export const switchChain = async (chainType: ChainType, walletProvider: WalletProvider): Promise<void> => {
  if (chainType === 'solana') {
    return; // Solana doesn't need chain switching
  }

  const chainConfig = getChainConfig(chainType);
  const provider = walletProvider === 'okx' ? (window as any).okxwallet : (window as any).ethereum;

  if (!provider) {
    throw new Error('Wallet provider not found');
  }

  try {
    await provider.request({
      method: 'wallet_switchEthereumChain',
      params: [{ chainId: `0x${chainConfig.chainId?.toString(16)}` }],
    });
  } catch (error: any) {
    // Chain not added, add it
    if (error.code === 4902) {
      await provider.request({
        method: 'wallet_addEthereumChain',
        params: [{
          chainId: `0x${chainConfig.chainId?.toString(16)}`,
          chainName: chainConfig.name,
          nativeCurrency: chainConfig.nativeCurrency,
          rpcUrls: chainConfig.rpcUrls,
          blockExplorerUrls: chainConfig.blockExplorerUrls,
        }],
      });
    } else {
      throw error;
    }
  }
};

/**
 * Disconnect wallet
 */
export const disconnectWallet = async (provider: WalletProvider): Promise<void> => {
  if (provider === 'phantom') {
    await (window as any).phantom?.solana?.disconnect();
  }
  // MetaMask and OKX don't have explicit disconnect, just clear local state
};

/**
 * Get current connected address
 */
export const getCurrentAddress = async (provider: WalletProvider): Promise<string | null> => {
  try {
    if (provider === 'phantom') {
      if ((window as any).phantom?.solana?.isConnected) {
        return (window as any).phantom.solana.publicKey.toString();
      }
      return null;
    } else {
      const walletProvider = provider === 'okx' ? (window as any).okxwallet : (window as any).ethereum;
      if (!walletProvider) return null;
      
      const browserProvider = new BrowserProvider(walletProvider);
      const accounts = await browserProvider.send("eth_accounts", []);
      return accounts[0] || null;
    }
  } catch (error) {
    console.error('Error getting current address:', error);
    return null;
  }
};
