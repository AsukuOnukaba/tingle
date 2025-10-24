import { BrowserProvider, Contract, parseEther, formatEther } from 'ethers';

// Base Sepolia Testnet Configuration
export const BASE_SEPOLIA_CONFIG = {
  chainId: 84532,
  name: 'Base Sepolia',
  rpcUrl: 'https://sepolia.base.org',
  explorerUrl: 'https://sepolia.basescan.org',
  nativeCurrency: {
    name: 'Ethereum',
    symbol: 'ETH',
    decimals: 18,
  },
};

// TinglePayments Smart Contract on Base Sepolia
// Replace with your deployed contract address after deployment
export const TINGLE_PAYMENTS_ADDRESS = '0x0000000000000000000000000000000000000000'; // Update after deployment

export const TINGLE_PAYMENTS_ABI = [
  'function purchaseContent(address creator, string contentId) external payable',
  'function releaseFunds(bytes32 transactionRef) external',
  'function raiseDispute(bytes32 transactionRef) external',
  'function withdrawEarnings() external',
  'function getWithdrawableBalance(address creator) external view returns (uint256)',
  'function getTotalEarnings(address creator) external view returns (uint256)',
  'function getPurchase(bytes32 transactionRef) external view returns (tuple(address buyer, address creator, string contentId, uint256 amount, uint256 timestamp, uint256 escrowUntil, uint8 status))',
  'function paused() external view returns (bool)',
  'event ContentPurchased(bytes32 indexed transactionRef, address indexed buyer, address indexed creator, string contentId, uint256 amount, uint256 escrowUntil)',
  'event FundsReleased(bytes32 indexed transactionRef, uint256 creatorAmount, uint256 platformFee)',
  'event DisputeRaised(bytes32 indexed transactionRef, address indexed buyer)',
  'event EarningsWithdrawn(address indexed creator, uint256 amount)',
];

/**
 * Switch to Base Sepolia Testnet
 */
export async function switchToBaseSepolia(): Promise<boolean> {
  if (typeof window.ethereum === 'undefined') {
    throw new Error('No Web3 wallet detected');
  }

  try {
    await window.ethereum.request({
      method: 'wallet_switchEthereumChain',
      params: [{ chainId: `0x${BASE_SEPOLIA_CONFIG.chainId.toString(16)}` }],
    });
    return true;
  } catch (switchError: any) {
    // Chain not added, try to add it
    if (switchError.code === 4902) {
      try {
        await window.ethereum.request({
          method: 'wallet_addEthereumChain',
          params: [
            {
              chainId: `0x${BASE_SEPOLIA_CONFIG.chainId.toString(16)}`,
              chainName: BASE_SEPOLIA_CONFIG.name,
              rpcUrls: [BASE_SEPOLIA_CONFIG.rpcUrl],
              blockExplorerUrls: [BASE_SEPOLIA_CONFIG.explorerUrl],
              nativeCurrency: BASE_SEPOLIA_CONFIG.nativeCurrency,
            },
          ],
        });
        return true;
      } catch (addError) {
        console.error('Error adding Base Sepolia:', addError);
        throw new Error('Failed to add Base Sepolia network');
      }
    }
    throw switchError;
  }
}

/**
 * Get TinglePayments contract instance
 */
export async function getTinglePaymentsContract(): Promise<Contract> {
  if (typeof window.ethereum === 'undefined') {
    throw new Error('No Web3 wallet detected');
  }

  const provider = new BrowserProvider(window.ethereum);
  const signer = await provider.getSigner();

  // Ensure we're on Base Sepolia
  const network = await provider.getNetwork();
  if (Number(network.chainId) !== BASE_SEPOLIA_CONFIG.chainId) {
    await switchToBaseSepolia();
  }

  return new Contract(TINGLE_PAYMENTS_ADDRESS, TINGLE_PAYMENTS_ABI, signer);
}

/**
 * Purchase content on Base blockchain
 */
export async function purchaseContentOnBase(
  creatorAddress: string,
  contentId: string,
  amountInETH: string
): Promise<{ txHash: string; transactionRef: string }> {
  const contract = await getTinglePaymentsContract();
  
  const tx = await contract.purchaseContent(creatorAddress, contentId, {
    value: parseEther(amountInETH),
  });

  const receipt = await tx.wait();
  
  // Extract transactionRef from event
  const event = receipt.logs.find((log: any) => {
    try {
      const parsed = contract.interface.parseLog(log);
      return parsed?.name === 'ContentPurchased';
    } catch {
      return false;
    }
  });

  const parsedEvent = contract.interface.parseLog(event);
  const transactionRef = parsedEvent?.args.transactionRef;

  return {
    txHash: receipt.hash,
    transactionRef,
  };
}

/**
 * Withdraw creator earnings
 */
export async function withdrawEarningsOnBase(): Promise<string> {
  const contract = await getTinglePaymentsContract();
  const tx = await contract.withdrawEarnings();
  const receipt = await tx.wait();
  return receipt.hash;
}

/**
 * Get creator withdrawable balance
 */
export async function getCreatorBalanceOnBase(creatorAddress: string): Promise<string> {
  const contract = await getTinglePaymentsContract();
  const balance = await contract.getWithdrawableBalance(creatorAddress);
  return formatEther(balance);
}

/**
 * Check if contract is paused
 */
export async function isContractPausedOnBase(): Promise<boolean> {
  const contract = await getTinglePaymentsContract();
  return await contract.paused();
}

/**
 * Get testnet ETH from faucet (helper function)
 */
export function getTestnetFaucetUrl(): string {
  return 'https://www.coinbase.com/faucets/base-ethereum-goerli-faucet';
}
