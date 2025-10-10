# Smart Contract Deployment Guide

## Prerequisites
1. Choose your blockchain network
2. Get testnet/mainnet tokens for gas fees
3. Install [Hardhat](https://hardhat.org/) or [Remix](https://remix.ethereum.org/)

## Deployment Steps

### Option 1: Using Remix (Recommended for beginners)
1. Go to [Remix IDE](https://remix.ethereum.org/)
2. Create a new file `SubscriptionContract.sol`
3. Copy the contract code from `SubscriptionContract.sol`
4. Compile the contract (Solidity 0.8.20+)
5. Deploy using MetaMask or another wallet
6. Copy the deployed contract address

### Option 2: Using Hardhat
```bash
# Install Hardhat
npm install --save-dev hardhat @nomicfoundation/hardhat-toolbox

# Initialize Hardhat project
npx hardhat init

# Copy SubscriptionContract.sol to contracts/
# Create deployment script
npx hardhat run scripts/deploy.js --network <your-network>
```

## After Deployment

1. **Update Contract Address**
   - Open `src/config/web3Config.ts`
   - Replace the placeholder address with your deployed contract address:
   ```typescript
   export const CONTRACT_ADDRESSES = {
     [mainnet.id]: '0xYourDeployedContractAddress',
     // Add for other networks as needed
   };
   ```

2. **Update WalletConnect Project ID**
   - Go to [WalletConnect Cloud](https://cloud.walletconnect.com)
   - Create a new project
   - Copy the Project ID
   - Update in `src/config/web3Config.ts`:
   ```typescript
   projectId: 'your-walletconnect-project-id'
   ```

3. **Test the Integration**
   - Connect your wallet
   - Try subscribing to a creator
   - Verify the transaction on the blockchain explorer

## Network Recommendations

### For Testing
- **Polygon Mumbai**: Free testnet tokens, fast, low fees
- **Goerli**: Ethereum testnet
- **BSC Testnet**: Binance Smart Chain testnet

### For Production
- **Polygon**: Low fees (~$0.01), fast confirmations
- **BSC**: Very low fees, good for high-volume
- **Arbitrum/Optimism**: Ethereum Layer 2, moderate fees
- **Ethereum Mainnet**: Highest security, highest fees

## Security Considerations
1. Audit the smart contract before mainnet deployment
2. Test thoroughly on testnets first
3. Consider using a multisig wallet for contract ownership
4. Set reasonable platform fees
5. Implement emergency pause functionality if needed

## Gas Estimation
- Deploy: ~500,000 - 700,000 gas
- Subscribe: ~100,000 - 150,000 gas
- Unsubscribe: ~50,000 - 80,000 gas
- Withdraw: ~50,000 - 80,000 gas

Calculate actual costs: `gas_used × gas_price × ETH_price`
