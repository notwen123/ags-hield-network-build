//! Configuration management for DAGShield node

use anyhow::Result;
use serde::{Deserialize, Serialize};
use std::path::Path;

#[derive(Debug, Clone, Serialize, Deserialize)]
pub struct NodeConfig {
    pub node: NodeSettings,
    pub blockchain: BlockchainConfig,
    pub ai: AIConfig,
    pub network: NetworkConfig,
    pub storage: StorageConfig,
    pub energy: EnergyConfig,
    pub metrics: MetricsConfig,
}

#[derive(Debug, Clone, Serialize, Deserialize)]
pub struct NodeSettings {
    pub stake_amount: u64,
    pub reputation_threshold: u32,
    pub max_concurrent_tasks: usize,
    pub heartbeat_interval_secs: u64,
    pub challenge_timeout_secs: u64,
}

#[derive(Debug, Clone, Serialize, Deserialize)]
pub struct BlockchainConfig {
    pub rpc_url: String,
    pub chain_id: u64,
    pub contract_address: String,
    pub private_key: String,
    pub gas_limit: u64,
    pub gas_price_gwei: u64,
}

#[derive(Debug, Clone, Serialize, Deserialize)]
pub struct AIConfig {
    pub model_path: String,
    pub confidence_threshold: f32,
    pub batch_size: usize,
    pub max_sequence_length: usize,
    pub update_interval_hours: u64,
}

#[derive(Debug, Clone, Serialize, Deserialize)]
pub struct NetworkConfig {
    pub listen_port: u16,
    pub bootstrap_peers: Vec<String>,
    pub max_peers: usize,
    pub discovery_interval_secs: u64,
}

#[derive(Debug, Clone, Serialize, Deserialize)]
pub struct StorageConfig {
    pub data_dir: String,
    pub max_db_size_gb: u64,
    pub backup_interval_hours: u64,
}

#[derive(Debug, Clone, Serialize, Deserialize)]
pub struct EnergyConfig {
    pub monitoring_enabled: bool,
    pub target_efficiency_score: u32,
    pub power_limit_watts: f32,
    pub carbon_tracking_enabled: bool,
}

#[derive(Debug, Clone, Serialize, Deserialize)]
pub struct MetricsConfig {
    pub enabled: bool,
    pub port: u16,
    pub export_interval_secs: u64,
}

impl Default for NodeConfig {
    fn default() -> Self {
        Self {
            node: NodeSettings {
                stake_amount: 100_000_000_000_000_000_000, // 100 tokens in wei
                reputation_threshold: 70,
                max_concurrent_tasks: 10,
                heartbeat_interval_secs: 30,
                challenge_timeout_secs: 3600,
            },
            blockchain: BlockchainConfig {
                rpc_url: "http://localhost:8545".to_string(),
                chain_id: 1337,
                contract_address: "0x0000000000000000000000000000000000000000".to_string(),
                private_key: "".to_string(),
                gas_limit: 500_000,
                gas_price_gwei: 20,
            },
            ai: AIConfig {
                model_path: "./models/threat_detection.onnx".to_string(),
                confidence_threshold: 0.7,
                batch_size: 32,
                max_sequence_length: 512,
                update_interval_hours: 24,
            },
            network: NetworkConfig {
                listen_port: 9000,
                bootstrap_peers: vec![],
                max_peers: 50,
                discovery_interval_secs: 60,
            },
            storage: StorageConfig {
                data_dir: "./data".to_string(),
                max_db_size_gb: 10,
                backup_interval_hours: 6,
            },
            energy: EnergyConfig {
                monitoring_enabled: true,
                target_efficiency_score: 80,
                power_limit_watts: 100.0,
                carbon_tracking_enabled: true,
            },
            metrics: MetricsConfig {
                enabled: true,
                port: 9090,
                export_interval_secs: 60,
            },
        }
    }
}

impl NodeConfig {
    pub fn load<P: AsRef<Path>>(path: P) -> Result<Self> {
        let content = std::fs::read_to_string(path)?;
        let config: NodeConfig = toml::from_str(&content)?;
        Ok(config)
    }
    
    pub fn save<P: AsRef<Path>>(&self, path: P) -> Result<()> {
        let content = toml::to_string_pretty(self)?;
        std::fs::write(path, content)?;
        Ok(())
    }
}
