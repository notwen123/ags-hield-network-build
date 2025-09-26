//! Blockchain client for interacting with DAGShield smart contracts

use anyhow::Result;
use ethers::{
    prelude::*,
    providers::{Http, Provider},
    signers::{LocalWallet, Signer},
    types::{Address, U256},
};
use std::sync::Arc;
use tracing::{debug, info, warn, error};

use crate::config::BlockchainConfig;
use crate::node::Challenge;

// ABI for DAGShield contract (simplified)
abigen!(
    DAGShieldContract,
    r#"[
        function registerNode(string memory nodeId) external payable
        function reportThreat(string memory threatType, string memory targetAddress, uint256 confidence, uint256 chainId) external
        function voteOnThreat(bytes32 alertId, bool support) external
        function submitChallengeSolution(bytes32 challengeId, bytes32 solution) external
        function getNode(address nodeAddress) external view returns (tuple(string nodeId, address nodeAddress, uint256 stake, uint256 reputation, uint256 totalReports, uint256 accurateReports, bool active, uint256 lastActivity, uint256 energyEfficiency))
        function getNetworkStats() external view returns (uint256 totalNodes, uint256 totalStaked, uint256 totalThreats, uint256 verifiedThreats)
        function getThreatAlert(bytes32 alertId) external view returns (tuple(bytes32 id, address reporter, uint256 chainId, string threatType, string targetAddress, uint256 confidence, uint256 timestamp, bool verified, uint256 votes))
        event ThreatDetected(bytes32 indexed alertId, address indexed reporter, uint256 indexed chainId, string threatType, uint256 confidence, uint256 timestamp)
        event NodeRegistered(address indexed nodeAddress, string nodeId, uint256 stake, uint256 timestamp)
        event RewardDistributed(address indexed recipient, uint256 amount, string rewardType)
    ]"#
);

pub struct BlockchainClient {
    config: BlockchainConfig,
    provider: Arc<Provider<Http>>,
    wallet: LocalWallet,
    contract: DAGShieldContract<SignerMiddleware<Provider<Http>, LocalWallet>>,
}

impl BlockchainClient {
    pub async fn new(config: &BlockchainConfig) -> Result<Self> {
        info!("🔗 Initializing blockchain client for chain ID: {}", config.chain_id);
        
        // Create provider
        let provider = Provider::<Http>::try_from(&config.rpc_url)?;
        let provider = Arc::new(provider);
        
        // Create wallet
        let wallet: LocalWallet = config.private_key.parse()?;
        let wallet = wallet.with_chain_id(config.chain_id);
        
        // Create signer middleware
        let client = SignerMiddleware::new(provider.clone(), wallet.clone());
        
        // Create contract instance
        let contract_address: Address = config.contract_address.parse()?;
        let contract = DAGShieldContract::new(contract_address, Arc::new(client));
        
        info!("✅ Blockchain client initialized");
        info!("   Wallet address: {:?}", wallet.address());
        info!("   Contract address: {}", config.contract_address);
        
        Ok(Self {
            config: config.clone(),
            provider,
            wallet,
            contract,
        })
    }
    
    pub async fn register_node(&self, node_id: &str, stake_amount: u64) -> Result<String> {
        info!("📝 Registering node on blockchain: {}", node_id);
        
        let stake_wei = U256::from(stake_amount);
        
        let tx = self.contract
            .register_node(node_id.to_string())
            .value(stake_wei)
            .gas(self.config.gas_limit)
            .gas_price(U256::from(self.config.gas_price_gwei) * U256::exp10(9))
            .send()
            .await?;
        
        let receipt = tx.await?;
        let tx_hash = receipt.unwrap().transaction_hash;
        
        info!("✅ Node registered successfully: {:?}", tx_hash);
        Ok(format!("{:?}", tx_hash))
    }
    
    pub async fn report_threat(
        &self,
        threat_type: &str,
        target_address: &str,
        confidence: u32,
        chain_id: u64,
    ) -> Result<String> {
        debug!("🚨 Reporting threat: {} (confidence: {}%)", threat_type, confidence);
        
        let tx = self.contract
            .report_threat(
                threat_type.to_string(),
                target_address.to_string(),
                U256::from(confidence),
                U256::from(chain_id),
            )
            .gas(self.config.gas_limit)
            .gas_price(U256::from(self.config.gas_price_gwei) * U256::exp10(9))
            .send()
            .await?;
        
        let receipt = tx.await?;
        let tx_hash = receipt.unwrap().transaction_hash;
        
        debug!("✅ Threat reported successfully: {:?}", tx_hash);
        Ok(format!("{:?}", tx_hash))
    }
    
    pub async fn vote_on_threat(&self, alert_id: &str, support: bool) -> Result<String> {
        debug!("🗳️ Voting on threat alert: {} (support: {})", alert_id, support);
        
        let alert_bytes: [u8; 32] = hex::decode(alert_id.trim_start_matches("0x"))?
            .try_into()
            .map_err(|_| anyhow::anyhow!("Invalid alert ID length"))?;
        
        let tx = self.contract
            .vote_on_threat(alert_bytes, support)
            .gas(self.config.gas_limit)
            .gas_price(U256::from(self.config.gas_price_gwei) * U256::exp10(9))
            .send()
            .await?;
        
        let receipt = tx.await?;
        let tx_hash = receipt.unwrap().transaction_hash;
        
        debug!("✅ Vote submitted successfully: {:?}", tx_hash);
        Ok(format!("{:?}", tx_hash))
    }
    
