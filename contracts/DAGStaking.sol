// SPDX-License-Identifier: MIT
pragma solidity ^0.8.19;

import "@openzeppelin/contracts/access/Ownable.sol";
import "@openzeppelin/contracts/security/ReentrancyGuard.sol";
import "@openzeppelin/contracts/token/ERC20/IERC20.sol";
import "@openzeppelin/contracts/token/ERC20/utils/SafeERC20.sol";
import "./DAGToken.sol";

contract DAGStaking is Ownable, ReentrancyGuard {
    using SafeERC20 for IERC20;

    DAGToken public dagToken;

    struct StakingPool {
        uint256 id;
        string name;
        uint256 minStakeAmount;
        uint256 lockPeriod;
        uint256 apy; // Annual Percentage Yield in basis points (10000 = 100%)
        uint256 totalStaked;
        uint256 maxCapacity;
        bool active;
        PoolType poolType;
    }

    struct UserStake {
        uint256 poolId;
        uint256 amount;
        uint256 stakeTime;
        uint256 lastRewardTime;
        uint256 accumulatedRewards;
        bool active;
    }

    struct RewardMultiplier {
        uint256 nodePerformance; // Based on node uptime and performance
        uint256 threatDetection; // Based on threats detected
        uint256 communityParticipation; // Based on governance participation
        uint256 loyaltyBonus; // Based on staking duration
    }

    enum PoolType {
        FLEXIBLE,
        FIXED_30_DAYS,
        FIXED_90_DAYS,
        FIXED_180_DAYS,
        FIXED_365_DAYS,
        NODE_OPERATOR,
        GOVERNANCE
    }

    // State variables
    mapping(uint256 => StakingPool) public stakingPools;
    mapping(address => mapping(uint256 => UserStake)) public userStakes;
    mapping(address => uint256[]) public userStakeIds;
    mapping(address => RewardMultiplier) public rewardMultipliers;
    mapping(address => uint256) public totalUserStaked;
    mapping(address => uint256) public totalUserRewards;
    
    uint256 public nextPoolId = 1;
    uint256 public totalValueLocked;
    uint256 public constant BASIS_POINTS = 10000;
    uint256 public constant SECONDS_PER_YEAR = 365 days;
    
    // Events
    event PoolCreated(uint256 indexed poolId, string name, uint256 apy);
    event Staked(address indexed user, uint256 indexed poolId, uint256 amount);
    event Unstaked(address indexed user, uint256 indexed poolId, uint256 amount);
    event RewardsClaimed(address indexed user, uint256 amount);
    event MultiplierUpdated(address indexed user, uint256 nodePerformance, uint256 threatDetection);

    constructor(address _dagToken) {
        dagToken = DAGToken(_dagToken);
        _initializePools();
    }

    function _initializePools() internal {
        // Flexible staking pool
        _createPool("Flexible Staking", 0, 0, 500, type(uint256).max, PoolType.FLEXIBLE); // 5% APY
        
        // Fixed-term pools with increasing rewards
        _createPool("30-Day Lock", 1000e18, 30 days, 800, type(uint256).max, PoolType.FIXED_30_DAYS); // 8% APY
        _createPool("90-Day Lock", 5000e18, 90 days, 1200, type(uint256).max, PoolType.FIXED_90_DAYS); // 12% APY
        _createPool("180-Day Lock", 10000e18, 180 days, 1800, type(uint256).max, PoolType.FIXED_180_DAYS); // 18% APY
        _createPool("365-Day Lock", 25000e18, 365 days, 2500, type(uint256).max, PoolType.FIXED_365_DAYS); // 25% APY
        
        // Special pools
        _createPool("Node Operator Pool", 50000e18, 90 days, 3000, 10000000e18, PoolType.NODE_OPERATOR); // 30% APY
        _createPool("Governance Pool", 10000e18, 0, 1500, type(uint256).max, PoolType.GOVERNANCE); // 15% APY
    }

    function _createPool(
        string memory _name,
        uint256 _minStakeAmount,
        uint256 _lockPeriod,
        uint256 _apy,
        uint256 _maxCapacity,
        PoolType _poolType
    ) internal {
        stakingPools[nextPoolId] = StakingPool({
            id: nextPoolId,
            name: _name,
            minStakeAmount: _minStakeAmount,
            lockPeriod: _lockPeriod,
            apy: _apy,
            totalStaked: 0,
            maxCapacity: _maxCapacity,
            active: true,
            poolType: _poolType
        });

        emit PoolCreated(nextPoolId, _name, _apy);
        nextPoolId++;
    }

    function stake(uint256 _poolId, uint256 _amount) external nonReentrant {
        StakingPool storage pool = stakingPools[_poolId];
        require(pool.active, "Pool not active");
        require(_amount >= pool.minStakeAmount, "Amount below minimum");
        require(pool.totalStaked + _amount <= pool.maxCapacity, "Pool capacity exceeded");

        // Transfer tokens from user
        dagToken.safeTransferFrom(msg.sender, address(this), _amount);

        // Update user stake
        UserStake storage userStake = userStakes[msg.sender][_poolId];
        
        if (userStake.active) {
            // Claim existing rewards before updating stake
            _claimRewards(msg.sender, _poolId);
            userStake.amount += _amount;
        } else {
            userStake.poolId = _poolId;
            userStake.amount = _amount;
            userStake.stakeTime = block.timestamp;
            userStake.active = true;
            userStakeIds[msg.sender].push(_poolId);
        }
        
        userStake.lastRewardTime = block.timestamp;

        // Update totals
        pool.totalStaked += _amount;
        totalUserStaked[msg.sender] += _amount;
        totalValueLocked += _amount;

        emit Staked(msg.sender, _poolId, _amount);
    }

    function unstake(uint256 _poolId, uint256 _amount) external nonReentrant {
        UserStake storage userStake = userStakes[msg.sender][_poolId];
        StakingPool storage pool = stakingPools[_poolId];
        
        require(userStake.active, "No active stake");
        require(userStake.amount >= _amount, "Insufficient staked amount");
        
        // Check lock period
        if (pool.lockPeriod > 0) {
            require(block.timestamp >= userStake.stakeTime + pool.lockPeriod, "Stake still locked");
        }

        // Claim rewards before unstaking
        _claimRewards(msg.sender, _poolId);

        // Update stake
        userStake.amount -= _amount;
        if (userStake.amount == 0) {
            userStake.active = false;
        }

        // Update totals
        pool.totalStaked -= _amount;
        totalUserStaked[msg.sender] -= _amount;
        totalValueLocked -= _amount;

        // Transfer tokens back to user
        dagToken.safeTransfer(msg.sender, _amount);

        emit Unstaked(msg.sender, _poolId, _amount);
    }

    function claimRewards(uint256 _poolId) external nonReentrant {
        _claimRewards(msg.sender, _poolId);
    }

    function _claimRewards(address _user, uint256 _poolId) internal {
        UserStake storage userStake = userStakes[_user][_poolId];
        require(userStake.active, "No active stake");

        uint256 rewards = calculateRewards(_user, _poolId);
        
        if (rewards > 0) {
            userStake.accumulatedRewards += rewards;
            userStake.lastRewardTime = block.timestamp;
            totalUserRewards[_user] += rewards;

            // Mint reward tokens
            dagToken.mint(_user, rewards);

            emit RewardsClaimed(_user, rewards);
        }
    }

    function calculateRewards(address _user, uint256 _poolId) public view returns (uint256) {
        UserStake memory userStake = userStakes[_user][_poolId];
        StakingPool memory pool = stakingPools[_poolId];
        
        if (!userStake.active || userStake.amount == 0) {
            return 0;
        }

        uint256 stakingDuration = block.timestamp - userStake.lastRewardTime;
        uint256 baseReward = (userStake.amount * pool.apy * stakingDuration) / (BASIS_POINTS * SECONDS_PER_YEAR);

        // Apply multipliers
        uint256 multipliedReward = _applyMultipliers(_user, baseReward);

        return multipliedReward;
    }

    function _applyMultipliers(address _user, uint256 _baseReward) internal view returns (uint256) {
        RewardMultiplier memory multiplier = rewardMultipliers[_user];
        
        uint256 totalMultiplier = BASIS_POINTS; // 100% base
        
        // Add performance-based multipliers
        totalMultiplier += multiplier.nodePerformance; // Up to 50% bonus
        totalMultiplier += multiplier.threatDetection; // Up to 30% bonus
        totalMultiplier += multiplier.communityParticipation; // Up to 20% bonus
        totalMultiplier += multiplier.loyaltyBonus; // Up to 100% bonus for long-term stakers

        return (_baseReward * totalMultiplier) / BASIS_POINTS;
    }

    function updateRewardMultipliers(
        address _user,
        uint256 _nodePerformance,
        uint256 _threatDetection,
        uint256 _communityParticipation,
        uint256 _loyaltyBonus
    ) external onlyOwner {
        // Cap multipliers to prevent abuse
        require(_nodePerformance <= 5000, "Node performance multiplier too high"); // Max 50%
        require(_threatDetection <= 3000, "Threat detection multiplier too high"); // Max 30%
        require(_communityParticipation <= 2000, "Community participation multiplier too high"); // Max 20%
        require(_loyaltyBonus <= 10000, "Loyalty bonus too high"); // Max 100%

        rewardMultipliers[_user] = RewardMultiplier({
            nodePerformance: _nodePerformance,
            threatDetection: _threatDetection,
            communityParticipation: _communityParticipation,
            loyaltyBonus: _loyaltyBonus
        });

        emit MultiplierUpdated(_user, _nodePerformance, _threatDetection);
    }

    function emergencyUnstake(uint256 _poolId) external nonReentrant {
        UserStake storage userStake = userStakes[msg.sender][_poolId];
        StakingPool storage pool = stakingPools[_poolId];
        
        require(userStake.active, "No active stake");
        
        uint256 amount = userStake.amount;
        uint256 penalty = 0;
        
        // Apply early withdrawal penalty for locked pools
        if (pool.lockPeriod > 0 && block.timestamp < userStake.stakeTime + pool.lockPeriod) {
            penalty = (amount * 1000) / BASIS_POINTS; // 10% penalty
            amount -= penalty;
        }

        // Reset stake
        userStake.amount = 0;
        userStake.active = false;

        // Update totals
        pool.totalStaked -= (amount + penalty);
        totalUserStaked[msg.sender] -= (amount + penalty);
        totalValueLocked -= (amount + penalty);

        // Transfer tokens (minus penalty)
        dagToken.safeTransfer(msg.sender, amount);
        
        // Burn penalty tokens
        if (penalty > 0) {
            dagToken.burn(penalty);
        }

        emit Unstaked(msg.sender, _poolId, amount);
    }

    function getPoolInfo(uint256 _poolId) external view returns (StakingPool memory) {
        return stakingPools[_poolId];
    }

    function getUserStakeInfo(address _user, uint256 _poolId) external view returns (UserStake memory) {
        return userStakes[_user][_poolId];
    }

    function getUserStakeIds(address _user) external view returns (uint256[] memory) {
        return userStakeIds[_user];
    }

    function getTotalStaked(address _user) external view returns (uint256) {
        return totalUserStaked[_user];
    }

    function getAPYWithMultipliers(address _user, uint256 _poolId) external view returns (uint256) {
        StakingPool memory pool = stakingPools[_poolId];
        uint256 baseAPY = pool.apy;
        
        RewardMultiplier memory multiplier = rewardMultipliers[_user];
        uint256 totalMultiplier = BASIS_POINTS + multiplier.nodePerformance + 
                                 multiplier.threatDetection + multiplier.communityParticipation + 
                                 multiplier.loyaltyBonus;
        
        return (baseAPY * totalMultiplier) / BASIS_POINTS;
    }
}
