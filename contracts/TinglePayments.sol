// SPDX-License-Identifier: MIT
pragma solidity ^0.8.20;

/**
 * @title TinglePayments
 * @dev Smart contract for Tingle platform payments with escrow protection
 * 
 * DEPLOYMENT INSTRUCTIONS FOR BASE TESTNET (Remix):
 * 1. Go to https://remix.ethereum.org/
 * 2. Create new file: TinglePayments.sol
 * 3. Copy this entire code
 * 4. Compile with Solidity 0.8.20+
 * 5. Connect MetaMask to Base Sepolia Testnet
 *    - Network: Base Sepolia
 *    - RPC: https://sepolia.base.org
 *    - Chain ID: 84532
 *    - Currency: ETH
 *    - Block Explorer: https://sepolia.basescan.org
 * 6. Get testnet ETH from https://www.coinbase.com/faucets/base-ethereum-goerli-faucet
 * 7. Deploy with your platform wallet address as constructor parameter
 * 8. Copy deployed contract address to src/lib/blockchain.ts (line 23)
 * 9. Verify on BaseScan for transparency
 *
 * FEATURES:
 * - Escrow protection (7-day hold period)
 * - Revenue split: 80% creator, 20% platform
 * - Dispute resolution system
 * - Creator earnings withdrawal
 * - Purchase verification on-chain
 * - Reentrancy protection
 */

