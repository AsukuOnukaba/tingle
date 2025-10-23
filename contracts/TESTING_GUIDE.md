# TinglePayments Security Testing Guide

## Overview

This guide provides step-by-step instructions for testing all security features of the TinglePayments smart contract.

## Prerequisites

- Contract deployed on Base Sepolia testnet
- OKX Wallet with test ETH
- At least 2 test accounts (buyer and creator)
- Access to BaseScan for transaction verification

## Test Scenarios

### 1. Purchase Validation Tests

#### 1.1 Valid Purchase (Happy Path)
```
✓ User sends 0.01 ETH with purchaseContent(creatorAddress, "content-123")
✓ Transaction succeeds
✓ Funds held in escrow
✓ PurchaseRecorded event emitted
✓ totalEscrowHeld increases by 0.01 ETH
```

**Expected Result:** Purchase successful, funds in escrow for 7 days.

#### 1.2 Amount Too Low
```
✗ User sends 0.00001 ETH (below MIN_PURCHASE_AMOUNT)
✗ Transaction reverts with "Amount too low"
```

**Expected Result:** Transaction fails with clear error message.

#### 1.3 Amount Too High
```
✗ User sends 15 ETH (above MAX_PURCHASE_AMOUNT)
✗ Transaction reverts with "Amount too high"
```

**Expected Result:** Transaction fails with clear error message.

#### 1.4 Duplicate Purchase Prevention
```
Step 1: User A purchases content-123 from Creator B (succeeds)
Step 2: User A tries to purchase content-123 from Creator B again
✗ Transaction reverts with "Already purchased this content"
```

**Expected Result:** Second purchase fails due to front-running protection.

#### 1.5 Self-Purchase Prevention
```
✗ Creator tries to purchase their own content
✗ Transaction reverts with "Cannot purchase own content"
```

**Expected Result:** Self-purchase blocked.

#### 1.6 Invalid Creator Address
```
✗ User sends purchase with address(0) as creator
✗ Transaction reverts with "Invalid address"
```

**Expected Result:** Zero address rejected.

### 2. Escrow & Release Tests

#### 2.1 Early Release Attempt
```
Step 1: Purchase made (escrow starts)
Step 2: Immediately try releaseFunds()
✗ Transaction reverts with "Escrow period not ended"
```

**Expected Result:** Cannot release before 7 days.

#### 2.2 Successful Release
```
Step 1: Purchase made
Step 2: Wait 7+ days (or advance time on testnet)
Step 3: Anyone calls releaseFunds(transactionRef)
✓ Transaction succeeds
✓ Funds split 80/20
✓ creatorBalances updated
✓ totalEscrowHeld decreases
✓ FundsReleased event emitted
```

**Expected Result:** Funds released and split correctly.

#### 2.3 Double Release Prevention
```
Step 1: Release funds successfully
Step 2: Try releaseFunds() again with same ref
✗ Transaction reverts with "Not in pending status"
```

**Expected Result:** Cannot release twice.

### 3. Dispute & Refund Tests

#### 3.1 Valid Dispute
```
Step 1: Purchase made
Step 2: Within 7 days, buyer calls raiseDispute(transactionRef)
✓ Transaction succeeds
✓ Status changes to Disputed
✓ DisputeRaised event emitted
```

**Expected Result:** Dispute raised successfully.

#### 3.2 Late Dispute
```
Step 1: Purchase made
Step 2: Wait 8 days
Step 3: Buyer tries raiseDispute()
✗ Transaction reverts with "Dispute period expired"
```

**Expected Result:** Cannot dispute after deadline.

#### 3.3 Non-Buyer Dispute
```
Step 1: User A purchases content
Step 2: User B tries raiseDispute() for that purchase
✗ Transaction reverts with "Only buyer can raise dispute"
```

**Expected Result:** Only buyer can dispute.

#### 3.4 Successful Refund
```
Step 1: Purchase made and disputed
Step 2: Platform calls processRefund(transactionRef)
✓ Transaction succeeds
✓ Full ETH refunded to buyer
✓ totalEscrowHeld decreases
✓ fundsHeld set to false
✓ RefundProcessed event emitted
```

**Expected Result:** Buyer receives full refund.

#### 3.5 Non-Platform Refund
```
✗ Regular user tries processRefund()
✗ Transaction reverts with "Only platform can call this"
```

