// SPDX-License-Identifier: MIT
pragma solidity ^0.8.19;

/**
 * @title PremiumPurchase
 * @dev Records premium content purchases on blockchain with escrow protection
 * Automatically splits revenue: 80% to creator, 20% to platform
 * Deploy to Polygon Mumbai Testnet or Ethereum Sepolia
 */
contract PremiumPurchase {
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
        string transactionRef;
    }

    Purchase[] public purchases;
    mapping(string => Purchase) public purchaseByContentId;
    mapping(string => uint256) public purchaseIndexByRef;
    mapping(address => uint256) public creatorEarnings;
    mapping(address => uint256) public creatorWithdrawable;
    
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

    constructor(address _platformWallet) {
        require(_platformWallet != address(0), "Invalid platform wallet");
        platformWallet = _platformWallet;
    }

    /**
     * @dev Record a premium purchase with automatic escrow and revenue split
     * @param buyer The buyer's wallet address
     * @param seller The creator's wallet address
     * @param amount The total purchase amount
     * @param contentId The unique content identifier
     * @param transactionRef The Paystack transaction reference
     */
    function recordPurchase(
        address buyer,
        address seller,
        uint256 amount,
        string memory contentId,
        string memory transactionRef
    ) public {
        require(buyer != address(0), "Invalid buyer address");
        require(seller != address(0), "Invalid seller address");
        require(amount > 0, "Amount must be greater than 0");
        require(bytes(transactionRef).length > 0, "Transaction reference required");
        
        // Calculate revenue split
        uint256 creatorAmount = (amount * CREATOR_SHARE) / 100;
        uint256 platformAmount = (amount * PLATFORM_SHARE) / 100;
        
        Purchase memory newPurchase = Purchase({
            buyer: buyer,
            seller: seller,
            totalAmount: amount,
            creatorAmount: creatorAmount,
            platformAmount: platformAmount,
            contentId: contentId,
            timestamp: block.timestamp,
            releaseTime: block.timestamp + ESCROW_PERIOD,
            status: EscrowStatus.Pending,
            transactionRef: transactionRef
        });

        purchases.push(newPurchase);
        purchaseByContentId[contentId] = newPurchase;
        purchaseIndexByRef[transactionRef] = purchases.length - 1;

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
     * @dev Release funds from escrow after the escrow period
     * Can be called by anyone after the release time
     */
    function releaseFunds(string memory transactionRef) public {
        uint256 index = purchaseIndexByRef[transactionRef];
        Purchase storage purchase = purchases[index];
        
        require(purchase.status == EscrowStatus.Pending, "Purchase not in pending state");
        require(block.timestamp >= purchase.releaseTime, "Escrow period not ended");
        
        purchase.status = EscrowStatus.Released;
        
        // Add to creator's withdrawable balance
        creatorWithdrawable[purchase.seller] += purchase.creatorAmount;
        creatorEarnings[purchase.seller] += purchase.creatorAmount;
        
        // Platform amount would be tracked separately
        
        emit FundsReleased(
            transactionRef,
            purchase.seller,
            purchase.creatorAmount,
            purchase.platformAmount
        );
    }

    /**
     * @dev Buyer raises a dispute during escrow period
     */
    function raiseDispute(string memory transactionRef) public {
        uint256 index = purchaseIndexByRef[transactionRef];
        Purchase storage purchase = purchases[index];
        
        require(msg.sender == purchase.buyer, "Only buyer can raise dispute");
        require(purchase.status == EscrowStatus.Pending, "Purchase not in pending state");
        require(block.timestamp < purchase.releaseTime, "Escrow period ended");
        
        purchase.status = EscrowStatus.Disputed;
        
        emit DisputeRaised(transactionRef, msg.sender, block.timestamp);
    }

    /**
     * @dev Process refund (only callable by platform wallet for disputed purchases)
     */
    function processRefund(string memory transactionRef) public {
        require(msg.sender == platformWallet, "Only platform can process refunds");
        
        uint256 index = purchaseIndexByRef[transactionRef];
        Purchase storage purchase = purchases[index];
        
        require(purchase.status == EscrowStatus.Disputed, "Purchase not disputed");
        
        purchase.status = EscrowStatus.Refunded;
        
        emit RefundProcessed(transactionRef, purchase.buyer, purchase.totalAmount);
    }

    /**
     * @dev Creator withdraws their available earnings
     */
    function withdrawEarnings() public {
        uint256 amount = creatorWithdrawable[msg.sender];
        require(amount > 0, "No funds available to withdraw");
        
        creatorWithdrawable[msg.sender] = 0;
        
        emit CreatorWithdrawal(msg.sender, amount, block.timestamp);
        
        // Note: Actual fund transfer would happen off-chain via Paystack
        // This just records the withdrawal intent on blockchain
    }

    /**
     * @dev Get creator's available balance for withdrawal
     */
    function getWithdrawableBalance(address creator) public view returns (uint256) {
        return creatorWithdrawable[creator];
    }

    /**
     * @dev Get creator's total lifetime earnings
     */
    function getTotalEarnings(address creator) public view returns (uint256) {
        return creatorEarnings[creator];
    }

    /**
     * @dev Get total number of purchases
     */
    function getPurchaseCount() public view returns (uint256) {
        return purchases.length;
    }

    /**
     * @dev Get purchase by transaction reference
     */
    function getPurchaseByRef(string memory transactionRef) public view returns (
        address buyer,
        address seller,
        uint256 totalAmount,
        uint256 creatorAmount,
        uint256 platformAmount,
        string memory contentId,
        uint256 timestamp,
        uint256 releaseTime,
        EscrowStatus status
    ) {
        uint256 index = purchaseIndexByRef[transactionRef];
        Purchase memory p = purchases[index];
        return (
            p.buyer,
            p.seller,
            p.totalAmount,
            p.creatorAmount,
            p.platformAmount,
            p.contentId,
            p.timestamp,
            p.releaseTime,
            p.status
        );
    }

    /**
     * @dev Get purchase by content ID
     */
    function getPurchaseByContentId(string memory contentId) public view returns (
        address buyer,
        address seller,
        uint256 totalAmount,
        uint256 creatorAmount,
        uint256 platformAmount,
        uint256 timestamp,
        EscrowStatus status
    ) {
        Purchase memory p = purchaseByContentId[contentId];
        return (
            p.buyer,
            p.seller,
            p.totalAmount,
            p.creatorAmount,
            p.platformAmount,
            p.timestamp,
            p.status
        );
    }

    /**
     * @dev Update platform wallet address (only by current platform wallet)
     */
    function updatePlatformWallet(address newWallet) public {
        require(msg.sender == platformWallet, "Only platform can update");
        require(newWallet != address(0), "Invalid wallet address");
        platformWallet = newWallet;
    }
}