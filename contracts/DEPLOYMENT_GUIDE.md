# TinglePayments Smart Contract - Base Testnet Deployment Guide

## Quick Start (5 minutes)

### Step 1: Prepare OKX Wallet for Base Testnet

1. **Install OKX Wallet Browser Extension:**
   - Visit [okx.com/web3](https://www.okx.com/web3)
   - Install for your browser
   - Create or import wallet

2. **Add Base Sepolia Network to OKX Wallet:**
   - Network Name: `Base Sepolia`
   - RPC URL: `https://sepolia.base.org`
   - Chain ID: `84532`
   - Currency Symbol: `ETH`
   - Block Explorer: `https://sepolia.basescan.org`

2. **Get Testnet ETH:**
   - Visit: https://www.coinbase.com/faucets/base-ethereum-goerli-faucet
   - Or: https://bridge.base.org (bridge from Sepolia)
   - You need ~0.01 ETH for deployment

### Step 2: Deploy on Remix

1. **Open Remix IDE:**
   - Go to: https://remix.ethereum.org/

2. **Create Contract File:**
   - In File Explorer, create new file: `TinglePayments.sol`
   - Copy entire code from `contracts/TinglePayments.sol`
   - Paste into Remix

3. **Compile:**
   - Click "Solidity Compiler" tab (left sidebar)
   - Select compiler version: `0.8.20` or higher
   - Click "Compile TinglePayments.sol"
   - Should see green checkmark ✓

4. **Deploy:**
   - Click "Deploy & Run Transactions" tab
   - Set Environment: `Injected Provider - OKX Wallet`
   - OKX Wallet will prompt - select Base Sepolia network
   - In "Deploy" section, enter your platform wallet address in constructor field
     - Example: `0xYourPlatformWalletAddress`
   - Click "Deploy" button
   - Confirm transaction in MetaMask
   - Wait 2-5 seconds for confirmation

5. **Copy Contract Address:**
   - After deployment, see contract under "Deployed Contracts"
   - Click copy icon next to contract address
   - Example address: `0x1234567890abcdef1234567890abcdef12345678`

### Step 3: Update Your Application

1. **Update Blockchain Configuration:**
   ```typescript
   // In src/lib/blockchain.ts, line 23:
   const CONTRACT_ADDRESS = ""; // Replace this
   ```

2. **Test the Integration:**
   - Connect OKX Wallet to your app
   - Try a test purchase (send ETH to contract)
   - Verify transaction on BaseScan

### Step 4: Verify Contract (Recommended)

1. **Go to BaseScan:**
   - Visit: `https://sepolia.basescan.org/address/[YOUR_CONTRACT_ADDRESS]`

2. **Verify Contract Code:**
   - Click "Contract" tab
   - Click "Verify and Publish"
   - Select:
     - Compiler: `v0.8.20+commit...`
     - License: `MIT`
   - Paste your contract code
   - Click "Verify and Publish"

## How Payments Work

### Payment Flow:

1. **User Purchases Content:**
   - User calls `purchaseContent(creatorAddress, contentId)` and sends ETH
   - Contract immediately holds funds in escrow
   - Generates unique transaction reference
   - Emits PurchaseRecorded event

2. **Escrow Period (7 Days):**
   - Funds locked in contract
   - Buyer can raise dispute if content not delivered
   - After 7 days, anyone can call `releaseFunds()`

3. **Funds Release:**
   - After escrow period, call `releaseFunds(transactionRef)`
   - Contract splits funds 80/20 (creator/platform)
   - Adds amounts to withdrawable balances
   - Creator can withdraw immediately

4. **Creator Withdrawal:**
   - Creator calls `withdrawEarnings()`
   - Receives all accumulated released funds
   - Secure withdrawal with reentrancy protection

5. **Dispute & Refund (Optional):**
   - Buyer calls `raiseDispute(transactionRef)` within escrow period
   - Platform reviews dispute
   - Platform calls `processRefund(transactionRef)` if approved
   - Full amount returned to buyer

## Contract Features

### For Buyers:
- ✅ **Direct ETH Payments**: Send crypto directly to contract
- ✅ **Escrow Protection**: Funds held for 7 days
- ✅ **Dispute Resolution**: Raise disputes during escrow period
- ✅ **Full Refunds**: Get complete refund for disputed purchases
- ✅ **Transparent**: All transactions on-chain and verifiable

### For Creators:
- ✅ **80% Revenue Share**: Keep 80% of all sales
- ✅ **On-Chain Earnings**: All earnings recorded transparently
- ✅ **Withdraw Anytime**: Withdraw released funds anytime
- ✅ **View Earnings**: Check total lifetime earnings
- ✅ **Automatic Split**: Platform handles revenue distribution

### For Platform:
- ✅ **20% Revenue Share**: Automatic platform fee collection
- ✅ **Dispute Management**: Handle disputes fairly
- ✅ **Transaction Records**: All purchases on-chain
- ✅ **Withdrawal Controls**: Secure fund management

## Gas Cost Estimates (Base Network)

- **Deploy Contract**: ~2,000,000 gas (~$0.60 at 0.5 Gwei)
- **Purchase Content**: ~180,000 gas (~$0.05)
- **Release Funds**: ~80,000 gas (~$0.03)
- **Withdraw Earnings**: ~50,000 gas (~$0.02)
- **Raise Dispute**: ~50,000 gas (~$0.02)
- **Process Refund**: ~60,000 gas (~$0.02)

*Note: Base network has very low gas fees compared to Ethereum mainnet*

## Integration Example

### Frontend Purchase Flow:

```typescript
import { ethers } from 'ethers';

async function purchaseContent(creatorAddress: string, contentId: string, priceInETH: string) {
  const provider = new ethers.BrowserProvider(window.ethereum);
  const signer = await provider.getSigner();
  
  const contract = new ethers.Contract(
    CONTRACT_ADDRESS,
    [
      "function purchaseContent(address creator, string contentId) payable",
      "event PurchaseRecorded(address indexed buyer, address indexed seller, uint256 totalAmount, uint256 creatorAmount, uint256 platformAmount, string contentId, string transactionRef, uint256 timestamp)"
    ],
    signer
  );
  
  // Send ETH with transaction
  const tx = await contract.purchaseContent(
    creatorAddress,
    contentId,
    { value: ethers.parseEther(priceInETH) }
  );
  
  const receipt = await tx.wait();
  
  // Get transaction reference from event
  const event = receipt.logs.find(log => log.eventName === 'PurchaseRecorded');
  const transactionRef = event.args.transactionRef;
  
  return { txHash: receipt.hash, transactionRef };
}
```

### Backend Verification:

```typescript
// Listen for purchase events
contract.on("PurchaseRecorded", (buyer, seller, amount, creatorAmount, platformAmount, contentId, transactionRef, timestamp) => {
  console.log('New purchase:', {
    buyer,
    seller,
    amount: ethers.formatEther(amount),
    contentId,
    transactionRef,
    timestamp: new Date(timestamp * 1000)
  });
  
  // Grant content access in your database
  await grantContentAccess(buyer, contentId, transactionRef);
});
```

## Security Features

1. **Reentrancy Protection**: Guards against reentrancy attacks on withdrawals and refunds
2. **Checks-Effects-Interactions**: Follows best practices for state changes
3. **Access Control**: Only platform can process refunds
4. **Input Validation**: Validates all inputs (addresses, amounts, strings)
5. **Event Logging**: All actions emit events for transparency
6. **Escrow Safety**: Funds locked until dispute period ends
7. **Unique References**: Automatic generation prevents duplicate transactions

## Production Deployment Checklist

Before deploying to Base Mainnet:

- [ ] Test all purchase flows on Base Sepolia testnet
- [ ] Test with various ETH amounts (0.001, 0.01, 0.1 ETH)
- [ ] Verify escrow period timing (7 days)
- [ ] Test dispute and refund processes
- [ ] Verify creator withdrawals work correctly
- [ ] Test platform withdrawal of fees
- [ ] Audit contract code (consider professional audit for production)
- [ ] Set up event monitoring for contract
- [ ] Document emergency procedures
- [ ] Ensure platform wallet is secure (use hardware wallet or multisig)
- [ ] Test gas limits for all functions
- [ ] Verify on BaseScan after deployment

## Base Mainnet Deployment

When ready for production:

1. **Switch to Base Mainnet:**
   - Network Name: `Base`
   - RPC URL: `https://mainnet.base.org`
   - Chain ID: `8453`
   - Currency Symbol: `ETH`
   - Block Explorer: `https://basescan.org`

2. **Get Real ETH:**
   - Bridge ETH from Ethereum mainnet via https://bridge.base.org
   - Need ~0.03 ETH for deployment + gas buffer

3. **Follow Same Deployment Steps**
4. **Verify on BaseScan** (mainnet)
5. **Start with small test transactions**

## Troubleshooting

### OKX Wallet Not Connecting
- Ensure Base Sepolia network is added correctly
- Check you have sufficient testnet ETH
- Try refreshing Remix page
- Clear OKX Wallet activity data if issues persist

### Deployment Fails
- Check gas limit (set to 3,000,000 if needed)
- Verify constructor parameter is valid address (not zero address)
- Ensure sufficient ETH balance for gas
- Check you're on correct network (Base Sepolia)

### Purchase Transaction Reverts
- Verify contract address is correct
- Ensure sending ETH with transaction (`msg.value > 0`)
- Check creator address is valid
- Verify contentId is not empty string
- Check OKX Wallet is on Base Sepolia

### Withdrawal Fails
- Check if funds have been released from escrow
- Verify you have withdrawable balance
- Ensure sufficient gas for transaction

### Dispute/Refund Issues
- Disputes can only be raised during escrow period
- Only buyer can raise dispute
- Only platform wallet can process refunds
- Refunds only work on disputed purchases

## Support Resources

- **Base Docs**: https://docs.base.org
- **Remix Docs**: https://remix-ide.readthedocs.io
- **BaseScan**: https://sepolia.basescan.org
- **Base Discord**: https://discord.gg/buildonbase
- **Ethers.js Docs**: https://docs.ethers.org

## Next Steps

After deployment:

1. ✅ Update `CONTRACT_ADDRESS` in `src/lib/blockchain.ts`
2. ✅ Update contract ABI with `purchaseContent` function
3. ✅ Test with small ETH amounts first (0.001 ETH)
4. ✅ Monitor contract on BaseScan
5. ✅ Set up event listening in your app
6. ✅ Implement proper error handling for all contract calls
7. ✅ Add transaction status UI with escrow countdown
8. ✅ Test complete dispute resolution flow
9. ✅ Set up automated fund release after escrow period
10. ✅ Implement creator earnings dashboard

---

**Security Note:** This contract handles real money. Always test thoroughly on testnet before deploying to mainnet. Consider getting a professional security audit for production deployments.

**Need Help?** Check the contract code comments in `TinglePayments.sol` for detailed function documentation.