    pub async fn submit_challenge_solution(
        &self,
        challenge_id: &str,
        solution: &str,
    ) -> Result<String> {
        info!("🎯 Submitting challenge solution: {}", challenge_id);
        
        let challenge_bytes: [u8; 32] = hex::decode(challenge_id.trim_start_matches("0x"))?
            .try_into()
            .map_err(|_| anyhow::anyhow!("Invalid challenge ID length"))?;
        
        let solution_bytes: [u8; 32] = {
            let solution_hash = keccak256(solution.as_bytes());
            solution_hash
        };
        
        let tx = self.contract
            .submit_challenge_solution(challenge_bytes, solution_bytes)
            .gas(self.config.gas_limit)
            .gas_price(U256::from(self.config.gas_price_gwei) * U256::exp10(9))
            .send()
            .await?;
        
        let receipt = tx.await?;
        let tx_hash = receipt.unwrap().transaction_hash;
        
        info!("✅ Challenge solution submitted: {:?}", tx_hash);
        Ok(format!("{:?}", tx_hash))
    }
    
    pub async fn get_node_reputation(&self, node_id: &str) -> Result<u32> {
        let node_address: Address = self.wallet.address();
        
        let node_info = self.contract
            .get_node(node_address)
            .call()
            .await?;
        
        Ok(node_info.3.as_u32()) // reputation is the 4th field
    }
    
    pub async fn get_network_stats(&self) -> Result<(u64, u64, u64, u64)> {
        let stats = self.contract
            .get_network_stats()
            .call()
            .await?;
        
        Ok((
            stats.0.as_u64(), // totalNodes
            stats.1.as_u64(), // totalStaked
            stats.2.as_u64(), // totalThreats
            stats.3.as_u64(), // verifiedThreats
        ))
    }
    
    pub async fn get_active_challenges(&self) -> Result<Vec<Challenge>> {
        // In a real implementation, this would query the contract for active challenges
        // For now, return mock challenges for testing
        
        let mock_challenges = vec![
            Challenge {
                id: "0x1234567890abcdef".to_string(),
                challenge_type: "threat_detection_accuracy".to_string(),
                data: r#"[{"id":"test_1","threat_type":"phishing","expected":true}]"#.to_string(),
                reward: 1000,
                deadline: chrono::Utc::now().timestamp() as u64 + 3600,
            },
            Challenge {
                id: "0xabcdef1234567890".to_string(),
                challenge_type: "dag_processing_speed".to_string(),
                data: r#"{"transactions":100,"target_tps":50}"#.to_string(),
                reward: 500,
                deadline: chrono::Utc::now().timestamp() as u64 + 1800,
            },
        ];
        
        Ok(mock_challenges)
    }
    
    pub async fn listen_for_events(&self) -> Result<()> {
        info!("👂 Starting to listen for blockchain events...");
        
        let events = self.contract.events();
        let mut stream = events.stream().await?;
        
        while let Some(log) = stream.next().await {
            match log {
                Ok(event) => {
                    self.handle_contract_event(event).await?;
                }
                Err(e) => {
                    warn!("Error receiving event: {}", e);
                }
            }
        }
        
        Ok(())
    }
    
    async fn handle_contract_event(&self, event: DAGShieldContractEvents) -> Result<()> {
        match event {
            DAGShieldContractEvents::ThreatDetectedFilter(threat_event) => {
                info!("🚨 Threat detected event: {:?}", threat_event.alert_id);
                // Handle threat detection event
            }
            DAGShieldContractEvents::NodeRegisteredFilter(node_event) => {
                info!("📝 Node registered event: {:?}", node_event.node_address);
                // Handle node registration event
            }
            DAGShieldContractEvents::RewardDistributedFilter(reward_event) => {
                info!("💰 Reward distributed event: {} tokens to {:?}", 
                      reward_event.amount, reward_event.recipient);
                // Handle reward distribution event
            }
        }
        
        Ok(())
    }
    
    pub async fn get_wallet_balance(&self) -> Result<U256> {
        let balance = self.provider
            .get_balance(self.wallet.address(), None)
            .await?;
        
        Ok(balance)
    }
    
    pub async fn estimate_gas(&self, to: Address, data: &[u8]) -> Result<U256> {
        let tx = TransactionRequest::new()
            .to(to)
            .data(data.to_vec())
            .from(self.wallet.address());
        
        let gas_estimate = self.provider.estimate_gas(&tx, None).await?;
        Ok(gas_estimate)
    }
    
    pub async fn get_current_gas_price(&self) -> Result<U256> {
        let gas_price = self.provider.get_gas_price().await?;
        Ok(gas_price)
    }
    
    pub async fn wait_for_transaction(&self, tx_hash: &str) -> Result<Option<TransactionReceipt>> {
        let hash: H256 = tx_hash.parse()?;
        let receipt = self.provider
            .get_transaction_receipt(hash)
            .await?;
        
        Ok(receipt)
    }
}

// Helper function for keccak256 hashing
fn keccak256(data: &[u8]) -> [u8; 32] {
    use sha3::{Digest, Keccak256};
    let mut hasher = Keccak256::new();
    hasher.update(data);
    hasher.finalize().into()
}
