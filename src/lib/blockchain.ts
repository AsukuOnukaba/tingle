import { BrowserProvider, Contract, parseEther } from "ethers";

// Enhanced Contract ABI for direct payment handling
const CONTRACT_ABI = [
  // Purchase function - users send ETH directly
  "function purchaseContent(address creator, string contentId) public payable",
  "function releaseFunds(string transactionRef) public",
  "function raiseDispute(string transactionRef) public",
  "function processRefund(string transactionRef) public",
  "function withdrawEarnings() public",
  "function getWithdrawableBalance(address creator) public view returns (uint256)",
  "function getTotalEarnings(address creator) public view returns (uint256)",
  "function getPurchaseByRef(string transactionRef) public view returns (address buyer, address seller, uint256 totalAmount, uint256 creatorAmount, uint256 platformAmount, string contentId, uint256 timestamp, uint256 releaseTime, uint8 status)",
  "function getPurchaseByContentId(string contentId) public view returns (address buyer, address seller, uint256 totalAmount, uint256 creatorAmount, uint256 platformAmount, uint256 timestamp, uint8 status)",
  "event PurchaseRecorded(address indexed buyer, address indexed seller, uint256 totalAmount, uint256 creatorAmount, uint256 platformAmount, string contentId, string transactionRef, uint256 timestamp)",
  "event FundsReleased(string indexed transactionRef, address indexed creator, uint256 creatorAmount, uint256 platformAmount)",
  "event DisputeRaised(string indexed transactionRef, address indexed buyer, uint256 timestamp)",
  "event RefundProcessed(string indexed transactionRef, address indexed buyer, uint256 amount)",
  "event CreatorWithdrawal(address indexed creator, uint256 amount, uint256 timestamp)"
];

// Replace with your deployed contract address
// Deploy contract to Polygon Mumbai or Ethereum Sepolia testnet
const CONTRACT_ADDRESS = "0x0000000000000000000000000000000000000000"; // TODO: Replace after deployment

export enum EscrowStatus {
  Pending = 0,
  Released = 1,
  Disputed = 2,
  Refunded = 3
}

export interface BlockchainPurchase {
  buyer: string;
  seller: string;
  totalAmount: bigint;
  creatorAmount: bigint;
  platformAmount: bigint;
  timestamp: bigint;
  releaseTime?: bigint;
  status: EscrowStatus;
}

/**
 * Purchase content by sending ETH directly to the smart contract
 * @param creatorAddress - Address of the content creator
 * @param contentId - Unique identifier for the content
 * @param amountInETH - Amount to pay in ETH (e.g., "0.01" for 0.01 ETH)
 * @returns Transaction hash and event data
 */
export const purchaseContentOnChain = async (
  creatorAddress: string,
  contentId: string,
  amountInETH: string
): Promise<{ txHash: string; transactionRef: string }> => {
  if (!window.ethereum) {
    throw new Error("MetaMask not installed");
  }

  try {
    const provider = new BrowserProvider(window.ethereum);
    const signer = await provider.getSigner();
    
    const contract = new Contract(CONTRACT_ADDRESS, CONTRACT_ABI, signer);
    
    // Send ETH with the transaction
    const tx = await contract.purchaseContent(
      creatorAddress,
      contentId,
      { value: parseEther(amountInETH) }
    );
    
    // Wait for transaction confirmation
    const receipt = await tx.wait();
    
    // Extract transaction reference from event
    const purchaseEvent = receipt.logs.find(
      (log: any) => log.fragment?.name === 'PurchaseRecorded'
    );
    
    const transactionRef = purchaseEvent?.args?.transactionRef || '';
    
    return {
      txHash: receipt.hash,
      transactionRef
    };
  } catch (error) {
    console.error("Blockchain purchase error:", error);
    throw error;
  }
};

// Legacy function - kept for backwards compatibility
// Note: This function no longer matches the smart contract
// Use purchaseContentOnChain instead
export const recordPurchaseOnChain = async (
  buyerAddress: string,
  sellerAddress: string,
  amount: number,
  contentId: string,
  transactionRef: string
): Promise<string> => {
  console.warn("recordPurchaseOnChain is deprecated. Use purchaseContentOnChain instead.");
  // Convert to ETH and call new function
  const amountInETH = (amount / 1000).toString(); // Assuming amount is in cents
  const result = await purchaseContentOnChain(sellerAddress, contentId, amountInETH);
  return result.txHash;
};

