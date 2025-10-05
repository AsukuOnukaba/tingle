// SPDX-License-Identifier: MIT
pragma solidity ^0.8.20;

/**
 * @title SubscriptionContract
 * @dev Smart contract for managing creator subscriptions with crypto payments
 * 
 * Deploy this contract to your chosen blockchain:
 * - Ethereum Mainnet (most secure, higher gas fees)
 * - Polygon (lower gas fees, fast transactions)
 * - BSC (Binance Smart Chain - low fees)
 * - Arbitrum (Layer 2, low fees)
 * - Optimism (Layer 2, low fees)
 * 
 * After deployment, update CONTRACT_ADDRESSES in src/config/web3Config.ts
 */
contract SubscriptionContract {
    struct Subscription {
        uint256 expiresAt;
        bool isActive;
    }

    // Mapping: subscriber => creator => subscription details
    mapping(address => mapping(address => Subscription)) public subscriptions;
    
    // Creator earnings tracking
    mapping(address => uint256) public creatorEarnings;
    
    // Platform fee (2.5% in basis points)
    uint256 public platformFee = 250; // 250 basis points = 2.5%
    uint256 public constant BASIS_POINTS = 10000;
    
    address public owner;
    
    event Subscribed(address indexed subscriber, address indexed creator, uint256 expiresAt, uint256 amount);
    event Unsubscribed(address indexed subscriber, address indexed creator);
    event EarningsWithdrawn(address indexed creator, uint256 amount);
    
    modifier onlyOwner() {
        require(msg.sender == owner, "Only owner can call this");
        _;
    }
    
    constructor() {
        owner = msg.sender;
    }
    
    /**
     * @dev Subscribe to a creator
     * @param creator Address of the creator to subscribe to
     * @param duration Duration of subscription in seconds (e.g., 30 days = 2592000)
     */
    function subscribe(address creator, uint256 duration) external payable {
        require(creator != address(0), "Invalid creator address");
        require(msg.value > 0, "Payment required");
        require(duration > 0, "Duration must be positive");
        
        // Calculate platform fee and creator payment
        uint256 fee = (msg.value * platformFee) / BASIS_POINTS;
        uint256 creatorPayment = msg.value - fee;
        
        // Update subscription
        uint256 expiresAt = block.timestamp + duration;
        subscriptions[msg.sender][creator] = Subscription({
            expiresAt: expiresAt,
            isActive: true
        });
        
        // Update creator earnings
        creatorEarnings[creator] += creatorPayment;
        
        emit Subscribed(msg.sender, creator, expiresAt, msg.value);
    }
    
    /**
     * @dev Unsubscribe from a creator
     * @param creator Address of the creator to unsubscribe from
     */
    function unsubscribe(address creator) external {
        require(subscriptions[msg.sender][creator].isActive, "Not subscribed");
        
        subscriptions[msg.sender][creator].isActive = false;
        
        emit Unsubscribed(msg.sender, creator);
    }
    
    /**
     * @dev Check if a subscriber is currently subscribed to a creator
     */
    function isSubscribed(address subscriber, address creator) external view returns (bool) {
        Subscription memory sub = subscriptions[subscriber][creator];
        return sub.isActive && sub.expiresAt > block.timestamp;
    }
    
    /**
     * @dev Get subscription expiry timestamp
     */
    function getSubscriptionExpiry(address subscriber, address creator) external view returns (uint256) {
        return subscriptions[subscriber][creator].expiresAt;
    }
    
    /**
     * @dev Withdraw earnings (creators only)
     */
    function withdrawEarnings() external {
        uint256 earnings = creatorEarnings[msg.sender];
        require(earnings > 0, "No earnings to withdraw");
        
        creatorEarnings[msg.sender] = 0;
        
        (bool success, ) = payable(msg.sender).call{value: earnings}("");
        require(success, "Transfer failed");
        
        emit EarningsWithdrawn(msg.sender, earnings);
    }
    
    /**
     * @dev Withdraw platform fees (owner only)
     */
    function withdrawPlatformFees() external onlyOwner {
        uint256 balance = address(this).balance;
        require(balance > 0, "No fees to withdraw");
        
        (bool success, ) = payable(owner).call{value: balance}("");
        require(success, "Transfer failed");
    }
    
    /**
     * @dev Update platform fee (owner only)
     */
    function updatePlatformFee(uint256 newFee) external onlyOwner {
        require(newFee <= 1000, "Fee too high"); // Max 10%
        platformFee = newFee;
    }
}
