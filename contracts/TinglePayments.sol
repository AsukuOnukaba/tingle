// SPDX-License-Identifier: MIT
pragma solidity ^0.8.20;

/**
 * @title TinglePayments
 * @dev Smart contract for handling direct crypto payments with escrow protection
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
 * PAYMENT FLOW:
 * - Users send ETH directly to contract via purchaseContent()
 * - Funds held in escrow for 7 days
 * - After escrow period, funds automatically split 80/20 (creator/platform)
 * - Creators can withdraw their earnings anytime
 * - Buyers can dispute within escrow period for refunds
 *
 * FEATURES:
 * - Direct ETH payment handling
 * - Automatic escrow protection (7-day hold)
 * - 80/20 revenue split (creator/platform)
 * - Dispute resolution with refunds
 * - Secure withdrawals with reentrancy protection
 * - On-chain payment verification
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
     * @dev Purchase premium content by sending ETH directly to contract
     * @param creator Address of the creator/seller
     * @param contentId Unique identifier for the content purchased
     * 
     * User must send exact ETH amount with transaction.
     * Funds are held in escrow for ESCROW_PERIOD before release.
     */
    function purchaseContent(
        address creator,
        string memory contentId
    ) external payable {
        require(creator != address(0), "Invalid creator address");
        require(msg.value > 0, "Must send ETH for purchase");
        require(bytes(contentId).length > 0, "Content ID required");
        
        // Generate unique transaction reference from buyer, creator, contentId, and timestamp
        string memory transactionRef = string(abi.encodePacked(
            "TXN-",
            toHexString(msg.sender),
            "-",
            toHexString(creator),
            "-",
            uint2str(block.timestamp)
        ));
        
        require(purchasesByRef[transactionRef].buyer == address(0), "Duplicate transaction");
        
        // Calculate revenue split
        uint256 creatorAmount = (msg.value * CREATOR_SHARE) / 100;
        uint256 platformAmount = msg.value - creatorAmount;
        
        // Calculate release time (7 days from now)
        uint256 releaseTime = block.timestamp + ESCROW_PERIOD;
        
        // Create purchase record
        Purchase memory purchase = Purchase({
            buyer: msg.sender,
            seller: creator,
            totalAmount: msg.value,
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
            msg.sender,
            creator,
            msg.value,
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
    function processRefund(string memory transactionRef) external onlyPlatform noReentrant {
        Purchase storage purchase = purchasesByRef[transactionRef];
        
        require(purchase.buyer != address(0), "Purchase not found");
        require(purchase.status == EscrowStatus.Disputed, "Not in disputed status");
        
        uint256 refundAmount = purchase.totalAmount;
        address buyer = purchase.buyer;
        
        // Update status first (checks-effects-interactions pattern)
        purchase.status = EscrowStatus.Refunded;
        
        // Send refund to buyer
        (bool success, ) = payable(buyer).call{value: refundAmount}("");
        require(success, "Refund transfer failed");
        
        emit RefundProcessed(transactionRef, buyer, refundAmount);
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
    
    // ============ Helper Functions ============
    
    /**
     * @dev Convert address to hex string
     */
    function toHexString(address addr) internal pure returns (string memory) {
        bytes memory buffer = new bytes(40);
        for (uint256 i = 0; i < 20; i++) {
            bytes1 b = bytes1(uint8(uint256(uint160(addr)) / (2**(8*(19 - i)))));
            buffer[i*2] = toHexChar(uint8(b) / 16);
            buffer[i*2+1] = toHexChar(uint8(b) % 16);
        }
        return string(buffer);
    }
    
    /**
     * @dev Convert byte to hex character
     */
    function toHexChar(uint8 value) internal pure returns (bytes1) {
        if (value < 10) {
            return bytes1(value + 48); // 0-9
        }
        return bytes1(value + 87); // a-f
    }
    
    /**
     * @dev Convert uint to string
     */
    function uint2str(uint256 value) internal pure returns (string memory) {
        if (value == 0) {
            return "0";
        }
        uint256 temp = value;
        uint256 digits;
        while (temp != 0) {
            digits++;
            temp /= 10;
        }
        bytes memory buffer = new bytes(digits);
        while (value != 0) {
            digits -= 1;
            buffer[digits] = bytes1(uint8(48 + uint256(value % 10)));
            value /= 10;
        }
        return string(buffer);
    }
    
    /**
     * @dev Receive ETH payments
     */
    receive() external payable {}
}
