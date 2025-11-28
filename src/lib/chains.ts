// Multi-chain configuration with free-tier RPC providers
export type ChainType = 'ethereum' | 'base' | 'polygon' | 'bnb' | 'solana';

export interface ChainConfig {
  id: string;
  name: string;
  type: ChainType;
  chainId?: number; // For EVM chains
  nativeCurrency: {
    name: string;
    symbol: string;
    decimals: number;
  };
  rpcUrls: string[];
  blockExplorerUrls: string[];
  testnet?: boolean;
}

// Free-tier RPC providers configuration
export const CHAIN_CONFIGS: Record<ChainType, ChainConfig> = {
  ethereum: {
    id: 'ethereum',
    name: 'Ethereum',
    type: 'ethereum',
    chainId: 1,
    nativeCurrency: {
      name: 'Ethereum',
      symbol: 'ETH',
      decimals: 18,
    },
    rpcUrls: [
      'https://eth-mainnet.g.alchemy.com/v2/demo', // Alchemy free tier
      'https://rpc.ankr.com/eth', // Ankr public RPC
      'https://ethereum.publicnode.com',
    ],
    blockExplorerUrls: ['https://etherscan.io'],
  },
  base: {
    id: 'base-sepolia',
    name: 'Base Sepolia',
    type: 'base',
    chainId: 84532,
    nativeCurrency: {
      name: 'Ethereum',
      symbol: 'ETH',
      decimals: 18,
    },
    rpcUrls: [
      'https://base-sepolia.g.alchemy.com/v2/demo', // Alchemy free tier
      'https://sepolia.base.org',
      'https://base-sepolia.publicnode.com',
    ],
    blockExplorerUrls: ['https://sepolia.basescan.org'],
    testnet: true,
  },
  polygon: {
    id: 'polygon',
    name: 'Polygon',
    type: 'polygon',
    chainId: 137,
    nativeCurrency: {
      name: 'MATIC',
      symbol: 'MATIC',
      decimals: 18,
    },
    rpcUrls: [
      'https://polygon-mainnet.g.alchemy.com/v2/demo', // Alchemy free tier
      'https://rpc.ankr.com/polygon', // Ankr public RPC
      'https://polygon-bor-rpc.publicnode.com',
    ],
    blockExplorerUrls: ['https://polygonscan.com'],
  },
  bnb: {
    id: 'bnb',
    name: 'BNB Chain',
    type: 'bnb',
    chainId: 56,
    nativeCurrency: {
      name: 'BNB',
      symbol: 'BNB',
      decimals: 18,
    },
    rpcUrls: [
      'https://bsc-dataseed.binance.org',
      'https://rpc.ankr.com/bsc', // Ankr public RPC
      'https://bsc-rpc.publicnode.com',
    ],
    blockExplorerUrls: ['https://bscscan.com'],
  },
  solana: {
    id: 'solana',
    name: 'Solana',
    type: 'solana',
    nativeCurrency: {
      name: 'Solana',
      symbol: 'SOL',
      decimals: 9,
    },
    rpcUrls: [
      'https://api.mainnet-beta.solana.com', // Helius free tier
      'https://solana-mainnet.rpc.extrnode.com',
    ],
    blockExplorerUrls: ['https://solscan.io'],
  },
};

export const getChainConfig = (chainType: ChainType): ChainConfig => {
  return CHAIN_CONFIGS[chainType];
};

export const getChainById = (chainId: number): ChainConfig | null => {
  return Object.values(CHAIN_CONFIGS).find((chain) => chain.chainId === chainId) || null;
};

// Helper to get working RPC URL with fallback
export const getRpcUrl = async (chainType: ChainType): Promise<string> => {
  const config = getChainConfig(chainType);
  
  // Try each RPC until one works
  for (const rpcUrl of config.rpcUrls) {
    try {
      const response = await fetch(rpcUrl, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          jsonrpc: '2.0',
          method: chainType === 'solana' ? 'getHealth' : 'eth_blockNumber',
          params: [],
          id: 1,
        }),
      });
      
      if (response.ok) {
        return rpcUrl;
      }
    } catch (error) {
      console.warn(`RPC ${rpcUrl} failed, trying next...`);
      continue;
    }
  }
  
  // Return first RPC as fallback
  return config.rpcUrls[0];
};

// Token configurations for multi-chain
export interface TokenConfig {
  symbol: string;
  name: string;
  decimals: number;
  address?: string; // Contract address for ERC20 tokens
  chain: ChainType;
  isNative: boolean;
}

export const SUPPORTED_TOKENS: TokenConfig[] = [
  // Native tokens
  { symbol: 'ETH', name: 'Ethereum', decimals: 18, chain: 'ethereum', isNative: true },
  { symbol: 'ETH', name: 'Ethereum', decimals: 18, chain: 'base', isNative: true },
  { symbol: 'MATIC', name: 'Polygon', decimals: 18, chain: 'polygon', isNative: true },
  { symbol: 'BNB', name: 'BNB', decimals: 18, chain: 'bnb', isNative: true },
  { symbol: 'SOL', name: 'Solana', decimals: 9, chain: 'solana', isNative: true },
];
