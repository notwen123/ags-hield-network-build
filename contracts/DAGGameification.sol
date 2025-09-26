// SPDX-License-Identifier: MIT
pragma solidity ^0.8.19;

import "@openzeppelin/contracts/access/Ownable.sol";
import "@openzeppelin/contracts/security/ReentrancyGuard.sol";
import "@openzeppelin/contracts/token/ERC20/IERC20.sol";
import "./DAGToken.sol";

contract DAGGameification is Ownable, ReentrancyGuard {
    DAGToken public dagToken;

    struct Challenge {
        uint256 id;
        string name;
        string description;
        uint256 targetValue;
        uint256 rewardAmount;
        uint256 startTime;
        uint256 endTime;
        ChallengeType challengeType;
        bool active;
        uint256 participantCount;
    }

    struct UserStats {
        uint256 threatsDetected;
        uint256 nodeUptime;
        uint256 consensusVotes;
        uint256 challengesCompleted;
        uint256 totalRewards;
        uint256 level;
        uint256 experience;
        uint256 streak;
        uint256 lastActivityTime;
    }

    struct Achievement {
        uint256 id;
        string name;
        string description;
        uint256 rewardAmount;
        AchievementType achievementType;
        uint256 requirement;
        bool active;
    }

    struct Leaderboard {
        address user;
        uint256 score;
        uint256 rank;
    }

    enum ChallengeType {
        THREAT_DETECTION,
        NODE_UPTIME,
        CONSENSUS_PARTICIPATION,
        COMMUNITY_ENGAGEMENT
    }

    enum AchievementType {
        THREATS_DETECTED,
        UPTIME_MILESTONE,
        VOTING_STREAK,
        LEVEL_REACHED,
        REWARDS_EARNED
    }

    // State variables
    mapping(uint256 => Challenge) public challenges;
    mapping(address => UserStats) public userStats;
    mapping(uint256 => Achievement) public achievements;
    mapping(address => mapping(uint256 => bool)) public userChallengeCompleted;
    mapping(address => mapping(uint256 => bool)) public userAchievementUnlocked;
    mapping(address => uint256[]) public userActiveChallenges;
    
    uint256 public nextChallengeId = 1;
    uint256 public nextAchievementId = 1;
    uint256 public constant LEVEL_MULTIPLIER = 1000;
    uint256 public constant STREAK_BONUS_MULTIPLIER = 110; // 10% bonus per streak day
    uint256 public constant MAX_STREAK_BONUS = 200; // 100% max bonus
    
    // Events
    event ChallengeCreated(uint256 indexed challengeId, string name, uint256 rewardAmount);
    event ChallengeCompleted(address indexed user, uint256 indexed challengeId, uint256 reward);
    event AchievementUnlocked(address indexed user, uint256 indexed achievementId, uint256 reward);
    event LevelUp(address indexed user, uint256 newLevel);
    event StreakUpdated(address indexed user, uint256 newStreak);
    event ExperienceGained(address indexed user, uint256 experience);

    constructor(address _dagToken) {
        dagToken = DAGToken(_dagToken);
        _initializeAchievements();
    }

    function _initializeAchievements() internal {
        // Threat Detection Achievements
        _createAchievement("First Blood", "Detect your first threat", 100e18, AchievementType.THREATS_DETECTED, 1);
        _createAchievement("Guardian", "Detect 100 threats", 1000e18, AchievementType.THREATS_DETECTED, 100);
        _createAchievement("Sentinel", "Detect 1000 threats", 10000e18, AchievementType.THREATS_DETECTED, 1000);
        
        // Uptime Achievements
        _createAchievement("Always On", "Maintain 99% uptime for 30 days", 2000e18, AchievementType.UPTIME_MILESTONE, 99);
        _createAchievement("Iron Node", "Maintain 99.9% uptime for 90 days", 5000e18, AchievementType.UPTIME_MILESTONE, 999);
        
        // Level Achievements
        _createAchievement("Rising Star", "Reach level 10", 500e18, AchievementType.LEVEL_REACHED, 10);
        _createAchievement("Elite Guardian", "Reach level 50", 5000e18, AchievementType.LEVEL_REACHED, 50);
        _createAchievement("Legendary Protector", "Reach level 100", 25000e18, AchievementType.LEVEL_REACHED, 100);
    }

    function createChallenge(
        string memory _name,
        string memory _description,
        uint256 _targetValue,
        uint256 _rewardAmount,
        uint256 _duration,
        ChallengeType _challengeType
    ) external onlyOwner {
        challenges[nextChallengeId] = Challenge({
            id: nextChallengeId,
            name: _name,
            description: _description,
            targetValue: _targetValue,
            rewardAmount: _rewardAmount,
            startTime: block.timestamp,
            endTime: block.timestamp + _duration,
            challengeType: _challengeType,
            active: true,
            participantCount: 0
        });

        emit ChallengeCreated(nextChallengeId, _name, _rewardAmount);
        nextChallengeId++;
    }

    function _createAchievement(
        string memory _name,
        string memory _description,
        uint256 _rewardAmount,
        AchievementType _achievementType,
        uint256 _requirement
    ) internal {
        achievements[nextAchievementId] = Achievement({
            id: nextAchievementId,
            name: _name,
            description: _description,
            rewardAmount: _rewardAmount,
            achievementType: _achievementType,
            requirement: _requirement,
            active: true
        });
        nextAchievementId++;
    }

    function updateUserActivity(
        address _user,
        uint256 _threatsDetected,
        uint256 _nodeUptime,
        uint256 _consensusVotes
    ) external onlyOwner {
        UserStats storage stats = userStats[_user];
        
        // Update stats
        stats.threatsDetected += _threatsDetected;
        stats.nodeUptime = _nodeUptime;
        stats.consensusVotes += _consensusVotes;
        
        // Update streak
        _updateStreak(_user);
        
        // Calculate experience gain
        uint256 experienceGain = (_threatsDetected * 10) + (_consensusVotes * 5);
        _addExperience(_user, experienceGain);
        
        // Check for challenge completions
        _checkChallengeCompletions(_user);
        
        // Check for achievement unlocks
        _checkAchievementUnlocks(_user);
        
        stats.lastActivityTime = block.timestamp;
    }

    function _updateStreak(address _user) internal {
        UserStats storage stats = userStats[_user];
        
        if (block.timestamp - stats.lastActivityTime <= 86400) { // 24 hours
            stats.streak++;
        } else if (block.timestamp - stats.lastActivityTime > 172800) { // 48 hours
            stats.streak = 1; // Reset streak but give credit for current activity
        }
        
        emit StreakUpdated(_user, stats.streak);
    }

    function _addExperience(address _user, uint256 _experience) internal {
        UserStats storage stats = userStats[_user];
        
        // Apply streak bonus
        uint256 streakMultiplier = STREAK_BONUS_MULTIPLIER + (stats.streak * 5);
        if (streakMultiplier > MAX_STREAK_BONUS) {
            streakMultiplier = MAX_STREAK_BONUS;
        }
        
        uint256 bonusExperience = (_experience * streakMultiplier) / 100;
        stats.experience += bonusExperience;
        
        // Check for level up
        uint256 newLevel = stats.experience / LEVEL_MULTIPLIER + 1;
        if (newLevel > stats.level) {
            stats.level = newLevel;
            emit LevelUp(_user, newLevel);
            
            // Level up reward
            uint256 levelReward = newLevel * 50e18;
            dagToken.mint(_user, levelReward);
            stats.totalRewards += levelReward;
        }
        
        emit ExperienceGained(_user, bonusExperience);
    }

    function _checkChallengeCompletions(address _user) internal {
        UserStats storage stats = userStats[_user];
        
        for (uint256 i = 1; i < nextChallengeId; i++) {
            Challenge storage challenge = challenges[i];
            
            if (!challenge.active || userChallengeCompleted[_user][i] || block.timestamp > challenge.endTime) {
                continue;
            }
            
            bool completed = false;
            
            if (challenge.challengeType == ChallengeType.THREAT_DETECTION) {
                completed = stats.threatsDetected >= challenge.targetValue;
            } else if (challenge.challengeType == ChallengeType.NODE_UPTIME) {
                completed = stats.nodeUptime >= challenge.targetValue;
            } else if (challenge.challengeType == ChallengeType.CONSENSUS_PARTICIPATION) {
                completed = stats.consensusVotes >= challenge.targetValue;
            }
            
            if (completed) {
                userChallengeCompleted[_user][i] = true;
                stats.challengesCompleted++;
                
                // Award challenge reward
                dagToken.mint(_user, challenge.rewardAmount);
                stats.totalRewards += challenge.rewardAmount;
                
                emit ChallengeCompleted(_user, i, challenge.rewardAmount);
            }
        }
    }

    function _checkAchievementUnlocks(address _user) internal {
        UserStats storage stats = userStats[_user];
        
        for (uint256 i = 1; i < nextAchievementId; i++) {
            Achievement storage achievement = achievements[i];
            
            if (!achievement.active || userAchievementUnlocked[_user][i]) {
                continue;
            }
            
            bool unlocked = false;
            
            if (achievement.achievementType == AchievementType.THREATS_DETECTED) {
                unlocked = stats.threatsDetected >= achievement.requirement;
            } else if (achievement.achievementType == AchievementType.UPTIME_MILESTONE) {
                unlocked = stats.nodeUptime >= achievement.requirement;
            } else if (achievement.achievementType == AchievementType.LEVEL_REACHED) {
                unlocked = stats.level >= achievement.requirement;
            } else if (achievement.achievementType == AchievementType.REWARDS_EARNED) {
                unlocked = stats.totalRewards >= achievement.requirement;
            }
            
            if (unlocked) {
                userAchievementUnlocked[_user][i] = true;
                
                // Award achievement reward
                dagToken.mint(_user, achievement.rewardAmount);
                stats.totalRewards += achievement.rewardAmount;
                
                emit AchievementUnlocked(_user, i, achievement.rewardAmount);
            }
        }
    }

    function joinChallenge(uint256 _challengeId) external {
        Challenge storage challenge = challenges[_challengeId];
        require(challenge.active, "Challenge not active");
        require(block.timestamp <= challenge.endTime, "Challenge ended");
        require(!userChallengeCompleted[msg.sender][_challengeId], "Already completed");
        
        userActiveChallenges[msg.sender].push(_challengeId);
        challenge.participantCount++;
    }

    function getLeaderboard(uint256 _limit) external view returns (Leaderboard[] memory) {
        // This is a simplified implementation
        // In production, you'd want to use a more efficient data structure
        Leaderboard[] memory leaderboard = new Leaderboard[](_limit);
        
        // Implementation would sort users by total rewards or other metrics
        // For brevity, returning empty array
        
        return leaderboard;
    }

    function getUserStats(address _user) external view returns (UserStats memory) {
        return userStats[_user];
    }

    function getActiveChallenge(uint256 _challengeId) external view returns (Challenge memory) {
        return challenges[_challengeId];
    }

    function getUserAchievements(address _user) external view returns (uint256[] memory) {
        uint256[] memory unlockedAchievements = new uint256[](nextAchievementId - 1);
        uint256 count = 0;
        
        for (uint256 i = 1; i < nextAchievementId; i++) {
            if (userAchievementUnlocked[_user][i]) {
                unlockedAchievements[count] = i;
                count++;
            }
        }
        
        // Resize array to actual count
        uint256[] memory result = new uint256[](count);
        for (uint256 i = 0; i < count; i++) {
            result[i] = unlockedAchievements[i];
        }
        
        return result;
    }

    function calculateRewardMultiplier(address _user) external view returns (uint256) {
        UserStats memory stats = userStats[_user];
        
        // Base multiplier of 100% (100)
        uint256 multiplier = 100;
        
        // Level bonus: +1% per level
        multiplier += stats.level;
        
        // Streak bonus: +5% per streak day, max 100%
        uint256 streakBonus = stats.streak * 5;
        if (streakBonus > 100) {
            streakBonus = 100;
        }
        multiplier += streakBonus;
        
        return multiplier;
    }
}
