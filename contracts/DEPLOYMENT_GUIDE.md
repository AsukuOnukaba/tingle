# TinglePayments Smart Contract - Base Testnet Deployment Guide

## Quick Start (5 minutes)

### Step 1: Prepare MetaMask for Base Testnet

1. **Add Base Sepolia Network to MetaMask:**
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
   - Set Environment: `Injected Provider - MetaMask`
   - MetaMask will prompt - select Base Sepolia network
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
   const CONTRACT_ADDRESS = "0xYourDeployedContractAddress"; // Replace this
   ```

2. **Test the Integration:**
   - Connect MetaMask to your app
   - Try a test purchase
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

## Contract Features

### For Buyers:
- ✅ **Escrow Protection**: Funds held for 7 days
- ✅ **Dispute Resolution**: Raise disputes during escrow period
- ✅ **Refunds**: Get refunds for disputed purchases

### For Creators:
- ✅ **80% Revenue Share**: Keep 80% of all sales
- ✅ **On-Chain Earnings**: All earnings recorded transparently
- ✅ **Withdraw Anytime**: Withdraw released funds anytime
- ✅ **View Earnings**: Check total lifetime earnings

### For Platform:
- ✅ **20% Revenue Share**: Automatic platform fee collection
- ✅ **Dispute Management**: Handle disputes fairly
- ✅ **Transaction Records**: All purchases on-chain

## Gas Cost Estimates (Base Network)

- **Deploy Contract**: ~1,500,000 gas (~$0.50 at 0.5 Gwei)
- **Record Purchase**: ~150,000 gas (~$0.05)
- **Release Funds**: ~80,000 gas (~$0.03)
- **Withdraw Earnings**: ~50,000 gas (~$0.02)
- **Raise Dispute**: ~50,000 gas (~$0.02)

*Note: Base network has very low gas fees compared to Ethereum mainnet*

## Security Features

1. **Reentrancy Protection**: Guards against reentrancy attacks
2. **Access Control**: Only platform can record purchases
3. **Checks-Effects-Interactions**: Follows best practices
4. **Input Validation**: Validates all inputs
5. **Event Logging**: All actions emit events for transparency

## Production Deployment Checklist

Before deploying to Base Mainnet:

- [ ] Test thoroughly on Base Sepolia testnet
- [ ] Verify all purchase flows work correctly
- [ ] Test dispute and refund processes
- [ ] Verify creator withdrawals work
- [ ] Audit contract code (consider professional audit)
- [ ] Test with small amounts first
- [ ] Set up monitoring for contract events
- [ ] Document emergency procedures
- [ ] Ensure platform wallet is secure (consider multisig)

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
   - Need ~0.02 ETH for deployment

3. **Follow Same Deployment Steps**
4. **Verify on BaseScan** (mainnet)

## Troubleshooting

### MetaMask Not Connecting
- Ensure Base Sepolia network is added
- Check you have testnet ETH
- Try refreshing Remix page

### Deployment Fails
- Check gas limit (set to 3,000,000 if needed)
- Verify constructor parameter is valid address
- Ensure sufficient ETH balance

### Transaction Reverts
- Check contract address is correct in blockchain.ts
- Verify MetaMask is on Base Sepolia
- Check transaction on BaseScan for error message

## Support Resources

- **Base Docs**: https://docs.base.org
- **Remix Docs**: https://remix-ide.readthedocs.io
- **BaseScan**: https://sepolia.basescan.org
- **Base Discord**: https://discord.gg/buildonbase

## Next Steps

After deployment:

1. ✅ Update `CONTRACT_ADDRESS` in `src/lib/blockchain.ts`
2. ✅ Test with small transactions first
3. ✅ Monitor contract on BaseScan
4. ✅ Set up event listening in your app
5. ✅ Implement proper error handling
6. ✅ Add transaction status UI
7. ✅ Test dispute resolution flow

---

**Need Help?** Check the contract code comments in `TinglePayments.sol` for detailed function documentation.
