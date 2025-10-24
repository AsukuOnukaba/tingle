import { base, baseSepolia } from 'viem/chains';
import { createPublicClient, http } from 'viem';
import { normalize } from 'viem/ens';

// Base Testnet configuration
const BASENAME_RESOLVER_ADDRESS = '0x6533C94869D28fAA8dF77cc63f9e2b2D6Cf77eBA'; // Base Sepolia L2 Resolver

/**
 * Get the basename (e.g., user.base.eth) for a wallet address
 */
export async function getBasename(address: string, isTestnet: boolean = true): Promise<string | null> {
  try {
    const chain = isTestnet ? baseSepolia : base;
    
    const publicClient = createPublicClient({
      chain,
      transport: http(),
    });

    // Try to reverse resolve the address to a basename
    const basename = await publicClient.getEnsName({
      address: address as `0x${string}`,
    });

    return basename;
  } catch (error) {
    console.error('Error fetching basename:', error);
    return null;
  }
}

/**
 * Get the wallet address for a basename
 */
export async function resolveBasename(basename: string, isTestnet: boolean = true): Promise<string | null> {
  try {
    const chain = isTestnet ? baseSepolia : base;
    
    const publicClient = createPublicClient({
      chain,
      transport: http(),
    });

    // Normalize the basename
    const normalizedName = normalize(basename);
    
    // Resolve basename to address
    const address = await publicClient.getEnsAddress({
      name: normalizedName,
    });

    return address;
  } catch (error) {
    console.error('Error resolving basename:', error);
    return null;
  }
}

/**
 * Format wallet address for display (shortened version)
 */
export function formatWalletAddress(address: string, basename?: string | null): string {
  if (basename) {
    return basename;
  }
  
  if (!address) return '';
  
  return `${address.substring(0, 6)}...${address.substring(address.length - 4)}`;
}

/**
 * Validate if a string is a valid Ethereum address
 */
export function isValidAddress(address: string): boolean {
  return /^0x[a-fA-F0-9]{40}$/.test(address);
}