contract TinglePayments {
    
    // ============ State Variables ============
    
    address public platformWallet;
    
    uint256 public constant CREATOR_SHARE = 80; // 80%
    uint256 public constant PLATFORM_SHARE = 20; // 20%
    uint256 public constant ESCROW_PERIOD = 7 days;
    
    enum EscrowStatus { Pending, Released, Disputed, Refunded }
    
    struct Purchase {
        address buyer;
        address seller;
        uint256 totalAmount;
        uint256 creatorAmount;
        uint256 platformAmount;
        string contentId;
        uint256 timestamp;
        uint256 releaseTime;
        EscrowStatus status;
    }
    
    // Mapping: transactionRef => Purchase
    mapping(string => Purchase) public purchasesByRef;
    
    // Mapping: contentId => transactionRef (for quick lookup)
    mapping(string => string) public contentIdToRef;
    
    // Mapping: creator => withdrawable balance
    mapping(address => uint256) public creatorBalances;
    
    // Mapping: creator => total lifetime earnings
    mapping(address => uint256) public creatorTotalEarnings;
    
    // Track all purchase references for enumeration
    string[] public allPurchaseRefs;
    
    // Reentrancy guard
    bool private locked;
    
    // ============ Events ============
    
    event PurchaseRecorded(
        address indexed buyer,
        address indexed seller,
        uint256 totalAmount,
        uint256 creatorAmount,
        uint256 platformAmount,
        string contentId,
        string transactionRef,
        uint256 timestamp
    );
    
    event FundsReleased(
        string indexed transactionRef,
        address indexed creator,
        uint256 creatorAmount,
        uint256 platformAmount
    );
    
    event DisputeRaised(
        string indexed transactionRef,
        address indexed buyer,
        uint256 timestamp
    );
    
    event RefundProcessed(
        string indexed transactionRef,
        address indexed buyer,
        uint256 amount
    );
    
    event CreatorWithdrawal(
        address indexed creator,
        uint256 amount,
        uint256 timestamp
    );
    
    // ============ Modifiers ============
    
    modifier onlyPlatform() {
        require(msg.sender == platformWallet, "Only platform can call this");
        _;
    }
    
    modifier noReentrant() {
        require(!locked, "No reentrancy");
        locked = true;
        _;
        locked = false;
    }
    
    // ============ Constructor ============
    
    constructor(address _platformWallet) {
        require(_platformWallet != address(0), "Invalid platform wallet");
        platformWallet = _platformWallet;
    }
    
    // ============ Core Functions ============
    
    /**
     * @dev Record a premium content purchase with escrow
     * @param buyer Address of the buyer
     * @param seller Address of the creator/seller
     * @param amount Total purchase amount in wei
     * @param contentId Unique identifier for the content
     * @param transactionRef Unique transaction reference
     */
    function recordPurchase(
        address buyer,
        address seller,
        uint256 amount,
        string memory contentId,
        string memory transactionRef
    ) external onlyPlatform {
        require(buyer != address(0), "Invalid buyer address");
        require(seller != address(0), "Invalid seller address");
        require(amount > 0, "Amount must be positive");
        require(bytes(contentId).length > 0, "Content ID required");
        require(bytes(transactionRef).length > 0, "Transaction ref required");
        require(purchasesByRef[transactionRef].buyer == address(0), "Duplicate transaction ref");
        
        // Calculate revenue split
        uint256 creatorAmount = (amount * CREATOR_SHARE) / 100;
        uint256 platformAmount = amount - creatorAmount;
        
        // Calculate release time (7 days from now)
        uint256 releaseTime = block.timestamp + ESCROW_PERIOD;
        
        // Create purchase record
        Purchase memory purchase = Purchase({
            buyer: buyer,
            seller: seller,
            totalAmount: amount,
            creatorAmount: creatorAmount,
            platformAmount: platformAmount,
            contentId: contentId,
            timestamp: block.timestamp,
            releaseTime: releaseTime,
            status: EscrowStatus.Pending
        });
        
        // Store purchase
        purchasesByRef[transactionRef] = purchase;
        contentIdToRef[contentId] = transactionRef;
        allPurchaseRefs.push(transactionRef);
        
        emit PurchaseRecorded(
            buyer,
            seller,
            amount,
            creatorAmount,
            platformAmount,
            contentId,
            transactionRef,
            block.timestamp
        );
    }
    
    /**
     * @dev Release funds from escrow after the holding period
     * @param transactionRef The transaction reference to release
     */
    function releaseFunds(string memory transactionRef) external {
        Purchase storage purchase = purchasesByRef[transactionRef];
        
        require(purchase.buyer != address(0), "Purchase not found");
        require(purchase.status == EscrowStatus.Pending, "Not in pending status");
        require(block.timestamp >= purchase.releaseTime, "Escrow period not ended");
        
        // Update status
        purchase.status = EscrowStatus.Released;
        
        // Add to creator's withdrawable balance
        creatorBalances[purchase.seller] += purchase.creatorAmount;
        creatorTotalEarnings[purchase.seller] += purchase.creatorAmount;
        
        // Add to platform balance
        creatorBalances[platformWallet] += purchase.platformAmount;
        
        emit FundsReleased(
            transactionRef,
            purchase.seller,
            purchase.creatorAmount,
            purchase.platformAmount
        );
    }
    
    /**
     * @dev Buyer raises a dispute during escrow period
     * @param transactionRef The transaction reference to dispute
     */
    function raiseDispute(string memory transactionRef) external {
        Purchase storage purchase = purchasesByRef[transactionRef];
        
        require(purchase.buyer != address(0), "Purchase not found");
        require(msg.sender == purchase.buyer, "Only buyer can raise dispute");
        require(purchase.status == EscrowStatus.Pending, "Not in pending status");
        require(block.timestamp < purchase.releaseTime, "Escrow period ended");
        
        // Update status
        purchase.status = EscrowStatus.Disputed;
        
        emit DisputeRaised(transactionRef, purchase.buyer, block.timestamp);
    }
    
    /**
     * @dev Platform processes a refund for disputed purchase
     * @param transactionRef The transaction reference to refund
     */
    function processRefund(string memory transactionRef) external onlyPlatform {
        Purchase storage purchase = purchasesByRef[transactionRef];
        
        require(purchase.buyer != address(0), "Purchase not found");
        require(purchase.status == EscrowStatus.Disputed, "Not in disputed status");
        
        // Update status
        purchase.status = EscrowStatus.Refunded;
        
        emit RefundProcessed(transactionRef, purchase.buyer, purchase.totalAmount);
    }
    
    /**
     * @dev Creator withdraws their available earnings
     */
    function withdrawEarnings() external noReentrant {
        uint256 balance = creatorBalances[msg.sender];
        require(balance > 0, "No balance to withdraw");
        
        // Reset balance before transfer (checks-effects-interactions pattern)
        creatorBalances[msg.sender] = 0;
        
        // Transfer funds
        (bool success, ) = payable(msg.sender).call{value: balance}("");
        require(success, "Transfer failed");
        
        emit CreatorWithdrawal(msg.sender, balance, block.timestamp);
    }
    
    // ============ View Functions ============
    
    /**
     * @dev Get withdrawable balance for a creator
     */
    function getWithdrawableBalance(address creator) external view returns (uint256) {
        return creatorBalances[creator];
    }
    
    /**
     * @dev Get total lifetime earnings for a creator
     */
    function getTotalEarnings(address creator) external view returns (uint256) {
        return creatorTotalEarnings[creator];
    }
    
    /**
     * @dev Get total number of recorded purchases
     */
    function getPurchaseCount() external view returns (uint256) {
        return allPurchaseRefs.length;
    }
    
    /**
     * @dev Get purchase details by transaction reference
     */
    function getPurchaseByRef(string memory transactionRef) 
        external 
        view 
        returns (
            address buyer,
            address seller,
            uint256 totalAmount,
            uint256 creatorAmount,
            uint256 platformAmount,
            string memory contentId,
            uint256 timestamp,
            uint256 releaseTime,
            EscrowStatus status
        ) 
    {
        Purchase memory purchase = purchasesByRef[transactionRef];
        return (
            purchase.buyer,
            purchase.seller,
            purchase.totalAmount,
            purchase.creatorAmount,
            purchase.platformAmount,
            purchase.contentId,
            purchase.timestamp,
            purchase.releaseTime,
            purchase.status
        );
    }
    
    /**
     * @dev Get purchase details by content ID
     */
    function getPurchaseByContentId(string memory contentId)
        external
        view
        returns (
            address buyer,
            address seller,
            uint256 totalAmount,
            uint256 creatorAmount,
            uint256 platformAmount,
            uint256 timestamp,
            EscrowStatus status
        )
    {
        string memory transactionRef = contentIdToRef[contentId];
        Purchase memory purchase = purchasesByRef[transactionRef];
        return (
            purchase.buyer,
            purchase.seller,
            purchase.totalAmount,
            purchase.creatorAmount,
            purchase.platformAmount,
            purchase.timestamp,
            purchase.status
        );
    }
    
    // ============ Admin Functions ============
    
    /**
     * @dev Update platform wallet address
     */
    function updatePlatformWallet(address newWallet) external onlyPlatform {
        require(newWallet != address(0), "Invalid address");
        platformWallet = newWallet;
    }
    
    /**
     * @dev Receive ETH payments
     */
    receive() external payable {}
}