**Expected Result:** Only platform can process refunds.

#### 3.6 Double Refund Prevention
```
Step 1: Refund processed successfully
Step 2: Try processRefund() again
✗ Transaction reverts with "Funds already distributed"
```

**Expected Result:** Cannot refund twice.

### 4. Withdrawal Tests

#### 4.1 Creator Withdrawal
```
Step 1: Purchase released, creator has earnings
Step 2: Creator calls withdrawEarnings()
✓ Transaction succeeds
✓ ETH sent to creator
✓ creatorBalances[creator] = 0
✓ CreatorWithdrawal event emitted
```

**Expected Result:** Creator receives earnings.

#### 4.2 Empty Withdrawal
```
✗ Creator with 0 balance calls withdrawEarnings()
✗ Transaction reverts with "No balance to withdraw"
```

**Expected Result:** Cannot withdraw with zero balance.

#### 4.3 Platform Withdrawal
```
Step 1: Purchases released, platform has fees
Step 2: Platform wallet calls withdrawEarnings()
✓ Transaction succeeds
✓ Platform receives 20% fees
```

**Expected Result:** Platform collects fees.

### 5. Emergency Pause Tests

#### 5.1 Pause Contract
```
Step 1: Platform calls pause()
✓ Transaction succeeds
✓ paused = true
✓ EmergencyPause event emitted
```

**Expected Result:** Contract paused.

#### 5.2 Operations While Paused
```
Step 1: Contract paused
Step 2: User tries purchaseContent()
✗ Transaction reverts with "Contract is paused"

Step 3: Try releaseFunds()
✗ Transaction reverts with "Contract is paused"

Step 4: Try raiseDispute()
✗ Transaction reverts with "Contract is paused"
```

**Expected Result:** All operations blocked during pause.

#### 5.3 Unpause Contract
```
Step 1: Platform calls unpause()
✓ Transaction succeeds
✓ paused = false
✓ EmergencyUnpause event emitted
Step 2: Operations work normally again
```

**Expected Result:** Contract resumes operations.

#### 5.4 Non-Platform Pause
```
✗ Regular user tries pause()
✗ Transaction reverts with "Only platform can call this"
```

**Expected Result:** Only platform can pause.

### 6. View Function Tests

#### 6.1 Check Previous Purchase
```
Call: hasPurchased(buyerAddress, creatorAddress, contentId)
Returns: true if purchased, false otherwise
```

**Expected Result:** Accurate purchase status.

#### 6.2 Get Withdrawable Balance
```
Call: getWithdrawableBalance(creatorAddress)
Returns: Amount creator can withdraw
```

**Expected Result:** Correct balance amount.

#### 6.3 Get Total Earnings
```
Call: getTotalEarnings(creatorAddress)
Returns: Lifetime earnings
```

**Expected Result:** Accurate lifetime total.

#### 6.4 Contract Balance Check
```
Call: getContractBalance()
Returns: Total ETH in contract
Verify: Should equal totalEscrowHeld + sum of all withdrawable balances
```

**Expected Result:** Accounting is accurate.

### 7. Edge Case Tests

#### 7.1 Reject Direct ETH Send
```
✗ User sends ETH directly to contract address (not via purchaseContent)
✗ Transaction reverts with "Use purchaseContent() to send ETH"
```

**Expected Result:** Direct sends rejected.

#### 7.2 Platform Wallet Update
```
Step 1: Platform calls updatePlatformWallet(newAddress)
✓ Transaction succeeds
✓ platformWallet updated
✓ Old wallet's balance transferred to new wallet
```

**Expected Result:** Platform wallet changed safely.

#### 7.3 Multiple Concurrent Purchases
```
Step 1: User A buys content-1
Step 2: User B buys content-2 (simultaneously)
Step 3: User C buys content-3
✓ All transactions succeed
✓ All funds tracked correctly in escrow
✓ totalEscrowHeld = sum of all purchases
```

**Expected Result:** Handles concurrent transactions.

## Testing Tools

### Remix Testing
```solidity
// In Remix, use "At Address" to interact with deployed contract
1. Deploy contract with platform address
2. Copy contract address
3. Use "At Address" to load contract
4. Test each function manually
```

