// SPDX-License-Identifier: MIT
pragma solidity ^0.8.24;

import "@openzeppelin/contracts/token/ERC20/ERC20.sol";
import "@openzeppelin/contracts/access/Ownable.sol";
import "@openzeppelin/contracts/utils/ReentrancyGuard.sol";
import "@openzeppelin/contracts/utils/Pausable.sol";

/**
 * @title DAGShield Core Contract
 * @dev Main contract for the DAGShield decentralized AI-DePIN security network
 * Handles threat alerts, node management, and cross-chain coordination
 */
contract DAGShield is Ownable, ReentrancyGuard, Pausable {
    
    // Events
    event ThreatDetected(
        bytes32 indexed alertId,
        address indexed reporter,
        uint256 indexed chainId,
        string threatType,
        uint256 confidence,
        uint256 timestamp
    );
    
    event NodeRegistered(
        address indexed nodeAddress,
        string nodeId,
        uint256 stake,
        uint256 timestamp
    );
    
    event NodeSlashed(
        address indexed nodeAddress,
        uint256 slashAmount,
        string reason
    );
    
    event RewardDistributed(
        address indexed recipient,
        uint256 amount,
        string rewardType
    );

    // Structs
    struct ThreatAlert {
        bytes32 id;
        address reporter;
        uint256 chainId;
        string threatType;
        string targetAddress;
        uint256 confidence; // 0-100
        uint256 timestamp;
        bool verified;
        uint256 votes;
    }
    
    struct Node {
        string nodeId;
        address nodeAddress;
        uint256 stake;
        uint256 reputation;
        uint256 totalReports;
        uint256 accurateReports;
        bool active;
        uint256 lastActivity;
        uint256 energyEfficiency; // Energy score 0-100
    }
    
    struct Challenge {
        bytes32 id;
        string challengeType;
        bytes32 expectedResult;
        uint256 reward;
        uint256 deadline;
        bool completed;
        address winner;
    }

    // State variables
    mapping(bytes32 => ThreatAlert) public threats;
    mapping(address => Node) public nodes;
    mapping(bytes32 => Challenge) public challenges;
    mapping(address => uint256) public nodeStakes;
    mapping(address => uint256) public reputationScores;
    mapping(bytes32 => mapping(address => bool)) public hasVoted;
    
    bytes32[] public threatIds;
    address[] public activeNodes;
    bytes32[] public activeChallenges;
    
    // Configuration
    uint256 public constant MIN_STAKE = 100 * 10**18; // 100 tokens
    uint256 public constant MIN_CONFIDENCE = 70; // 70% confidence threshold
    uint256 public constant SLASH_PERCENTAGE = 10; // 10% slash for false reports
    uint256 public constant REWARD_MULTIPLIER = 150; // 1.5x reward for accurate reports
    uint256 public constant CHALLENGE_DURATION = 1 hours;
    
    address public tokenContract;
    uint256 public totalStaked;
    uint256 public totalThreats;
    uint256 public verifiedThreats;
    
    constructor(address _tokenContract) Ownable(msg.sender) {
        tokenContract = _tokenContract;
    }
    
    /**
     * @dev Register a new node in the DAGShield network
     * @param nodeId Unique identifier for the node
     */
    function registerNode(string memory nodeId) external payable nonReentrant {
        require(bytes(nodeId).length > 0, "Invalid node ID");
        require(msg.value >= MIN_STAKE, "Insufficient stake");
        require(!nodes[msg.sender].active, "Node already registered");
        
        nodes[msg.sender] = Node({
            nodeId: nodeId,
            nodeAddress: msg.sender,
            stake: msg.value,
            reputation: 100, // Starting reputation
            totalReports: 0,
            accurateReports: 0,
            active: true,
            lastActivity: block.timestamp,
            energyEfficiency: 50 // Starting efficiency score
        });
        
        nodeStakes[msg.sender] = msg.value;
        totalStaked += msg.value;
        activeNodes.push(msg.sender);
        
        emit NodeRegistered(msg.sender, nodeId, msg.value, block.timestamp);
    }
    
    /**
     * @dev Report a threat detected by AI analysis
     * @param threatType Type of threat (phishing, scam, exploit, etc.)
     * @param targetAddress Address or transaction being reported
     * @param confidence AI confidence score (0-100)
     * @param chainId Chain where threat was detected
     */
    function reportThreat(
        string memory threatType,
        string memory targetAddress,
        uint256 confidence,
        uint256 chainId
    ) external nonReentrant whenNotPaused {
        require(nodes[msg.sender].active, "Node not registered");
        require(confidence >= MIN_CONFIDENCE, "Confidence too low");
        require(bytes(threatType).length > 0, "Invalid threat type");
        
        bytes32 alertId = keccak256(abi.encodePacked(
            msg.sender,
            targetAddress,
            threatType,
            block.timestamp,
            chainId
        ));
        
        threats[alertId] = ThreatAlert({
            id: alertId,
            reporter: msg.sender,
            chainId: chainId,
            threatType: threatType,
            targetAddress: targetAddress,
            confidence: confidence,
            timestamp: block.timestamp,
            verified: false,
            votes: 0
        });
        
        threatIds.push(alertId);
        totalThreats++;
        
        // Update node activity
        nodes[msg.sender].totalReports++;
        nodes[msg.sender].lastActivity = block.timestamp;
        
        emit ThreatDetected(
            alertId,
            msg.sender,
            chainId,
            threatType,
            confidence,
            block.timestamp
        );
    }
    
    /**
     * @dev Vote on a threat alert for community verification
     * @param alertId ID of the threat alert
     * @param support True if supporting the alert, false if disputing
     */
    function voteOnThreat(bytes32 alertId, bool support) external nonReentrant {
        require(nodes[msg.sender].active, "Node not registered");
        require(threats[alertId].id != bytes32(0), "Alert does not exist");
        require(!hasVoted[alertId][msg.sender], "Already voted");
        require(threats[alertId].reporter != msg.sender, "Cannot vote on own report");
        
        hasVoted[alertId][msg.sender] = true;
        
        if (support) {
            threats[alertId].votes++;
        }
        
        // Auto-verify if enough votes (simplified for MVP)
        if (threats[alertId].votes >= 3 && !threats[alertId].verified) {
            threats[alertId].verified = true;
            verifiedThreats++;
            
            // Reward the reporter
            _distributeReward(threats[alertId].reporter, "threat_detection");
            nodes[threats[alertId].reporter].accurateReports++;
            nodes[threats[alertId].reporter].reputation += 5;
        }
    }
    
    /**
     * @dev Create a gamified challenge for nodes
     * @param challengeType Type of challenge
     * @param expectedResult Expected result hash
     * @param reward Reward amount for completion
     */
    function createChallenge(
        string memory challengeType,
        bytes32 expectedResult,
        uint256 reward
    ) external onlyOwner {
        bytes32 challengeId = keccak256(abi.encodePacked(
            challengeType,
            expectedResult,
            block.timestamp
        ));
        
        challenges[challengeId] = Challenge({
            id: challengeId,
            challengeType: challengeType,
            expectedResult: expectedResult,
            reward: reward,
            deadline: block.timestamp + CHALLENGE_DURATION,
            completed: false,
            winner: address(0)
        });
        
        activeChallenges.push(challengeId);
    }
    
    /**
     * @dev Submit solution to a challenge
     * @param challengeId ID of the challenge
     * @param solution Solution hash
     */
    function submitChallengeSolution(
        bytes32 challengeId,
        bytes32 solution
    ) external nonReentrant {
        require(nodes[msg.sender].active, "Node not registered");
        require(challenges[challengeId].id != bytes32(0), "Challenge does not exist");
        require(!challenges[challengeId].completed, "Challenge already completed");
        require(block.timestamp <= challenges[challengeId].deadline, "Challenge expired");
        
        if (solution == challenges[challengeId].expectedResult) {
            challenges[challengeId].completed = true;
            challenges[challengeId].winner = msg.sender;
            
            _distributeReward(msg.sender, "challenge_completion");
            nodes[msg.sender].reputation += 10;
        }
    }
    
    /**
     * @dev Update node energy efficiency score
     * @param nodeAddress Address of the node
     * @param efficiencyScore New efficiency score (0-100)
     */
    function updateEnergyEfficiency(
        address nodeAddress,
        uint256 efficiencyScore
    ) external onlyOwner {
        require(nodes[nodeAddress].active, "Node not registered");
        require(efficiencyScore <= 100, "Invalid efficiency score");
        
        nodes[nodeAddress].energyEfficiency = efficiencyScore;
        
        // Bonus reputation for high efficiency
        if (efficiencyScore >= 80) {
            nodes[nodeAddress].reputation += 2;
        }
    }
    
    /**
     * @dev Slash a node for false reporting or malicious behavior
     * @param nodeAddress Address of the node to slash
     * @param reason Reason for slashing
     */
    function slashNode(address nodeAddress, string memory reason) external onlyOwner {
        require(nodes[nodeAddress].active, "Node not registered");
        
        uint256 slashAmount = (nodeStakes[nodeAddress] * SLASH_PERCENTAGE) / 100;
        nodeStakes[nodeAddress] -= slashAmount;
        totalStaked -= slashAmount;
        
        nodes[nodeAddress].reputation = nodes[nodeAddress].reputation > 20 
            ? nodes[nodeAddress].reputation - 20 
            : 0;
        
        emit NodeSlashed(nodeAddress, slashAmount, reason);
    }
    
    /**
     * @dev Internal function to distribute rewards
     * @param recipient Address to receive reward
     * @param rewardType Type of reward being distributed
     */
    function _distributeReward(address recipient, string memory rewardType) internal {
        uint256 baseReward = 10 * 10**18; // 10 tokens base reward
        uint256 reputationMultiplier = nodes[recipient].reputation / 100;
        uint256 finalReward = baseReward * (100 + reputationMultiplier) / 100;
        
        // Transfer reward (simplified - would integrate with token contract)
        payable(recipient).transfer(finalReward);
        
        emit RewardDistributed(recipient, finalReward, rewardType);
    }
    
    /**
     * @dev Get threat alert details
     * @param alertId ID of the threat alert
     */
    function getThreatAlert(bytes32 alertId) external view returns (ThreatAlert memory) {
        return threats[alertId];
    }
    
    /**
     * @dev Get node details
     * @param nodeAddress Address of the node
     */
    function getNode(address nodeAddress) external view returns (Node memory) {
        return nodes[nodeAddress];
    }
    
    /**
     * @dev Get network statistics
     */
    function getNetworkStats() external view returns (
        uint256 _totalNodes,
        uint256 _totalStaked,
        uint256 _totalThreats,
        uint256 _verifiedThreats
    ) {
        return (
            activeNodes.length,
            totalStaked,
            totalThreats,
            verifiedThreats
        );
    }
    
    /**
     * @dev Emergency pause function
     */
    function pause() external onlyOwner {
        _pause();
    }
    
    /**
     * @dev Unpause function
     */
    function unpause() external onlyOwner {
        _unpause();
    }
    
    /**
     * @dev Withdraw contract balance (owner only)
     */
    function withdraw() external onlyOwner {
        payable(owner()).transfer(address(this).balance);
    }
    
    // Fallback function to receive ETH
    receive() external payable {}
}
