// SPDX-License-Identifier: MIT
pragma solidity ^0.8.19;

import "@chainlink/contracts/src/v0.8/interfaces/AggregatorV3Interface.sol";
import "@openzeppelin/contracts/access/Ownable.sol";
import "@openzeppelin/contracts/security/ReentrancyGuard.sol";
import "@openzeppelin/contracts/utils/cryptography/ECDSA.sol";

contract DAGOracle is Ownable, ReentrancyGuard {
    using ECDSA for bytes32;

    struct ThreatReport {
        uint256 chainId;
        address contractAddress;
        uint8 threatLevel; // 1-10 scale
        uint8 threatType; // 1=phishing, 2=rugpull, 3=flashloan, etc.
        uint256 timestamp;
        bytes32 evidenceHash;
        uint8 confidence; // 0-100 percentage
        address reporter;
        bool verified;
    }

    struct ChainConfig {
        bool active;
        uint256 minConfidence;
        uint256 consensusThreshold;
        address relayContract;
    }

    // State variables
    mapping(uint256 => ChainConfig) public chainConfigs;
    mapping(bytes32 => ThreatReport) public threatReports;
    mapping(address => bool) public authorizedNodes;
    mapping(bytes32 => uint256) public reportConsensus;
    mapping(bytes32 => mapping(address => bool)) public nodeVotes;
    
    uint256[] public supportedChains;
    uint256 public constant CONSENSUS_WINDOW = 300; // 5 minutes
    uint256 public constant MIN_NODES_FOR_CONSENSUS = 3;
    
    // Events
    event ThreatReported(bytes32 indexed reportId, uint256 chainId, address contractAddress, uint8 threatLevel);
    event ThreatVerified(bytes32 indexed reportId, uint256 consensusScore);
    event CrossChainAlert(uint256 indexed targetChain, bytes32 reportId, uint8 threatLevel);
    event NodeAuthorized(address indexed node);
    event ChainConfigUpdated(uint256 indexed chainId, bool active);

    constructor() {
        // Initialize supported chains
        _addChainConfig(1, true, 80, 3); // Ethereum
        _addChainConfig(137, true, 75, 3); // Polygon
        _addChainConfig(56, true, 75, 3); // BSC
        _addChainConfig(42161, true, 80, 3); // Arbitrum
        _addChainConfig(10, true, 80, 3); // Optimism
    }

    modifier onlyAuthorizedNode() {
        require(authorizedNodes[msg.sender], "Not authorized node");
        _;
    }

    function submitThreatReport(
        uint256 _chainId,
        address _contractAddress,
        uint8 _threatLevel,
        uint8 _threatType,
        bytes32 _evidenceHash,
        uint8 _confidence,
        bytes memory _signature
    ) external onlyAuthorizedNode nonReentrant {
        require(_threatLevel >= 1 && _threatLevel <= 10, "Invalid threat level");
        require(_confidence >= chainConfigs[_chainId].minConfidence, "Confidence too low");
        require(chainConfigs[_chainId].active, "Chain not supported");

        bytes32 reportId = keccak256(abi.encodePacked(
            _chainId, _contractAddress, _threatType, _evidenceHash, block.timestamp
        ));

        // Verify signature
        bytes32 messageHash = keccak256(abi.encodePacked(
            "\x19Ethereum Signed Message:\n32",
            keccak256(abi.encodePacked(_chainId, _contractAddress, _threatLevel, _threatType, _evidenceHash))
        ));
        
        address signer = messageHash.recover(_signature);
        require(signer == msg.sender, "Invalid signature");

        // Store threat report
        threatReports[reportId] = ThreatReport({
            chainId: _chainId,
            contractAddress: _contractAddress,
            threatLevel: _threatLevel,
            threatType: _threatType,
            timestamp: block.timestamp,
            evidenceHash: _evidenceHash,
            confidence: _confidence,
            reporter: msg.sender,
            verified: false
        });

        emit ThreatReported(reportId, _chainId, _contractAddress, _threatLevel);
        
        // Start consensus process
        _processConsensus(reportId);
    }

    function voteOnThreat(bytes32 _reportId, bool _agree) external onlyAuthorizedNode {
        require(threatReports[_reportId].timestamp > 0, "Report does not exist");
        require(block.timestamp <= threatReports[_reportId].timestamp + CONSENSUS_WINDOW, "Voting window closed");
        require(!nodeVotes[_reportId][msg.sender], "Already voted");

        nodeVotes[_reportId][msg.sender] = true;
        
        if (_agree) {
            reportConsensus[_reportId]++;
        }

        _processConsensus(_reportId);
    }

    function _processConsensus(bytes32 _reportId) internal {
        ThreatReport storage report = threatReports[_reportId];
        uint256 consensusScore = reportConsensus[_reportId];
        uint256 requiredConsensus = chainConfigs[report.chainId].consensusThreshold;

        if (consensusScore >= requiredConsensus && consensusScore >= MIN_NODES_FOR_CONSENSUS) {
            report.verified = true;
            emit ThreatVerified(_reportId, consensusScore);
            
            // Trigger cross-chain alerts for high-severity threats
            if (report.threatLevel >= 7) {
                _broadcastCrossChainAlert(_reportId, report);
            }
        }
    }

    function _broadcastCrossChainAlert(bytes32 _reportId, ThreatReport memory _report) internal {
        for (uint256 i = 0; i < supportedChains.length; i++) {
            uint256 chainId = supportedChains[i];
            if (chainId != _report.chainId && chainConfigs[chainId].active) {
                emit CrossChainAlert(chainId, _reportId, _report.threatLevel);
                
                // Call relay contract if configured
                if (chainConfigs[chainId].relayContract != address(0)) {
                    // This would typically use a cross-chain messaging protocol
                    // like Chainlink CCIP, LayerZero, or Axelar
                    _relayThreatAlert(chainId, _reportId, _report);
                }
            }
        }
    }

    function _relayThreatAlert(uint256 _targetChain, bytes32 _reportId, ThreatReport memory _report) internal {
        // Implementation would depend on chosen cross-chain protocol
        // This is a placeholder for the actual cross-chain messaging
        
        // Example for Chainlink CCIP:
        // ccipRouter.ccipSend(_targetChain, Client.EVM2AnyMessage({
        //     receiver: abi.encode(chainConfigs[_targetChain].relayContract),
        //     data: abi.encode(_reportId, _report),
        //     tokenAmounts: new Client.EVMTokenAmount[](0),
        //     extraArgs: "",
        //     feeToken: address(0)
        // }));
    }

    // Admin functions
    function authorizeNode(address _node) external onlyOwner {
        authorizedNodes[_node] = true;
        emit NodeAuthorized(_node);
    }

    function revokeNode(address _node) external onlyOwner {
        authorizedNodes[_node] = false;
    }

    function _addChainConfig(uint256 _chainId, bool _active, uint256 _minConfidence, uint256 _consensusThreshold) internal {
        chainConfigs[_chainId] = ChainConfig({
            active: _active,
            minConfidence: _minConfidence,
            consensusThreshold: _consensusThreshold,
            relayContract: address(0)
        });
        supportedChains.push(_chainId);
    }

    function updateChainConfig(
        uint256 _chainId,
        bool _active,
        uint256 _minConfidence,
        uint256 _consensusThreshold,
        address _relayContract
    ) external onlyOwner {
        chainConfigs[_chainId] = ChainConfig({
            active: _active,
            minConfidence: _minConfidence,
            consensusThreshold: _consensusThreshold,
            relayContract: _relayContract
        });
        emit ChainConfigUpdated(_chainId, _active);
    }

    // View functions
    function getThreatReport(bytes32 _reportId) external view returns (ThreatReport memory) {
        return threatReports[_reportId];
    }

    function getChainConfig(uint256 _chainId) external view returns (ChainConfig memory) {
        return chainConfigs[_chainId];
    }

    function getSupportedChains() external view returns (uint256[] memory) {
        return supportedChains;
    }

    function getConsensusScore(bytes32 _reportId) external view returns (uint256) {
        return reportConsensus[_reportId];
    }
}
