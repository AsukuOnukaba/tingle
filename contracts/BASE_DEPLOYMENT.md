# Deploy TinglePayments on Base Sepolia Testnet

This guide will help you deploy the TinglePayments smart contract on Base Sepolia testnet using Remix IDE.

## Prerequisites

1. **OKX Wallet or MetaMask** installed in your browser
2. **Base Sepolia Testnet** configured in your wallet
3. **Testnet ETH** for gas fees

## Step 1: Get Base Sepolia Testnet ETH

1. Visit the Base Sepolia faucet: https://www.coinbase.com/faucets/base-ethereum-goerli-faucet
2. Connect your wallet and request test ETH
3. Wait for the transaction to confirm (usually 1-2 minutes)

## Step 2: Add Base Sepolia to Your Wallet

If Base Sepolia is not already in your wallet, add it manually:

- **Network Name**: Base Sepolia
- **RPC URL**: https://sepolia.base.org
- **Chain ID**: 84532
- **Currency Symbol**: ETH
- **Block Explorer**: https://sepolia.basescan.org

## Step 3: Compile the Contract in Remix

1. Open Remix IDE: https://remix.ethereum.org
2. Create a new file: `TinglePayments.sol`
3. Copy the contract code from `contracts/TinglePayments.sol`
4. Go to the "Solidity Compiler" tab
5. Select compiler version `0.8.20` or higher
6. Click "Compile TinglePayments.sol"

## Step 4: Deploy the Contract

1. Go to the "Deploy & Run Transactions" tab
2. In the "Environment" dropdown, select **"Injected Provider - MetaMask"** or **"Injected Provider - OKX"**
3. Confirm your wallet is connected to **Base Sepolia** (chain ID: 84532)
4. In the "Contract" dropdown, select **TinglePayments**
5. Enter the constructor argument:
   - `platformWallet`: Your wallet address that will receive platform fees (e.g., `0x1234...`)
6. Click **"Deploy"**
7. Confirm the transaction in your wallet
8. Wait for deployment to complete

## Step 5: Verify the Deployment

1. After deployment, copy the contract address from Remix
2. Visit BaseScan Sepolia: https://sepolia.basescan.org
3. Search for your contract address
4. Verify the contract was deployed successfully

## Step 6: Update Your Application

1. Open `src/lib/blockchain-base.ts`
2. Replace the `TINGLE_PAYMENTS_ADDRESS` with your deployed contract address:

```typescript
export const TINGLE_PAYMENTS_ADDRESS = '0xYOUR_CONTRACT_ADDRESS_HERE';
```

## Step 7: Verify Contract on BaseScan (Optional)

1. Go to your contract on BaseScan Sepolia
2. Click on the "Contract" tab
3. Click "Verify and Publish"
4. Select:
   - Compiler Type: Solidity (Single file)
   - Compiler Version: Match the version you used in Remix
   - License Type: MIT
5. Paste your contract code
6. Add constructor arguments (ABI-encoded)
7. Click "Verify and Publish"

## Step 8: Test the Contract

Test the contract functions:

### 1. Purchase Content
```javascript
// In your browser console or app
await purchaseContentOnBase(
  '0xCREATOR_ADDRESS',
  'content-id-123',
  '0.01' // Amount in ETH
);
```

### 2. Check Creator Balance
```javascript
const balance = await getCreatorBalanceOnBase('0xCREATOR_ADDRESS');
console.log('Withdrawable balance:', balance, 'ETH');
```

### 3. Withdraw Earnings (as creator)
```javascript
const txHash = await withdrawEarningsOnBase();
console.log('Withdrawal transaction:', txHash);
```

## Troubleshooting

### "Insufficient funds" error
- Make sure you have enough Base Sepolia ETH in your wallet
- Request more from the faucet if needed

### "Wrong network" error
- Confirm you're connected to Base Sepolia (chain ID: 84532)
- Try switching networks in your wallet and back to Base Sepolia

### "Contract deployment failed"
- Check that your wallet has enough ETH for gas
- Verify the constructor argument is a valid Ethereum address
- Try increasing the gas limit in Remix

### Transaction pending too long
- Base Sepolia can sometimes have congestion
- Wait up to 5 minutes for confirmation
- Check the transaction on BaseScan

## Next Steps

1. **Test all contract functions** with small amounts
2. **Monitor transactions** on BaseScan Sepolia
3. **Set up event listeners** in your app to track purchases and withdrawals
4. **Document your contract address** for your team
5. **Consider deploying to Base Mainnet** once testing is complete

## Mainnet Deployment

When ready for production:

1. Get real ETH on Base Mainnet
2. Follow the same steps but select Base Mainnet (chain ID: 8453)
3. Use the Base Mainnet faucet is not available - you'll need to bridge ETH
4. Update `BASE_SEPOLIA_CONFIG` to use mainnet in your code
5. Update the contract address in your application

## Resources

- Base Sepolia Faucet: https://www.coinbase.com/faucets
- Base Sepolia Explorer: https://sepolia.basescan.org
- Remix IDE: https://remix.ethereum.org
- Base Documentation: https://docs.base.org
- Tingle Contract Documentation: See `contracts/INTEGRATION.md`

## Contract Address Registry

After deployment, record your contract addresses:

```
Base Sepolia Testnet:
- TinglePayments: 0x________________

Base Mainnet (Production):
- TinglePayments: 0x________________
```

## Support

If you encounter issues:
1. Check the Remix console for error messages
2. Verify your wallet is on the correct network
3. Ensure you have sufficient testnet ETH
4. Review transaction details on BaseScan
5. Check the contract documentation in `contracts/`
