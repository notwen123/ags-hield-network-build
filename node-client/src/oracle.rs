use crate::config::Config;
use ethers::{
    contract::{Contract, ContractFactory},
    core::types::*,
    middleware::SignerMiddleware,
    providers::{Http, Middleware, Provider},
    signers::{LocalWallet, Signer},
    utils::keccak256,
};
use serde::{Deserialize, Serialize};
use std::collections::HashMap;
use std::sync::Arc;
use tokio::time::{interval, Duration};
use tracing::{error, info, warn};

#[derive(Debug, Clone, Serialize, Deserialize)]
pub struct ThreatReport {
    pub chain_id: u64,
    pub contract_address: Address,
    pub threat_level: u8,
    pub threat_type: u8,
    pub evidence_hash: H256,
    pub confidence: u8,
    pub timestamp: u64,
}

#[derive(Debug, Clone)]
pub struct ChainConnection {
    pub chain_id: u64,
    pub provider: Arc<Provider<Http>>,
    pub oracle_contract: Address,
    pub relay_contract: Option<Address>,
}

pub struct OracleManager {
    config: Config,
    wallet: LocalWallet,
    chains: HashMap<u64, ChainConnection>,
    pending_reports: Vec<ThreatReport>,
}

impl OracleManager {
    pub async fn new(config: Config) -> Result<Self, Box<dyn std::error::Error>> {
        let wallet = config.private_key.parse::<LocalWallet>()?;
        let mut chains = HashMap::new();

        // Initialize chain connections
        for chain_config in &config.supported_chains {
            let provider = Provider::<Http>::try_from(&chain_config.rpc_url)?;
            let connection = ChainConnection {
                chain_id: chain_config.chain_id,
                provider: Arc::new(provider),
                oracle_contract: chain_config.oracle_contract,
                relay_contract: chain_config.relay_contract,
            };
            chains.insert(chain_config.chain_id, connection);
        }

        Ok(Self {
            config,
            wallet,
            chains,
            pending_reports: Vec::new(),
        })
    }

    pub async fn start(&mut self) -> Result<(), Box<dyn std::error::Error>> {
        info!("Starting Oracle Manager");
        
        let mut report_interval = interval(Duration::from_secs(30));
        let mut consensus_interval = interval(Duration::from_secs(60));

        loop {
            tokio::select! {
                _ = report_interval.tick() => {
                    if let Err(e) = self.process_pending_reports().await {
                        error!("Error processing reports: {}", e);
                    }
                }
                _ = consensus_interval.tick() => {
                    if let Err(e) = self.participate_in_consensus().await {
                        error!("Error in consensus participation: {}", e);
                    }
                }
            }
        }
    }

    pub async fn submit_threat_report(&mut self, report: ThreatReport) -> Result<H256, Box<dyn std::error::Error>> {
        info!("Submitting threat report for chain {}: {:?}", report.chain_id, report.contract_address);

        let chain = self.chains.get(&report.chain_id)
            .ok_or("Unsupported chain")?;

        let client = SignerMiddleware::new(
            chain.provider.clone(),
            self.wallet.clone().with_chain_id(report.chain_id),
        );

        // Create contract instance
        let oracle_contract = Contract::new(
            chain.oracle_contract,
            self.get_oracle_abi(),
            Arc::new(client),
        );

        // Generate signature
        let message_hash = self.generate_report_hash(&report)?;
        let signature = self.wallet.sign_hash(message_hash)?;

        // Submit to contract
        let tx = oracle_contract
            .method::<_, H256>(
                "submitThreatReport",
                (
                    report.chain_id,
                    report.contract_address,
                    report.threat_level,
                    report.threat_type,
                    report.evidence_hash,
                    report.confidence,
                    signature.to_vec(),
                ),
            )?
            .send()
            .await?;

        let receipt = tx.await?;
        info!("Threat report submitted: {:?}", receipt.transaction_hash);

        Ok(receipt.transaction_hash)
    }

    async fn process_pending_reports(&mut self) -> Result<(), Box<dyn std::error::Error>> {
        let reports_to_process = self.pending_reports.clone();
        self.pending_reports.clear();

        for report in reports_to_process {
            if let Err(e) = self.submit_threat_report(report).await {
                error!("Failed to submit threat report: {}", e);
            }
        }

        Ok(())
    }

    async fn participate_in_consensus(&self) -> Result<(), Box<dyn std::error::Error>> {
        // Listen for new threat reports and participate in consensus voting
        for (chain_id, chain) in &self.chains {
            if let Err(e) = self.check_pending_votes(*chain_id).await {
                warn!("Error checking pending votes for chain {}: {}", chain_id, e);
            }
        }

        Ok(())
    }