### Hardhat Testing (Advanced)
```javascript
// Example test file
describe("TinglePayments", function() {
  it("Should prevent duplicate purchases", async function() {
    await contract.purchaseContent(creator.address, "content-1", { value: ethers.parseEther("0.01") });
    
    await expect(
      contract.purchaseContent(creator.address, "content-1", { value: ethers.parseEther("0.01") })
    ).to.be.revertedWith("Already purchased this content");
  });
});
```

### Frontend Testing
```typescript
// Test integration in your app
import { 
  purchaseContentOnChain, 
  checkIfAlreadyPurchased,
  isContractPaused 
} from '@/lib/blockchain';

// Check before purchase
const alreadyPurchased = await checkIfAlreadyPurchased(
  userAddress, 
  creatorAddress, 
  contentId
);

if (alreadyPurchased) {
  showError("You already own this content!");
  return;
}

// Check if contract is paused
const paused = await isContractPaused();
if (paused) {
  showError("Purchases temporarily unavailable");
  return;
}

// Make purchase
const result = await purchaseContentOnChain(
  creatorAddress,
  contentId,
  "0.01"
);
```

## Test Coverage Checklist

Use this checklist to ensure comprehensive testing:

### Purchase Flow
- [ ] Valid purchase with correct amount
- [ ] Purchase below minimum (should fail)
- [ ] Purchase above maximum (should fail)
- [ ] Duplicate purchase (should fail)
- [ ] Self-purchase (should fail)
- [ ] Invalid creator address (should fail)
- [ ] Direct ETH send (should fail)

### Escrow & Release
- [ ] Release before 7 days (should fail)
- [ ] Release after 7 days (should succeed)
- [ ] Double release (should fail)
- [ ] Verify 80/20 split
- [ ] Check balances updated correctly

### Disputes & Refunds
- [ ] Valid dispute within deadline
- [ ] Dispute after deadline (should fail)
- [ ] Non-buyer dispute (should fail)
- [ ] Successful refund to buyer
- [ ] Non-platform refund (should fail)
- [ ] Double refund (should fail)

### Withdrawals
- [ ] Creator withdrawal with balance
- [ ] Withdrawal with zero balance (should fail)
- [ ] Platform fee withdrawal
- [ ] Verify ETH actually sent

### Emergency Controls
- [ ] Platform pause (should succeed)
- [ ] Non-platform pause (should fail)
- [ ] Operations while paused (should fail)
- [ ] Platform unpause (should succeed)
- [ ] Resume operations after unpause

### View Functions
- [ ] hasPurchased returns correct status
- [ ] getWithdrawableBalance is accurate
- [ ] getTotalEarnings is accurate
- [ ] getContractBalance matches escrow + balances

### Edge Cases
- [ ] Multiple concurrent purchases
- [ ] Platform wallet update
- [ ] Gas costs acceptable
- [ ] Events emitted correctly
- [ ] State consistency after all operations

## Monitoring During Testing

Watch for these on BaseScan:

1. **Events**: Verify all events emit with correct parameters
2. **Gas Costs**: Ensure within acceptable limits
3. **State Changes**: Check storage slots update correctly
4. **Error Messages**: Verify clear, helpful error messages
5. **Transaction Status**: All expected failures actually fail

## Post-Testing Verification

After completing all tests:

1. **Check Contract Balance**
   ```
   actualBalance = contract.getContractBalance()
   expectedBalance = totalEscrowHeld + sum(all withdrawable balances)
   assert(actualBalance == expectedBalance)
   ```

2. **Verify No Locked Funds**
   - All purchases either released, refunded, or in valid escrow
   - No orphaned funds

3. **Event Log Review**
   - All significant actions have events
   - Event parameters are correct
   - Timestamp tracking accurate

4. **Security Review**
   - No reentrancy vulnerabilities exploited
   - Access control worked as expected
   - Front-running protection effective
   - Pause mechanism functions correctly

## Testnet Addresses

Base Sepolia:
- Network: Base Sepolia
- RPC: https://sepolia.base.org
- Chain ID: 84532
- Explorer: https://sepolia.basescan.org
- Faucet: https://www.coinbase.com/faucets/base-ethereum-goerli-faucet

## Need Help?

- Check contract comments for function details
- Review SECURITY_IMPROVEMENTS.md for feature explanations
- View events on BaseScan for transaction details
- Use Remix debugger for detailed execution traces

---

**Remember:** Thorough testing on testnet is crucial before mainnet deployment. Don't skip any test scenarios!
