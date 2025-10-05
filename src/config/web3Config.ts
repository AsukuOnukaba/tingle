import { http } from 'wagmi';
import { mainnet, polygon, bsc, arbitrum, optimism } from 'wagmi/chains';
import { getDefaultConfig } from '@rainbow-me/rainbowkit';

// Configure multiple blockchain networks
export const web3Config = getDefaultConfig({
  appName: 'Tingle',
  projectId: 'YOUR_WALLET_CONNECT_PROJECT_ID', // Get from https://cloud.walletconnect.com
  chains: [mainnet, polygon, bsc, arbitrum, optimism],
  transports: {
    [mainnet.id]: http(),
    [polygon.id]: http(),
    [bsc.id]: http(),
    [arbitrum.id]: http(),
    [optimism.id]: http(),
  },
});

// Smart contract addresses (to be deployed per chain)
export const CONTRACT_ADDRESSES = {
  [mainnet.id]: '0x0000000000000000000000000000000000000000', // Placeholder
  [polygon.id]: '0x0000000000000000000000000000000000000000', // Placeholder
  [bsc.id]: '0x0000000000000000000000000000000000000000', // Placeholder
  [arbitrum.id]: '0x0000000000000000000000000000000000000000', // Placeholder
  [optimism.id]: '0x0000000000000000000000000000000000000000', // Placeholder
};

// Subscription Contract ABI (placeholder - will be replaced with actual deployed contract)
export const SUBSCRIPTION_CONTRACT_ABI = [
  {
    "inputs": [
      { "internalType": "address", "name": "creator", "type": "address" },
      { "internalType": "uint256", "name": "duration", "type": "uint256" }
    ],
    "name": "subscribe",
    "outputs": [],
    "stateMutability": "payable",
    "type": "function"
  },
  {
    "inputs": [
      { "internalType": "address", "name": "creator", "type": "address" }
    ],
    "name": "unsubscribe",
    "outputs": [],
    "stateMutability": "nonpayable",
    "type": "function"
  },
  {
    "inputs": [
      { "internalType": "address", "name": "subscriber", "type": "address" },
      { "internalType": "address", "name": "creator", "type": "address" }
    ],
    "name": "isSubscribed",
    "outputs": [{ "internalType": "bool", "name": "", "type": "bool" }],
    "stateMutability": "view",
    "type": "function"
  },
  {
    "inputs": [
      { "internalType": "address", "name": "subscriber", "type": "address" },
      { "internalType": "address", "name": "creator", "type": "address" }
    ],
    "name": "getSubscriptionExpiry",
    "outputs": [{ "internalType": "uint256", "name": "", "type": "uint256" }],
    "stateMutability": "view",
    "type": "function"
  }
] as const;
