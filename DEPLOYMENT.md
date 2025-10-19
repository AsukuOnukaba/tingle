# Wallet System & Blockchain Integration Deployment Guide

## Overview
This system includes:
- Internal wallet management with Paystack payments
- Blockchain transparency for creator payouts
- MetaMask wallet connection
- Smart contract for recording premium purchases

## 1. Paystack Setup

### Get Your API Keys
1. Sign up at [Paystack](https://paystack.com)
2. Get your **Public Key** and **Secret Key** from Settings > API Keys

### Configure Keys
1. **Public Key**: Replace in `src/components/TopUpModal.tsx` (line 63)
   ```typescript
   key: 'pk_test_your_paystack_public_key', // Replace with your actual key
   ```

2. **Secret Key**: Already configured via Lovable secrets (PAYSTACK_SECRET_KEY)

**Note:** The Paystack public key is currently a placeholder. You must replace it with your actual key for payments to work.

### Create Transfer Recipient
For withdrawals, creators need a Paystack recipient code:
1. Go to Paystack Dashboard > Transfers > Recipients
2. Create recipient with bank details
3. Copy the recipient code (RCP_xxxxxxxxxxxxx)
4. Creators will enter this when withdrawing

## 2. Smart Contract Deployment

### Prerequisites
- [Remix IDE](https://remix.ethereum.org) (easiest option)
- MetaMask wallet with testnet ETH/MATIC

### Deployment Steps

#### Option A: Polygon Mumbai Testnet (Recommended)
1. Get Mumbai MATIC from [Polygon Faucet](https://faucet.polygon.technology/)
2. Open [Remix IDE](https://remix.ethereum.org)
3. Create new file: `PremiumPurchase.sol`
4. Copy contract code from `src/contracts/PremiumPurchase.sol`
5. Compile with Solidity 0.8.19+
6. Deploy:
   - Environment: Injected Provider - MetaMask
   - Network: Polygon Mumbai (Chain ID: 80001)
   - Click "Deploy"
7. Copy deployed contract address

#### Option B: Ethereum Sepolia Testnet
1. Get Sepolia ETH from [Sepolia Faucet](https://sepoliafaucet.com/)
2. Follow same steps as above but select Sepolia network

### Update Contract Address
In `src/lib/blockchain.ts` (line 13):
```typescript
const CONTRACT_ADDRESS = "0xYourDeployedContractAddress"; // Replace this
```

## 3. MetaMask Network Configuration

### For Users
Users need to add the testnet to MetaMask:

#### Polygon Mumbai
- Network Name: Polygon Mumbai
- RPC URL: https://rpc-mumbai.maticvigil.com
- Chain ID: 80001
- Currency Symbol: MATIC
- Block Explorer: https://mumbai.polygonscan.com

#### Ethereum Sepolia
- Network Name: Sepolia
- RPC URL: https://sepolia.infura.io/v3/YOUR-PROJECT-ID
- Chain ID: 11155111
- Currency Symbol: ETH
- Block Explorer: https://sepolia.etherscan.io

## 4. Edge Functions Configuration

Edge functions are automatically deployed. Ensure secrets are set:
- `PAYSTACK_SECRET_KEY` - Already configured

## 5. Database Setup

The migration has already created:
- `user_wallets` table with currency field
- `transactions` table
- `wallet_address` field in creators table
- Wallet management functions

## 6. Testing the System

### Test Top-Up Flow
1. Navigate to `/wallet`
2. Click "Top Up"
3. Enter amount
4. Complete Paystack payment
5. Verify wallet balance updated
6. Check transaction history

### Test Withdrawal Flow (Creators Only)
1. Ensure you're an approved creator
2. Navigate to `/wallet`
3. Click "Withdraw"
4. Enter amount and recipient code
5. Verify deduction with 20% fee
6. Check Paystack dashboard for transfer

### Test Blockchain Recording
1. **Creator Setup:**
   - Login as a creator account
   - Navigate to `/wallet`
   - Click "Connect MetaMask" in the Blockchain Wallet section
   - Approve the connection in MetaMask
   - Your wallet address will be saved

2. **Make a Purchase:**
   - Login as a different user (buyer)
   - Navigate to premium content
   - Click to purchase
   - The system will automatically:
     - Process the payment
     - Record the transaction on blockchain (if creator has wallet connected)
     - Display the blockchain transaction hash
   - Click "View on Blockchain" link to verify on Mumbai PolygonScan

3. **View Transaction History:**
   - Navigate to `/wallet`
   - See transactions with blockchain hash links
   - Click hash to view on blockchain explorer

### Test Creator Dashboard
1. Login as an approved creator
2. Navigate to `/creator-dashboard`
3. Verify stats display:
   - Total uploads
   - Total earnings
   - Premium sales count
   - Wallet balance
   - Pending withdrawals
4. Check sales chart renders correctly

### Test Admin Panel
1. Login as an admin user
2. Navigate to `/admin`
3. Verify you can:
   - View platform statistics
   - Approve/reject creator applications
   - View all transactions
   - See user metrics

## 7. Production Deployment

### Before Going Live
1. **Switch to Paystack Live Keys**
   - Get live keys from Paystack
   - Update public key in TopUpModal
   - Update PAYSTACK_SECRET_KEY secret

2. **Deploy to Mainnet**
   - Deploy contract to Polygon Mainnet or Ethereum Mainnet
   - Update CONTRACT_ADDRESS in blockchain.ts
   - Ensure sufficient ETH/MATIC for gas fees

3. **Update Network References**
   - Change testnet URLs to mainnet URLs
   - Update block explorer links
   - Test with small amounts first

## 8. Important Notes

### TypeScript Types
The project may show TypeScript errors for Supabase table types. These are expected because:
- The Supabase types are auto-generated from the database schema
- Types may be out of sync during development
- The code will work correctly at runtime
- Types will be regenerated when you push changes

To regenerate types manually:
```bash
npx supabase gen types typescript --project-id YOUR_PROJECT_ID > src/integrations/supabase/types.ts
```

### Security
- Never commit private keys or API keys to git
- Always use environment variables for sensitive data
- Implement rate limiting on production
- Add transaction amount limits for safety
- **Blockchain Security:** 
  - Smart contract address must be set in `src/lib/blockchain.ts`
  - Only creators with linked wallets can have blockchain-recorded transactions
  - Buyers must have MetaMask installed for blockchain recording

### Costs
- Paystack: 1.5% + ₦100 per transaction
- Platform fee: 20% on creator withdrawals
- Gas fees: Variable (testnet is free, mainnet costs real money)
- Blockchain transactions require gas fees paid by the buyer

### User Experience
- Provide clear instructions for MetaMask setup
- Show gas cost estimates before blockchain transactions
- Implement proper error handling for failed transactions
- Add transaction status tracking
- Purchase success modal shows blockchain hash for transparency
- Optional blockchain recording - purchase succeeds even if blockchain fails

## Support Resources
- [Paystack Documentation](https://paystack.com/docs)
- [Polygon Documentation](https://docs.polygon.technology/)
- [Ethers.js Documentation](https://docs.ethers.org/)
- [Remix IDE Guide](https://remix-ide.readthedocs.io/)

## 9. Role-Based Access Control

The system implements three user roles:
- **User**: Default role, can purchase content
- **Creator**: Can upload content, view creator dashboard, withdraw funds
- **Admin**: Can manage users, approve creators, view all transactions

### Setting Up Roles
Roles are stored in the `user_roles` table with the `app_role` enum type.

**To make a user an admin:**
```sql
INSERT INTO user_roles (user_id, role) 
VALUES ('USER_ID_HERE', 'admin');
```

**To approve a creator** (automatically grants creator role):
1. Navigate to `/admin` (must be admin)
2. Find pending creator in the table
3. Click the checkmark button to approve

### Access Controls
- Creator Dashboard (`/creator-dashboard`): Only accessible to approved creators
- Admin Panel (`/admin`): Only accessible to users with admin role
- Wallet withdrawals: Only available to creators
- Blockchain wallet connection: Only available to creators

## 10. Troubleshooting

### Paystack Issues
- Verify API keys are correct
- Check webhook configurations
- Ensure recipient codes are valid
- Test with small amounts first

### Blockchain Issues
- **MetaMask Not Installed:** Purchase will succeed but won't be recorded on blockchain
- **Wrong Network:** Switch MetaMask to Polygon Mumbai testnet
- **Contract Not Deployed:** Update CONTRACT_ADDRESS in `src/lib/blockchain.ts`
- **Insufficient Gas:** Ensure buyer has enough MATIC for gas fees
- **Creator Wallet Not Connected:** Blockchain recording only works if creator linked wallet

### Database Issues
- Run linter to check RLS policies
- Verify user has wallet created (automatic on signup)
- Check transaction logs for errors
- Ensure roles are set correctly in `user_roles` table

### Dashboard Access Issues
- **Can't access creator dashboard:** Check if creator status is 'approved'
- **Can't access admin panel:** Verify admin role in `user_roles` table
- **Stats not loading:** Check browser console for RLS policy errors