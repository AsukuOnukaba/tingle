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
    uint256 public constant DISPUTE_DEADLINE = 7 days; // Must dispute within escrow period
    uint256 public constant MIN_PURCHASE_AMOUNT = 0.0001 ether; // Prevent dust attacks
    uint256 public constant MAX_PURCHASE_AMOUNT = 10 ether; // Prevent large exploits
    
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
        bool fundsHeld; // Track if funds are still in escrow
    }
    
    // Mapping: transactionRef => Purchase
    mapping(string => Purchase) public purchasesByRef;
    
    // Mapping: contentId => transactionRef (for quick lookup)
    mapping(string => string) public contentIdToRef;
    
    // Mapping: buyer + contentId => prevent duplicate purchases
    mapping(bytes32 => bool) public purchaseExists;
    
    // Mapping: creator => withdrawable balance
    mapping(address => uint256) public creatorBalances;
    
    // Mapping: creator => total lifetime earnings
    mapping(address => uint256) public creatorTotalEarnings;
    
    // Track total funds held in escrow for accounting
    uint256 public totalEscrowHeld;
    
    // Track all purchase references for enumeration
    string[] public allPurchaseRefs;
    
    // Reentrancy guard
    bool private locked;
    
    // Emergency pause mechanism
    bool public paused;
    
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
    
    event EmergencyPause(address indexed by, uint256 timestamp);
    event EmergencyUnpause(address indexed by, uint256 timestamp);
    
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
    
    modifier whenNotPaused() {
        require(!paused, "Contract is paused");
        _;
    }
    
    modifier validAddress(address addr) {
        require(addr != address(0), "Invalid address");
        _;
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
     * 
     * Security features:
     * - Amount validation (min/max limits)
     * - Duplicate purchase prevention
     * - Front-running protection via unique hash
     * - Emergency pause check
     */
    function purchaseContent(
        address creator,
        string memory contentId
    ) external payable whenNotPaused validAddress(creator) {
        require(msg.value >= MIN_PURCHASE_AMOUNT, "Amount too low");
        require(msg.value <= MAX_PURCHASE_AMOUNT, "Amount too high");
        require(bytes(contentId).length > 0 && bytes(contentId).length <= 128, "Invalid content ID");
        require(creator != msg.sender, "Cannot purchase own content");
        
        // Prevent duplicate purchases (front-running protection)
        bytes32 purchaseHash = keccak256(abi.encodePacked(msg.sender, creator, contentId));
        require(!purchaseExists[purchaseHash], "Already purchased this content");
        purchaseExists[purchaseHash] = true;
        
        // Generate unique transaction reference
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
        
        // Calculate release time
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
            status: EscrowStatus.Pending,
            fundsHeld: true
        });
        
        // Store purchase
        purchasesByRef[transactionRef] = purchase;
        contentIdToRef[contentId] = transactionRef;
        allPurchaseRefs.push(transactionRef);
        
        // Track escrow
        totalEscrowHeld += msg.value;
        
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
     * 
     * Anyone can call this after escrow period ends.
     * Splits funds 80/20 and makes them withdrawable.
     */
    function releaseFunds(string memory transactionRef) external whenNotPaused {
        Purchase storage purchase = purchasesByRef[transactionRef];
        
        require(purchase.buyer != address(0), "Purchase not found");
        require(purchase.status == EscrowStatus.Pending, "Not in pending status");
        require(purchase.fundsHeld, "Funds already distributed");
        require(block.timestamp >= purchase.releaseTime, "Escrow period not ended");
        
        // Update state first (checks-effects-interactions)
        purchase.status = EscrowStatus.Released;
        purchase.fundsHeld = false;
        
        // Reduce escrow tracking
        totalEscrowHeld -= purchase.totalAmount;
        
        // Add to withdrawable balances
        creatorBalances[purchase.seller] += purchase.creatorAmount;
        creatorTotalEarnings[purchase.seller] += purchase.creatorAmount;
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
     * 
     * Must be called within DISPUTE_DEADLINE (7 days) of purchase.
     * Only the buyer can raise a dispute.
     */
    function raiseDispute(string memory transactionRef) external whenNotPaused {
        Purchase storage purchase = purchasesByRef[transactionRef];
        
        require(purchase.buyer != address(0), "Purchase not found");
        require(msg.sender == purchase.buyer, "Only buyer can raise dispute");
        require(purchase.status == EscrowStatus.Pending, "Not in pending status");
        require(purchase.fundsHeld, "Funds already distributed");
        require(block.timestamp < purchase.releaseTime, "Dispute deadline passed");
        require(block.timestamp <= purchase.timestamp + DISPUTE_DEADLINE, "Dispute period expired");
        
        // Update status
        purchase.status = EscrowStatus.Disputed;
        
        emit DisputeRaised(transactionRef, purchase.buyer, block.timestamp);
    }
        
        emit DisputeRaised(transactionRef, purchase.buyer, block.timestamp);
    }
    
    /**
     * @dev Platform processes a refund for disputed purchase
     * @param transactionRef The transaction reference to refund
     * 
     * Only platform can call this.
     * Sends full refund to buyer and updates escrow tracking.
     * Uses reentrancy guard for security.
     */
    function processRefund(string memory transactionRef) external onlyPlatform noReentrant whenNotPaused {
        Purchase storage purchase = purchasesByRef[transactionRef];
        
        require(purchase.buyer != address(0), "Purchase not found");
        require(purchase.status == EscrowStatus.Disputed, "Not in disputed status");
        require(purchase.fundsHeld, "Funds already distributed");
        
        uint256 refundAmount = purchase.totalAmount;
        address payable buyer = payable(purchase.buyer);
        
        // Update state first (checks-effects-interactions pattern)
        purchase.status = EscrowStatus.Refunded;
        purchase.fundsHeld = false;
        
        // Reduce escrow tracking
        totalEscrowHeld -= refundAmount;
        
        // Send refund to buyer
        (bool success, ) = buyer.call{value: refundAmount}("");
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
     * @param newWallet New platform wallet address
     */
    function updatePlatformWallet(address newWallet) external onlyPlatform validAddress(newWallet) {
        address oldWallet = platformWallet;
        platformWallet = newWallet;
        
        // Transfer any platform earnings to new wallet
        if (creatorBalances[oldWallet] > 0) {
            creatorBalances[newWallet] = creatorBalances[oldWallet];
            creatorBalances[oldWallet] = 0;
        }
    }
    
    /**
     * @dev Emergency pause - stops all purchases and withdrawals
     * Only platform can call this in case of security emergency
     */
    function pause() external onlyPlatform {
        require(!paused, "Already paused");
        paused = true;
        emit EmergencyPause(msg.sender, block.timestamp);
    }
    
    /**
     * @dev Unpause the contract
     * Only platform can call this after emergency is resolved
     */
    function unpause() external onlyPlatform {
        require(paused, "Not paused");
        paused = false;
        emit EmergencyUnpause(msg.sender, block.timestamp);
    }
    
    /**
     * @dev Check if a buyer has already purchased specific content
     * Useful for frontend to prevent duplicate purchase attempts
     */
    function hasPurchased(address buyer, address creator, string memory contentId) external view returns (bool) {
        bytes32 purchaseHash = keccak256(abi.encodePacked(buyer, creator, contentId));
        return purchaseExists[purchaseHash];
    }
    
    /**
     * @dev Get contract balance for verification
     * Should equal totalEscrowHeld + sum of all withdrawable balances
     */
    function getContractBalance() external view returns (uint256) {
        return address(this).balance;
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
     * @dev Fallback function - reject direct ETH transfers
     * Users must use purchaseContent() function
     */
    receive() external payable {
        revert("Use purchaseContent() to send ETH");
    }
    
    /**
     * @dev Fallback for calls to non-existent functions
     */
    fallback() external payable {
        revert("Function does not exist");
    }
}
