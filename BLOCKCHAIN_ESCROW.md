# Blockchain Escrow & Revenue Split Integration

## Overview
This system integrates blockchain-based escrow protection with the existing Paystack payment system. All transactions are recorded on-chain with automatic 80/20 revenue split and 7-day escrow protection.

## Smart Contract Features

### 1. Automatic Revenue Split
- **80%** goes to content creator
- **20%** platform commission
- Split calculated automatically on-chain

### 2. Escrow Protection
- Funds held for **7 days** after purchase
- Buyers can raise disputes during escrow period
- Automatic release after escrow period expires
- Protection for both buyers and creators

### 3. Transaction Recording
- Every Paystack transaction recorded on blockchain
- Immutable proof of purchase
- Transparent earnings tracking
- Blockchain verification available

## How It Works

### Purchase Flow
1. **User buys content** via Paystack (fiat payment)
2. **Transaction recorded** on blockchain with escrow
3. **Funds enter escrow** for 7 days
4. **After 7 days**: Funds automatically releasable to creator
5. **Creator withdraws** earnings from smart contract

### Escrow Timeline
```
Day 0: Purchase made → Funds in escrow (Pending)
Day 1-6: Dispute window open
Day 7+: Funds releasable → Creator can withdraw
```

### Revenue Split Example
```
Total Purchase: $100
├─ Creator receives: $80 (80%)
└─ Platform commission: $20 (20%)
```

## Deployment Instructions

### 1. Deploy Smart Contract

**Networks:**
- **Polygon Mumbai Testnet** (Recommended for testing)
- **Ethereum Sepolia** (Alternative testnet)
- **Polygon Mainnet** (Production)

**Constructor Parameter:**
- `platformWallet`: Your platform's wallet address for commission

### 2. Update Contract Address

After deployment, update `src/lib/blockchain.ts`:

```typescript
const CONTRACT_ADDRESS = "0xYourDeployedContractAddress";
```

### 3. Test Flow

1. Connect MetaMask to test network
2. Make a test purchase
3. Record on blockchain
4. Verify transaction on block explorer
5. Test dispute and release functions
6. Test creator withdrawal

## Functions

### For Users
- `recordPurchase()` - Records purchase with escrow
- `raiseDispute()` - Raise issue during escrow period
- View purchase status and escrow timeline

### For Creators
- `withdrawEarnings()` - Withdraw released funds
- `getWithdrawableBalance()` - Check available balance
- `getTotalEarnings()` - View lifetime earnings
- View incoming escrow releases

### For Platform
- `releaseFunds()` - Release funds after escrow period (anyone can call)
- `processRefund()` - Handle disputed transactions
- Track platform commission

## Security Features

1. **Escrow Protection**
   - 7-day dispute window
   - Cannot withdraw during escrow
   - Automatic release after period

2. **Dispute Resolution**
   - Buyers can raise disputes
   - Platform reviews disputes
   - Refunds processed when justified

3. **Transparent Tracking**
   - All transactions on-chain
   - Verifiable revenue split
   - Immutable purchase records

## Integration with Existing System

### Paystack Integration
- Paystack handles fiat payment processing
- Smart contract records transaction details
- Both systems work in parallel
- No replacement of existing payment flow

### Database Integration
- Transaction reference stored in blockchain
- Blockchain hash stored in database
- Escrow status tracked in both systems
- Seamless data synchronization

## User Experience

### For Buyers
1. Pay with Paystack (card/bank)
2. Automatic blockchain recording
3. Escrow protection for 7 days
4. Can dispute if needed
5. Access content immediately

### For Creators
1. Receive notifications of purchases
2. Funds enter escrow automatically
3. Wait 7 days for release
4. Withdraw to Paystack account
5. Track earnings on-chain

## Monitoring & Analytics

### On-Chain Data
- Total platform volume
- Creator earnings
- Active escrow amount
- Dispute rates
- Release metrics

### Integration Points
- View escrow status in wallet
- Track blockchain confirmations
- Monitor dispute resolution
- Analyze revenue splits

## Future Enhancements

1. **Multi-Currency Support**
   - Accept crypto payments directly
   - USDT/USDC stablecoin support
   - Automatic conversion

2. **Advanced Escrow**
   - Configurable escrow periods
   - Milestone-based releases
   - Multi-party escrow

3. **Governance**
   - Creator voting rights
   - Platform fee adjustments
   - Dispute resolution voting

## Important Notes

- Deploy to **testnet first** before mainnet
- Test all functions thoroughly
- Keep contract address secure
- Monitor gas costs on mainnet
- Regular security audits recommended
- Backup all contract addresses

## Support

For issues or questions:
1. Check blockchain explorer for transaction status
2. Verify wallet connections
3. Review error messages in console
4. Contact platform support for disputes