export const releaseFundsFromEscrow = async (
  transactionRef: string
): Promise<string> => {
  if (!window.ethereum) {
    throw new Error("MetaMask not installed");
  }

  try {
    const provider = new BrowserProvider(window.ethereum);
    const signer = await provider.getSigner();
    
    const contract = new Contract(CONTRACT_ADDRESS, CONTRACT_ABI, signer);
    
    const tx = await contract.releaseFunds(transactionRef);
    await tx.wait();
    
    return tx.hash;
  } catch (error) {
    console.error("Error releasing funds:", error);
    throw error;
  }
};

export const raiseDispute = async (
  transactionRef: string
): Promise<string> => {
  if (!window.ethereum) {
    throw new Error("MetaMask not installed");
  }

  try {
    const provider = new BrowserProvider(window.ethereum);
    const signer = await provider.getSigner();
    
    const contract = new Contract(CONTRACT_ADDRESS, CONTRACT_ABI, signer);
    
    const tx = await contract.raiseDispute(transactionRef);
    await tx.wait();
    
    return tx.hash;
  } catch (error) {
    console.error("Error raising dispute:", error);
    throw error;
  }
};

export const withdrawCreatorEarnings = async (): Promise<string> => {
  if (!window.ethereum) {
    throw new Error("MetaMask not installed");
  }

  try {
    const provider = new BrowserProvider(window.ethereum);
    const signer = await provider.getSigner();
    
    const contract = new Contract(CONTRACT_ADDRESS, CONTRACT_ABI, signer);
    
    const tx = await contract.withdrawEarnings();
    await tx.wait();
    
    return tx.hash;
  } catch (error) {
    console.error("Error withdrawing earnings:", error);
    throw error;
  }
};

export const getCreatorWithdrawableBalance = async (
  creatorAddress: string
): Promise<bigint> => {
  if (!window.ethereum) {
    throw new Error("MetaMask not installed");
  }

  try {
    const provider = new BrowserProvider(window.ethereum);
    const contract = new Contract(CONTRACT_ADDRESS, CONTRACT_ABI, provider);
    
    const balance = await contract.getWithdrawableBalance(creatorAddress);
    return balance;
  } catch (error) {
    console.error("Error fetching withdrawable balance:", error);
    throw error;
  }
};

export const getCreatorTotalEarnings = async (
  creatorAddress: string
): Promise<bigint> => {
  if (!window.ethereum) {
    throw new Error("MetaMask not installed");
  }

  try {
    const provider = new BrowserProvider(window.ethereum);
    const contract = new Contract(CONTRACT_ADDRESS, CONTRACT_ABI, provider);
    
    const earnings = await contract.getTotalEarnings(creatorAddress);
    return earnings;
  } catch (error) {
    console.error("Error fetching total earnings:", error);
    throw error;
  }
};

export const getPurchaseFromChain = async (
  contentId: string
): Promise<BlockchainPurchase | null> => {
  if (!window.ethereum) {
    throw new Error("MetaMask not installed");
  }

  try {
    const provider = new BrowserProvider(window.ethereum);
    const contract = new Contract(CONTRACT_ADDRESS, CONTRACT_ABI, provider);
    
    const [buyer, seller, totalAmount, creatorAmount, platformAmount, timestamp, status] = 
      await contract.getPurchaseByContentId(contentId);
    
    // Check if purchase exists (buyer address won't be zero)
    if (buyer === "0x0000000000000000000000000000000000000000") {
      return null;
    }
    
    return {
      buyer,
      seller,
      totalAmount,
      creatorAmount,
      platformAmount,
      timestamp,
      status
    };
  } catch (error) {
    console.error("Error fetching purchase from chain:", error);
    return null;
  }
};

export const getPurchaseByRef = async (
  transactionRef: string
): Promise<BlockchainPurchase | null> => {
  if (!window.ethereum) {
    throw new Error("MetaMask not installed");
  }

  try {
    const provider = new BrowserProvider(window.ethereum);
    const contract = new Contract(CONTRACT_ADDRESS, CONTRACT_ABI, provider);
    
    const [buyer, seller, totalAmount, creatorAmount, platformAmount, contentId, timestamp, releaseTime, status] = 
      await contract.getPurchaseByRef(transactionRef);
    
    // Check if purchase exists
    if (buyer === "0x0000000000000000000000000000000000000000") {
      return null;
    }
    
    return {
      buyer,
      seller,
      totalAmount,
      creatorAmount,
      platformAmount,
      timestamp,
      releaseTime,
      status
    };
  } catch (error) {
    console.error("Error fetching purchase by ref from chain:", error);
    return null;
  }
};