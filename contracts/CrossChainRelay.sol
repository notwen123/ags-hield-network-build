// SPDX-License-Identifier: MIT
pragma solidity ^0.8.19;

import "@openzeppelin/contracts/access/Ownable.sol";
import "@openzeppelin/contracts/security/ReentrancyGuard.sol";

contract CrossChainRelay is Ownable, ReentrancyGuard {
    struct CrossChainThreat {
        uint256 sourceChain;
        bytes32 reportId;
        address contractAddress;
        uint8 threatLevel;
        uint8 threatType;
        uint256 timestamp;
        bool processed;
    }

    mapping(bytes32 => CrossChainThreat) public crossChainThreats;
    mapping(address => bool) public blockedContracts;
    mapping(address => uint256) public contractRiskScores;
    
    address public oracleContract;
    uint256 public constant AUTO_BLOCK_THRESHOLD = 8; // Threat level 8+ gets auto-blocked
    
    event CrossChainThreatReceived(bytes32 indexed reportId, uint256 sourceChain, address contractAddress);
    event ContractBlocked(address indexed contractAddress, uint8 threatLevel);
    event ContractUnblocked(address indexed contractAddress);
    event RiskScoreUpdated(address indexed contractAddress, uint256 newScore);

    modifier onlyOracle() {
        require(msg.sender == oracleContract, "Only oracle can call");
        _;
    }

    constructor(address _oracleContract) {
        oracleContract = _oracleContract;
    }

    function receiveCrossChainThreat(
        uint256 _sourceChain,
        bytes32 _reportId,
        address _contractAddress,
        uint8 _threatLevel,
        uint8 _threatType,
        uint256 _timestamp
    ) external onlyOracle nonReentrant {
        bytes32 threatId = keccak256(abi.encodePacked(_sourceChain, _reportId, _contractAddress));
        
        crossChainThreats[threatId] = CrossChainThreat({
            sourceChain: _sourceChain,
            reportId: _reportId,
            contractAddress: _contractAddress,
            threatLevel: _threatLevel,
            threatType: _threatType,
            timestamp: _timestamp,
            processed: false
        });

        emit CrossChainThreatReceived(_reportId, _sourceChain, _contractAddress);

        // Update risk score
        _updateRiskScore(_contractAddress, _threatLevel);

        // Auto-block high-severity threats
        if (_threatLevel >= AUTO_BLOCK_THRESHOLD) {
            _blockContract(_contractAddress, _threatLevel);
        }

        crossChainThreats[threatId].processed = true;
    }

    function _updateRiskScore(address _contractAddress, uint8 _threatLevel) internal {
        uint256 currentScore = contractRiskScores[_contractAddress];
        uint256 newScore = currentScore + (_threatLevel * 10);
        
        // Cap at 1000
        if (newScore > 1000) {
            newScore = 1000;
        }
        
        contractRiskScores[_contractAddress] = newScore;
        emit RiskScoreUpdated(_contractAddress, newScore);
    }

    function _blockContract(address _contractAddress, uint8 _threatLevel) internal {
        if (!blockedContracts[_contractAddress]) {
            blockedContracts[_contractAddress] = true;
            emit ContractBlocked(_contractAddress, _threatLevel);
        }
    }

    function manualBlockContract(address _contractAddress) external onlyOwner {
        _blockContract(_contractAddress, 10);
    }

    function unblockContract(address _contractAddress) external onlyOwner {
        blockedContracts[_contractAddress] = false;
        contractRiskScores[_contractAddress] = 0;
        emit ContractUnblocked(_contractAddress);
    }

    function isContractBlocked(address _contractAddress) external view returns (bool) {
        return blockedContracts[_contractAddress];
    }

    function getContractRiskScore(address _contractAddress) external view returns (uint256) {
        return contractRiskScores[_contractAddress];
    }

    function getCrossChainThreat(bytes32 _threatId) external view returns (CrossChainThreat memory) {
        return crossChainThreats[_threatId];
    }

    function updateOracleContract(address _newOracle) external onlyOwner {
        oracleContract = _newOracle;
    }
}
