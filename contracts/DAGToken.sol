// SPDX-License-Identifier: MIT
pragma solidity ^0.8.24;

import "@openzeppelin/contracts/token/ERC20/ERC20.sol";
import "@openzeppelin/contracts/token/ERC20/extensions/ERC20Burnable.sol";
import "@openzeppelin/contracts/access/Ownable.sol";
import "@openzeppelin/contracts/utils/ReentrancyGuard.sol";

/**
 * @title DAGToken
 * @dev ERC20 token for the DAGShield ecosystem with staking and burn mechanics
 */
contract DAGToken is ERC20, ERC20Burnable, Ownable, ReentrancyGuard {
    
    // Events
    event Staked(address indexed user, uint256 amount, uint256 duration);
    event Unstaked(address indexed user, uint256 amount, uint256 reward);
    event RewardDistributed(address indexed user, uint256 amount);
    event TokensBurned(uint256 amount, string reason);
    
    // Structs
    struct StakeInfo {
        uint256 amount;
        uint256 startTime;
        uint256 duration; // in seconds
        uint256 rewardRate; // APY percentage
        bool active;
    }
    
    // State variables
    mapping(address => StakeInfo[]) public userStakes;
    mapping(address => uint256) public totalStaked;
    mapping(address => uint256) public pendingRewards;
    
    uint256 public constant MAX_SUPPLY = 1_000_000_000 * 10**18; // 1B tokens
    uint256 public constant INITIAL_SUPPLY = 100_000_000 * 10**18; // 100M tokens
    uint256 public totalStakedAmount;
    uint256 public burnedForSecurity; // Tokens burned for security operations
    
    // Staking parameters
    uint256 public constant MIN_STAKE_AMOUNT = 100 * 10**18; // 100 tokens
    uint256 public constant BASE_APY = 5; // 5% base APY
    uint256 public constant MAX_APY = 25; // 25% max APY for long-term stakes
    
    constructor() ERC20("DAGShield Token", "DAGS") Ownable(msg.sender) {
        _mint(msg.sender, INITIAL_SUPPLY);
    }
    
    /**
     * @dev Stake tokens for rewards
     * @param amount Amount of tokens to stake
     * @param duration Duration of stake in seconds
     */
    function stake(uint256 amount, uint256 duration) external nonReentrant {
        require(amount >= MIN_STAKE_AMOUNT, "Amount below minimum");
        require(duration >= 30 days, "Minimum 30 days staking");
        require(balanceOf(msg.sender) >= amount, "Insufficient balance");
        
        // Calculate reward rate based on duration
        uint256 rewardRate = _calculateRewardRate(duration);
        
        // Transfer tokens to contract
        _transfer(msg.sender, address(this), amount);
        
        // Create stake record
        userStakes[msg.sender].push(StakeInfo({
            amount: amount,
            startTime: block.timestamp,
            duration: duration,
            rewardRate: rewardRate,
            active: true
        }));
        
        totalStaked[msg.sender] += amount;
        totalStakedAmount += amount;
        
        emit Staked(msg.sender, amount, duration);
    }
    
    /**
     * @dev Unstake tokens and claim rewards
     * @param stakeIndex Index of the stake to unstake
     */
    function unstake(uint256 stakeIndex) external nonReentrant {
        require(stakeIndex < userStakes[msg.sender].length, "Invalid stake index");
        
        StakeInfo storage stakeInfo = userStakes[msg.sender][stakeIndex];
        require(stakeInfo.active, "Stake not active");
        require(
            block.timestamp >= stakeInfo.startTime + stakeInfo.duration,
            "Stake period not completed"
        );
        
        uint256 stakedAmount = stakeInfo.amount;
        uint256 reward = _calculateReward(stakeInfo);
        
        // Mark stake as inactive
        stakeInfo.active = false;
        totalStaked[msg.sender] -= stakedAmount;
        totalStakedAmount -= stakedAmount;
        
        // Transfer staked amount back
        _transfer(address(this), msg.sender, stakedAmount);
        
        // Mint and transfer reward
        if (reward > 0 && totalSupply() + reward <= MAX_SUPPLY) {
            _mint(msg.sender, reward);
        }
        
        emit Unstaked(msg.sender, stakedAmount, reward);
    }
    
    /**
     * @dev Emergency unstake with penalty
     * @param stakeIndex Index of the stake to emergency unstake
     */
    function emergencyUnstake(uint256 stakeIndex) external nonReentrant {
        require(stakeIndex < userStakes[msg.sender].length, "Invalid stake index");
        
        StakeInfo storage stakeInfo = userStakes[msg.sender][stakeIndex];
        require(stakeInfo.active, "Stake not active");
        
        uint256 stakedAmount = stakeInfo.amount;
        uint256 penalty = stakedAmount * 10 / 100; // 10% penalty
        uint256 returnAmount = stakedAmount - penalty;
        
        // Mark stake as inactive
        stakeInfo.active = false;
        totalStaked[msg.sender] -= stakedAmount;
        totalStakedAmount -= stakedAmount;
        
        // Transfer reduced amount back
        _transfer(address(this), msg.sender, returnAmount);
        
        // Burn penalty tokens
        _burn(address(this), penalty);
        burnedForSecurity += penalty;
        
        emit TokensBurned(penalty, "Emergency unstake penalty");
    }
    
    /**
     * @dev Distribute rewards to node operators
     * @param recipients Array of recipient addresses
     * @param amounts Array of reward amounts
     */
    function distributeRewards(
        address[] calldata recipients,
        uint256[] calldata amounts
    ) external onlyOwner {
        require(recipients.length == amounts.length, "Arrays length mismatch");
        
        for (uint256 i = 0; i < recipients.length; i++) {
            if (totalSupply() + amounts[i] <= MAX_SUPPLY) {
                _mint(recipients[i], amounts[i]);
                emit RewardDistributed(recipients[i], amounts[i]);
            }
        }
    }
    
    /**
     * @dev Burn tokens for security operations
     * @param amount Amount of tokens to burn
     * @param reason Reason for burning
     */
    function burnForSecurity(uint256 amount, string memory reason) external onlyOwner {
        require(balanceOf(address(this)) >= amount, "Insufficient contract balance");
        
        _burn(address(this), amount);
        burnedForSecurity += amount;
        
        emit TokensBurned(amount, reason);
    }
    
    /**
     * @dev Calculate reward rate based on staking duration
     * @param duration Staking duration in seconds
     */
    function _calculateRewardRate(uint256 duration) internal pure returns (uint256) {
        if (duration >= 365 days) {
            return MAX_APY; // 25% for 1+ year
        } else if (duration >= 180 days) {
            return 15; // 15% for 6+ months
        } else if (duration >= 90 days) {
            return 10; // 10% for 3+ months
        } else {
            return BASE_APY; // 5% for 1+ month
        }
    }
    
    /**
     * @dev Calculate reward for a stake
     * @param stakeInfo Stake information
     */
    function _calculateReward(StakeInfo memory stakeInfo) internal view returns (uint256) {
        uint256 stakingPeriod = block.timestamp - stakeInfo.startTime;
        if (stakingPeriod > stakeInfo.duration) {
            stakingPeriod = stakeInfo.duration;
        }
        
        // Calculate annual reward and prorate for actual staking period
        uint256 annualReward = (stakeInfo.amount * stakeInfo.rewardRate) / 100;
        uint256 reward = (annualReward * stakingPeriod) / 365 days;
        
        return reward;
    }
    
    /**
     * @dev Get user's active stakes
     * @param user Address of the user
     */
    function getUserStakes(address user) external view returns (StakeInfo[] memory) {
        return userStakes[user];
    }
    
    /**
     * @dev Get total rewards available for a user
     * @param user Address of the user
     */
    function getTotalPendingRewards(address user) external view returns (uint256) {
        uint256 totalRewards = 0;
        StakeInfo[] memory stakes = userStakes[user];
        
        for (uint256 i = 0; i < stakes.length; i++) {
            if (stakes[i].active) {
                totalRewards += _calculateReward(stakes[i]);
            }
        }
        
        return totalRewards;
    }
    
    /**
     * @dev Get token statistics
     */
    function getTokenStats() external view returns (
        uint256 _totalSupply,
        uint256 _totalStaked,
        uint256 _burnedForSecurity,
        uint256 _circulatingSupply
    ) {
        return (
            totalSupply(),
            totalStakedAmount,
            burnedForSecurity,
            totalSupply() - totalStakedAmount
        );
    }
}
