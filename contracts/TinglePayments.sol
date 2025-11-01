// SPDX-License-Identifier: MIT
pragma solidity ^0.8.20;

/*
  TinglePayments  — safer rewrite
  - OpenZeppelin ReentrancyGuard, Ownable, Pausable used
  - bytes32 transactionRefs, purchaseNonce for uniqueness
  - explicit platformBalance
  - contentId -> bytes32[] (multiple purchases supported)
  - purchaseExists keyed by keccak256(abi.encode(...))
*/

import "@openzeppelin/contracts/security/ReentrancyGuard.sol";
import "@openzeppelin/contracts/access/Ownable.sol";
import "@openzeppelin/contracts/security/Pausable.sol";

contract TinglePayments is ReentrancyGuard, Ownable, Pausable {

    // ============ Constants ============
    uint256 public constant CREATOR_SHARE = 80; // 80%
    uint256 public constant PLATFORM_SHARE = 20; // 20%
    uint256 public constant ESCROW_PERIOD = 7 days;
    uint256 public constant DISPUTE_DEADLINE = 7 days;
    uint256 public constant MIN_PURCHASE_AMOUNT = 0.0001 ether;
    uint256 public constant MAX_PURCHASE_AMOUNT = 10 ether;

    // ============ State ============
    address public platformWallet;

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
        bool fundsHeld;
    }

    // Primary storage
    mapping(bytes32 => Purchase) public purchasesByRef;
    mapping(string => bytes32[]) public contentIdToRefs;     // multiple purchases per contentId
    mapping(bytes32 => bool) public purchaseExists;         // dedupe key: keccak256(abi.encode(buyer, seller, contentId))

    mapping(address => uint256) public creatorBalances;
    mapping(address => uint256) public creatorTotalEarnings;

    uint256 public totalEscrowHeld;
    uint256 public platformBalance; // explicit platform funds

    bytes32[] public allPurchaseRefs;
    uint256 public purchaseNonce; // ensures unique refs even in same block/timestamp

    // ============ Events ============
    event PurchaseRecorded(
        bytes32 indexed transactionRef,
        address indexed buyer,
        address indexed seller,
        uint256 totalAmount,
        uint256 creatorAmount,
        uint256 platformAmount,
        string contentId,
        uint256 timestamp
    );

    event FundsReleased(
        bytes32 indexed transactionRef,
        address indexed creator,
        uint256 creatorAmount,
        uint256 platformAmount
    );

    event DisputeRaised(
        bytes32 indexed transactionRef,
        address indexed buyer,
        uint256 timestamp
    );

    event RefundProcessed(
        bytes32 indexed transactionRef,
        address indexed buyer,
        uint256 amount
    );

    event CreatorWithdrawal(
        address indexed creator,
        uint256 amount,
        uint256 timestamp
    );

    event PlatformWithdrawal(
        address indexed platform,
        uint256 amount,
        uint256 timestamp
    );

    event PlatformWalletUpdated(address indexed oldWallet, address indexed newWallet);

    // ============ Modifiers ============
    modifier onlyPlatform() {
        require(msg.sender == platformWallet, "Only platform wallet can call this");
        _;
    }

    modifier validAddress(address addr) {
        require(addr != address(0), "Invalid address");
        _;
    }

    // ============ Constructor ============
    constructor(address _platformWallet) validAddress(_platformWallet) {
        platformWallet = _platformWallet;
        // owner is deployer (Ownable). Owner can change platform wallet later.
    }

    // ============ Core Functions ============

    /**
     * Purchase premium content by sending ETH.
     * Funds held in escrow for ESCROW_PERIOD.
     * Returns the transactionRef for off-chain indexing / frontend.
     */
    function purchaseContent(address creator, string calldata contentId)
        external
        payable
        whenNotPaused
        validAddress(creator)
        returns (bytes32)
    {
        require(msg.value >= MIN_PURCHASE_AMOUNT, "Amount too low");
        require(msg.value <= MAX_PURCHASE_AMOUNT, "Amount too high");
        require(bytes(contentId).length > 0 && bytes(contentId).length <= 128, "Invalid contentId");
        require(creator != msg.sender, "Cannot purchase own content");

        // Deduplication key: buyer + seller + contentId
        bytes32 dedupeKey = keccak256(abi.encode(msg.sender, creator, contentId));
        require(!purchaseExists[dedupeKey], "Already purchased this content");
        purchaseExists[dedupeKey] = true;

        // Unique transaction ref
        bytes32 transactionRef = keccak256(abi.encodePacked(msg.sender, creator, contentId, block.timestamp, block.number, purchaseNonce++));
        require(purchasesByRef[transactionRef].buyer == address(0), "Duplicate transactionRef");

        uint256 creatorAmount = (msg.value * CREATOR_SHARE) / 100;
        uint256 platformAmount = msg.value - creatorAmount;
        uint256 releaseTime = block.timestamp + ESCROW_PERIOD;

        purchasesByRef[transactionRef] = Purchase({
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

        contentIdToRefs[contentId].push(transactionRef);
        allPurchaseRefs.push(transactionRef);
        totalEscrowHeld += msg.value;

        emit PurchaseRecorded(
            transactionRef,
            msg.sender,
            creator,
            msg.value,
            creatorAmount,
            platformAmount,
            contentId,
            block.timestamp
        );

        return transactionRef;
    }

    /**
     * Release funds after escrow period ends.
     * Anyone can call to move funds to withdrawable balances.
     */
    function releaseFunds(bytes32 transactionRef) external whenNotPaused {
        Purchase storage p = purchasesByRef[transactionRef];
        require(p.buyer != address(0), "Purchase not found");
        require(p.status == EscrowStatus.Pending, "Not pending");
        require(p.fundsHeld, "Funds already distributed");
        require(block.timestamp >= p.releaseTime, "Escrow period not ended");

        // State updates first
        p.status = EscrowStatus.Released;
        p.fundsHeld = false;
        totalEscrowHeld -= p.totalAmount;

        creatorBalances[p.seller] += p.creatorAmount;
        creatorTotalEarnings[p.seller] += p.creatorAmount;
        platformBalance += p.platformAmount;

        emit FundsReleased(transactionRef, p.seller, p.creatorAmount, p.platformAmount);
    }

    /**
     * Buyer raises a dispute during escrow period.
     * Only buyer can call.
     */
    function raiseDispute(bytes32 transactionRef) external whenNotPaused {
        Purchase storage p = purchasesByRef[transactionRef];
        require(p.buyer != address(0), "Purchase not found");
        require(msg.sender == p.buyer, "Only buyer can raise dispute");
        require(p.status == EscrowStatus.Pending, "Not pending");
        require(p.fundsHeld, "Funds already distributed");
        require(block.timestamp < p.releaseTime, "Escrow period ended");
        require(block.timestamp <= p.timestamp + DISPUTE_DEADLINE, "Dispute period expired");

        p.status = EscrowStatus.Disputed;
        emit DisputeRaised(transactionRef, p.buyer, block.timestamp);
    }

    /**
     * Platform processes refund for disputed purchase.
     * Only platform wallet can call. Uses nonReentrant.
     */
    function processRefund(bytes32 transactionRef) external onlyPlatform nonReentrant whenNotPaused {
        Purchase storage p = purchasesByRef[transactionRef];
        require(p.buyer != address(0), "Purchase not found");
        require(p.status == EscrowStatus.Disputed, "Not disputed");
        require(p.fundsHeld, "Funds already distributed");

        uint256 refundAmount = p.totalAmount;

        // State updates
        p.status = EscrowStatus.Refunded;
        p.fundsHeld = false;
        totalEscrowHeld -= refundAmount;

        // Transfer refund
        (bool success, ) = payable(p.buyer).call{value: refundAmount}("");
        require(success, "Refund transfer failed");

        emit RefundProcessed(transactionRef, p.buyer, refundAmount);
    }

    /**
     * Creator withdraws accumulated earnings.
     */
    function withdrawEarnings() external nonReentrant whenNotPaused {
        uint256 bal = creatorBalances[msg.sender];
        require(bal > 0, "No balance");

        // Effects
        creatorBalances[msg.sender] = 0;

        // Interaction
        (bool success, ) = payable(msg.sender).call{value: bal}("");
        require(success, "Transfer failed");

        emit CreatorWithdrawal(msg.sender, bal, block.timestamp);
    }

    /**
     * Platform withdraws its accumulated share.
     */
    function withdrawPlatform() external nonReentrant whenNotPaused {
        require(msg.sender == platformWallet, "Only platform wallet");
        uint256 amount = platformBalance;
        require(amount > 0, "No platform balance");

        platformBalance = 0;
        (bool success, ) = payable(platformWallet).call{value: amount}("");
        require(success, "Platform withdraw failed");

        emit PlatformWithdrawal(platformWallet, amount, block.timestamp);
    }

    // ============ Admin / Owner functions ============

    /**
     * Change the platform wallet address.
     * Only owner (deployer) can call this.
     */
    function updatePlatformWallet(address newWallet) external onlyOwner validAddress(newWallet) {
        address old = platformWallet;
        platformWallet = newWallet;
        emit PlatformWalletUpdated(old, newWallet);
    }

    /**
     * Emergency pause / unpause. Owner can also pause.
     */
    function pause() external onlyOwner {
        _pause();
    }

    function unpause() external onlyOwner {
        _unpause();
    }

    // ============ View Helpers ============

    function hasPurchased(address buyer, address creator, string calldata contentId) external view returns (bool) {
        bytes32 dedupeKey = keccak256(abi.encode(buyer, creator, contentId));
        return purchaseExists[dedupeKey];
    }

    function getPurchaseCount() external view returns (uint256) {
        return allPurchaseRefs.length;
    }

    function getPurchaseByRef(bytes32 transactionRef)
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
            EscrowStatus status,
            bool fundsHeld
        )
    {
        Purchase memory p = purchasesByRef[transactionRef];
        return (
            p.buyer,
            p.seller,
            p.totalAmount,
            p.creatorAmount,
            p.platformAmount,
            p.contentId,
            p.timestamp,
            p.releaseTime,
            p.status,
            p.fundsHeld
        );
    }

    function getRefsForContent(string calldata contentId) external view returns (bytes32[] memory) {
        return contentIdToRefs[contentId];
    }

    function getContractBalance() external view returns (uint256) {
        return address(this).balance;
    }

    // ============ Fallbacks ============
    receive() external payable {
        revert("Use purchaseContent()");
    }

    fallback() external payable {
        revert("Function does not exist");
    }
}
