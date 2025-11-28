# Multi-Chain Wallet Integration Guide

## Overview
This platform supports non-custodial multi-chain wallet connections with automatic transaction detection and balance updates.

## Supported Chains
- **Ethereum** (Mainnet)
- **Base Sepolia** (Testnet)
- **Polygon** (Mainnet)
- **BNB Chain** (Mainnet)
- **Solana** (Mainnet)

## Supported Wallets
- **MetaMask** (Browser extension + Mobile app)
- **OKX Wallet** (Browser extension + Mobile app)
- **Phantom** (Solana only - Browser extension + Mobile app)
- **WalletConnect v2** (Coming soon - Universal mobile support)

## Non-Custodial Architecture
**CRITICAL**: This system does NOT store private keys. All transactions are signed by the user's external wallet.

### How it works:
1. User connects their wallet via browser extension or mobile deep link
2. Wallet address is stored in profile (evm_address or solana_address)
3. All transactions are initiated and signed in the user's wallet
4. Blockchain webhooks detect on-chain activity and update balances

## Free-Tier RPC Providers

### EVM Chains (Ethereum, Base, Polygon, BNB)
- **Alchemy Free Tier**: Primary RPC provider
- **Ankr Public RPC**: Fallback provider
- **Chainlist Public RPCs**: Additional fallback

### Solana
- **Helius Free Tier**: Primary RPC provider
- **Triton RPC Free Tier**: Fallback provider

## Webhook Setup (REQUIRED for automatic balance updates)

### For EVM Chains (Alchemy Webhooks)

1. **Create Alchemy Account** (Free Tier)
   - Go to https://www.alchemy.com/
   - Sign up for free account
   - Create apps for each chain (Ethereum, Base Sepolia, Polygon, BNB)

2. **Configure Address Activity Webhooks**
   - In Alchemy dashboard, go to "Webhooks"
   - Create new webhook: "Address Activity"
   - Webhook URL: `https://[your-project-id].supabase.co/functions/v1/alchemy-webhook`
   - Add all user wallet addresses as they register

3. **Secure Your Webhook**
   - Enable webhook signature verification
   - Store Alchemy signing key in Supabase secrets: `ALCHEMY_SIGNING_KEY`

### For Solana (Helius Webhooks)

1. **Create Helius Account** (Free Tier)
   - Go to https://www.helius.dev/
   - Sign up for free account

2. **Configure Webhooks**
   - In Helius dashboard, go to "Webhooks"
   - Create new webhook
   - Webhook URL: `https://[your-project-id].supabase.co/functions/v1/helius-webhook`
   - Transaction types: All
   - Add user Solana addresses as they register

3. **Secure Your Webhook**
   - Store Helius API key in Supabase secrets: `HELIUS_API_KEY`

## Database Schema

### Blockchain Transactions Table
Tracks all on-chain activity:

```sql
blockchain_transactions (
  id UUID,
  user_id UUID,
  chain TEXT, -- ethereum, base, polygon, bnb, solana
  tx_hash TEXT,
  token TEXT, -- ETH, MATIC, BNB, SOL, USDT, etc.
  direction TEXT, -- deposit, withdrawal, internal
  amount NUMERIC,
  status TEXT, -- pending, confirmed, failed
  block_number BIGINT,
  from_address TEXT,
  to_address TEXT,
  gas_used NUMERIC,
  gas_price NUMERIC,
  metadata JSONB,
  created_at TIMESTAMPTZ,
  updated_at TIMESTAMPTZ
)
```

### Profiles Table (Extended)
Stores wallet addresses:

```sql
profiles (
  ...existing columns...
  evm_address TEXT, -- Ethereum-compatible chains
  solana_address TEXT, -- Solana chain
  connected_wallets JSONB -- Array of connected wallets
)
```

## Mobile Wallet Integration

### Deep Links
The platform uses deep links to trigger mobile wallet apps:

**MetaMask (EVM)**:
```
metamask://dapp/[your-domain]/[path]
```

**OKX Wallet (EVM)**:
```
okx://dapp/[your-domain]/[path]
```

**Phantom (Solana)**:
```
phantom://browse/[your-url]
```

### In-App Browser
For best mobile experience, users should:
1. Open their wallet app (MetaMask, OKX, Phantom)
2. Use the built-in browser
3. Navigate to your platform
4. Connect wallet directly

## Security Best Practices

### ✅ DO:
- Always verify webhook signatures
- Use HTTPS for all webhook endpoints
- Rate limit webhook endpoints
- Validate all transaction data before updating balances
- Use idempotency keys to prevent duplicate processing
- Store wallet addresses in lowercase for consistency

### ❌ DON'T:
- Never store private keys or seed phrases
- Never sign transactions server-side
- Never trust client-side balance data without blockchain verification
- Never process webhooks without signature verification

## Testing

### Testnet Faucets
Get free test tokens:

- **Base Sepolia ETH**: https://www.coinbase.com/faucets/base-ethereum-goerli-faucet
- **Polygon Mumbai MATIC**: https://faucet.polygon.technology/
- **Solana SOL**: https://faucet.solana.com/

### Testing Webhooks Locally
Use ngrok to expose local Supabase functions:

```bash
ngrok http 54321
# Use the ngrok URL as your webhook endpoint during development
```

## Production Deployment

### Before Going Live:
1. ✅ Switch from testnet to mainnet chains
2. ✅ Verify all webhook signatures are enabled
3. ✅ Test with small amounts first
4. ✅ Set up monitoring and alerting
5. ✅ Implement transaction retry logic
6. ✅ Add exchange rate API for accurate crypto-to-fiat conversion
7. ✅ Configure rate limiting on webhook endpoints

### Monitoring
Monitor these metrics:
- Webhook delivery success rate
- Transaction processing latency
- Failed transaction retry count
- RPC provider uptime
- Wallet connection success rate

## Exchange Rate Integration (TODO)
For production, integrate a real-time exchange rate API:

**Recommended Services:**
- CoinGecko API (Free tier available)
- CryptoCompare API
- Chainlink Price Feeds (On-chain, most reliable)

## Support & Resources

- MetaMask Docs: https://docs.metamask.io/
- OKX Wallet Docs: https://www.okx.com/web3/build
- Phantom Docs: https://docs.phantom.app/
- Alchemy Docs: https://docs.alchemy.com/
- Helius Docs: https://docs.helius.dev/

## Troubleshooting

### Wallet Not Detected
- Ensure wallet extension is installed and unlocked
- Try refreshing the page
- Check browser console for errors
- Verify wallet is on the correct network

### Mobile Deep Links Not Working
- Ensure wallet app is installed
- Try using in-app browser instead
- Check URL encoding is correct
- Verify deep link format for specific wallet

### Webhooks Not Receiving Events
- Verify webhook URL is accessible publicly
- Check webhook signature validation
- Ensure addresses are registered in webhook config
- Review webhook provider logs for errors

### Balance Not Updating
- Check blockchain transaction is confirmed
- Verify webhook was received (check edge function logs)
- Confirm transaction hash matches in database
- Check credit_wallet_from_chain function succeeded