    async fn check_pending_votes(&self, chain_id: u64) -> Result<(), Box<dyn std::error::Error>> {
        let chain = self.chains.get(&chain_id).unwrap();
        
        let client = SignerMiddleware::new(
            chain.provider.clone(),
            self.wallet.clone().with_chain_id(chain_id),
        );

        let oracle_contract = Contract::new(
            chain.oracle_contract,
            self.get_oracle_abi(),
            Arc::new(client),
        );

        // Get recent ThreatReported events
        let filter = oracle_contract
            .event::<(H256, u64, Address, u8)>("ThreatReported")?
            .from_block(BlockNumber::Latest - 100);

        let events = filter.query().await?;

        for event in events {
            let report_id = event.0;
            
            // Check if we've already voted
            let has_voted: bool = oracle_contract
                .method("nodeVotes", (report_id, self.wallet.address()))?
                .call()
                .await?;

            if !has_voted {
                // Analyze the threat and vote
                if let Ok(should_agree) = self.analyze_threat_report(report_id, chain_id).await {
                    let tx = oracle_contract
                        .method::<_, H256>("voteOnThreat", (report_id, should_agree))?
                        .send()
                        .await?;
                    
                    info!("Voted on threat report {}: {}", report_id, should_agree);
                }
            }
        }

        Ok(())
    }

    async fn analyze_threat_report(&self, report_id: H256, chain_id: u64) -> Result<bool, Box<dyn std::error::Error>> {
        // This would integrate with the AI threat detection system
        // For now, we'll implement basic heuristics
        
        let chain = self.chains.get(&chain_id).unwrap();
        let client = SignerMiddleware::new(
            chain.provider.clone(),
            self.wallet.clone().with_chain_id(chain_id),
        );

        let oracle_contract = Contract::new(
            chain.oracle_contract,
            self.get_oracle_abi(),
            Arc::new(client),
        );

        // Get threat report details
        let report: (u64, Address, u8, u8, u64, H256, u8, Address, bool) = oracle_contract
            .method("getThreatReport", report_id)?
            .call()
            .await?;

        let confidence = report.6;
        let threat_level = report.2;

        // Simple voting logic - agree if confidence > 80% and threat level > 5
        Ok(confidence > 80 && threat_level > 5)
    }

    fn generate_report_hash(&self, report: &ThreatReport) -> Result<H256, Box<dyn std::error::Error>> {
        let encoded = ethers::abi::encode(&[
            ethers::abi::Token::Uint(report.chain_id.into()),
            ethers::abi::Token::Address(report.contract_address),
            ethers::abi::Token::Uint(report.threat_level.into()),
            ethers::abi::Token::Uint(report.threat_type.into()),
            ethers::abi::Token::FixedBytes(report.evidence_hash.as_bytes().to_vec()),
        ]);

        Ok(H256::from(keccak256(&encoded)))
    }

    fn get_oracle_abi(&self) -> ethers::abi::Abi {
        // This would typically be loaded from a JSON file
        // For brevity, we'll create a minimal ABI
        serde_json::from_str(r#"
        [
            {
                "name": "submitThreatReport",
                "type": "function",
                "inputs": [
                    {"name": "_chainId", "type": "uint256"},
                    {"name": "_contractAddress", "type": "address"},
                    {"name": "_threatLevel", "type": "uint8"},
                    {"name": "_threatType", "type": "uint8"},
                    {"name": "_evidenceHash", "type": "bytes32"},
                    {"name": "_confidence", "type": "uint8"},
                    {"name": "_signature", "type": "bytes"}
                ],
                "outputs": []
            },
            {
                "name": "voteOnThreat",
                "type": "function",
                "inputs": [
                    {"name": "_reportId", "type": "bytes32"},
                    {"name": "_agree", "type": "bool"}
                ],
                "outputs": []
            },
            {
                "name": "getThreatReport",
                "type": "function",
                "inputs": [{"name": "_reportId", "type": "bytes32"}],
                "outputs": [
                    {"name": "chainId", "type": "uint256"},
                    {"name": "contractAddress", "type": "address"},
                    {"name": "threatLevel", "type": "uint8"},
                    {"name": "threatType", "type": "uint8"},
                    {"name": "timestamp", "type": "uint256"},
                    {"name": "evidenceHash", "type": "bytes32"},
                    {"name": "confidence", "type": "uint8"},
                    {"name": "reporter", "type": "address"},
                    {"name": "verified", "type": "bool"}
                ]
            },
            {
                "name": "nodeVotes",
                "type": "function",
                "inputs": [
                    {"name": "", "type": "bytes32"},
                    {"name": "", "type": "address"}
                ],
                "outputs": [{"name": "", "type": "bool"}]
            },
            {
                "name": "ThreatReported",
                "type": "event",
                "inputs": [
                    {"name": "reportId", "type": "bytes32", "indexed": true},
                    {"name": "chainId", "type": "uint256"},
                    {"name": "contractAddress", "type": "address"},
                    {"name": "threatLevel", "type": "uint8"}
                ]
            }
        ]
        "#).unwrap()
    }

    pub fn queue_threat_report(&mut self, report: ThreatReport) {
        self.pending_reports.push(report);
    }
}

#[derive(Debug, Clone, Serialize, Deserialize)]
pub struct ChainConfig {
    pub chain_id: u64,
    pub rpc_url: String,
    pub oracle_contract: Address,
    pub relay_contract: Option<Address>,
}
