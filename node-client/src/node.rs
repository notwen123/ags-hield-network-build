//! Core DAGShield node implementation

use anyhow::Result;
use std::sync::Arc;
use tokio::sync::{RwLock, mpsc};
use tracing::{info, warn, error, debug};
use uuid::Uuid;

use crate::config::NodeConfig;
use crate::dag::DAGProcessor;
use crate::ai::ThreatDetector;
use crate::blockchain::BlockchainClient;
use crate::network::NetworkManager;
use crate::energy::EnergyMonitor;
use crate::metrics::MetricsCollector;
use crate::storage::NodeStorage;

#[derive(Debug, Clone)]
pub struct NodeStats {
    pub threats_detected: u64,
    pub challenges_completed: u64,
    pub reputation_score: u32,
    pub energy_efficiency: u32,
    pub uptime_seconds: u64,
}

#[derive(Debug)]
pub struct BenchmarkResults {
    pub parallel_efficiency: f64,
    pub throughput_tps: f64,
    pub accuracy: f64,
    pub avg_latency_ms: f64,
}

pub struct DAGShieldNode {
    node_id: String,
    config: NodeConfig,
    dag_processor: Arc<DAGProcessor>,
    threat_detector: Option<Arc<ThreatDetector>>,
    blockchain_client: Arc<BlockchainClient>,
    network_manager: Arc<NetworkManager>,
    energy_monitor: Arc<EnergyMonitor>,
    metrics_collector: Arc<MetricsCollector>,
    storage: Arc<NodeStorage>,
    stats: Arc<RwLock<NodeStats>>,
    shutdown_tx: Option<mpsc::Sender<()>>,
}

impl DAGShieldNode {
    pub async fn new(
        config: NodeConfig,
        node_id: Option<String>,
        enable_ai: bool,
    ) -> Result<Self> {
        let node_id = node_id.unwrap_or_else(|| Uuid::new_v4().to_string());
        
        info!("🔧 Initializing DAGShield node components...");
        
        // Initialize storage
        let storage = Arc::new(NodeStorage::new(&config.storage).await?);
        
        // Initialize DAG processor
        let dag_processor = Arc::new(DAGProcessor::new(&config).await?);
        
        // Initialize AI threat detector (optional)
        let threat_detector = if enable_ai {
            Some(Arc::new(ThreatDetector::new(&config.ai).await?))
        } else {
            None
        };
        
        // Initialize blockchain client
        let blockchain_client = Arc::new(BlockchainClient::new(&config.blockchain).await?);
        
        // Initialize network manager
        let network_manager = Arc::new(NetworkManager::new(&config.network, &node_id).await?);
        
        // Initialize energy monitor
        let energy_monitor = Arc::new(EnergyMonitor::new(&config.energy).await?);
        
        // Initialize metrics collector
        let metrics_collector = Arc::new(MetricsCollector::new(&config.metrics).await?);
        
        let stats = Arc::new(RwLock::new(NodeStats {
            threats_detected: 0,
            challenges_completed: 0,
            reputation_score: 100,
            energy_efficiency: 50,
            uptime_seconds: 0,
        }));
        
        Ok(Self {
            node_id,
            config,
            dag_processor,
            threat_detector,
            blockchain_client,
            network_manager,
            energy_monitor,
            metrics_collector,
            storage,
            stats,
            shutdown_tx: None,
        })
    }
    
    pub async fn start(&self) -> Result<()> {
        info!("🚀 Starting DAGShield node: {}", self.node_id);
        
        // Register node on blockchain
        self.register_on_blockchain().await?;
        
        // Start all components
        let (shutdown_tx, mut shutdown_rx) = mpsc::channel(1);
        
        // Start DAG processor
        let dag_handle = {
            let processor = Arc::clone(&self.dag_processor);
            let mut rx = shutdown_rx.resubscribe();
            tokio::spawn(async move {
                processor.start().await.unwrap_or_else(|e| {
                    error!("DAG processor error: {}", e);
                });
            })
        };
        
        // Start network manager
        let network_handle = {
            let manager = Arc::clone(&self.network_manager);
            tokio::spawn(async move {
                manager.start().await.unwrap_or_else(|e| {
                    error!("Network manager error: {}", e);
                });
            })
        };
        
        // Start energy monitor
        let energy_handle = {
            let monitor = Arc::clone(&self.energy_monitor);
            tokio::spawn(async move {
                monitor.start().await.unwrap_or_else(|e| {
                    error!("Energy monitor error: {}", e);
                });
            })
        };
        
        // Start metrics collector
        let metrics_handle = {
            let collector = Arc::clone(&self.metrics_collector);
            tokio::spawn(async move {
                collector.start().await.unwrap_or_else(|e| {
                    error!("Metrics collector error: {}", e);
                });
            })
        };
        
        // Main event loop
        let main_handle = {
            let node = self.clone();
            tokio::spawn(async move {
                node.run_main_loop().await.unwrap_or_else(|e| {
                    error!("Main loop error: {}", e);
                });
            })
        };
        
        // Wait for shutdown signal
        shutdown_rx.recv().await;
        
        info!("🛑 Shutting down node components...");
        
        // Stop all components
        dag_handle.abort();
        network_handle.abort();
        energy_handle.abort();
        metrics_handle.abort();
        main_handle.abort();
        
        Ok(())
    }
    
    pub async fn stop(&self) -> Result<()> {
        if let Some(tx) = &self.shutdown_tx {
            let _ = tx.send(()).await;
        }
        Ok(())
    }
    
    async fn register_on_blockchain(&self) -> Result<()> {
        info!("📝 Registering node on blockchain...");
        
        let tx_hash = self.blockchain_client.register_node(
            &self.node_id,
            self.config.node.stake_amount,
        ).await?;
        
        info!("✅ Node registered on blockchain: {}", tx_hash);
        Ok(())
    }
    
    async fn run_main_loop(&self) -> Result<()> {
        let mut heartbeat_interval = tokio::time::interval(
            std::time::Duration::from_secs(self.config.node.heartbeat_interval_secs)
        );
        
        loop {
            heartbeat_interval.tick().await;
            
            // Process pending threats
            if let Some(detector) = &self.threat_detector {
                self.process_threats(detector).await?;
            }
            
            // Check for challenges
            self.check_challenges().await?;
            
            // Update stats
            self.update_stats().await?;
            
            // Energy efficiency check
            self.optimize_energy_usage().await?;
            
            debug!("💓 Heartbeat - Node {} is healthy", self.node_id);
        }
    }
    
    async fn process_threats(&self, detector: &Arc<ThreatDetector>) -> Result<()> {
        // Get pending transactions from DAG processor
        let transactions = self.dag_processor.get_pending_transactions().await?;
        
        if transactions.is_empty() {
            return Ok();
        }
        
        debug!("🔍 Processing {} transactions for threats", transactions.len());
        
        // Batch process transactions through AI
        let results = detector.detect_threats_batch(&transactions).await?;
        
        for (tx, result) in transactions.iter().zip(results.iter()) {
            if result.confidence > self.config.ai.confidence_threshold {
                info!("🚨 Threat detected: {} (confidence: {:.2})", 
                      result.threat_type, result.confidence);
                
                // Report to blockchain
                self.blockchain_client.report_threat(
                    &result.threat_type,
                    &tx.target_address,
                    (result.confidence * 100.0) as u32,
                    tx.chain_id,
                ).await?;
                
                // Update stats
                let mut stats = self.stats.write().await;
                stats.threats_detected += 1;
            }
        }
        
        Ok(())
    }
    
    async fn check_challenges(&self) -> Result<()> {
        let challenges = self.blockchain_client.get_active_challenges().await?;
        
        for challenge in challenges {
            if let Some(solution) = self.solve_challenge(&challenge).await? {
                info!("🎯 Submitting solution for challenge: {}", challenge.id);
                
                self.blockchain_client.submit_challenge_solution(
                    &challenge.id,
                    &solution,
                ).await?;
                
                let mut stats = self.stats.write().await;
                stats.challenges_completed += 1;
            }
        }
        
        Ok(())
    }
    
    async fn solve_challenge(&self, challenge: &Challenge) -> Result<Option<String>> {
        match challenge.challenge_type.as_str() {
            "threat_detection_accuracy" => {
                // Use AI to solve threat detection challenge
                if let Some(detector) = &self.threat_detector {
                    detector.solve_accuracy_challenge(&challenge.data).await
                } else {
                    Ok(None)
                }
            }
            "dag_processing_speed" => {
                // Use DAG processor to solve speed challenge
                self.dag_processor.solve_speed_challenge(&challenge.data).await
            }
            "energy_efficiency" => {
                // Use energy monitor to solve efficiency challenge
                self.energy_monitor.solve_efficiency_challenge(&challenge.data).await
            }
            _ => {
                warn!("Unknown challenge type: {}", challenge.challenge_type);
                Ok(None)
            }
        }
    }
    
    async fn update_stats(&self) -> Result<()> {
        let energy_stats = self.energy_monitor.get_current_stats().await?;
        let reputation = self.blockchain_client.get_node_reputation(&self.node_id).await?;
        
        let mut stats = self.stats.write().await;
        stats.energy_efficiency = energy_stats.efficiency_score;
        stats.reputation_score = reputation;
        stats.uptime_seconds += self.config.node.heartbeat_interval_secs;
        
        Ok(())
    }
    
    async fn optimize_energy_usage(&self) -> Result<()> {
        let current_power = self.energy_monitor.get_current_power_usage().await?;
        
        if current_power > self.config.energy.power_limit_watts {
            warn!("⚡ Power usage ({:.2}W) exceeds limit ({:.2}W)", 
                  current_power, self.config.energy.power_limit_watts);
            
            // Reduce processing intensity
            self.dag_processor.reduce_intensity().await?;
        }
        
        Ok(())
    }
    
    pub fn get_node_id(&self) -> &str {
        &self.node_id
    }
    
    pub async fn get_stats(&self) -> NodeStats {
        self.stats.read().await.clone()
    }
    
    pub async fn get_energy_stats(&self) -> Result<EnergyStats> {
        self.energy_monitor.get_current_stats().await
    }
    
    // Benchmark methods
    pub async fn benchmark_dag_processing(&self, tx_count: usize) -> Result<BenchmarkResults> {
        self.dag_processor.benchmark(tx_count).await
    }
    
    pub async fn benchmark_ai_detection(&self, sample_count: usize) -> Result<BenchmarkResults> {
        if let Some(detector) = &self.threat_detector {
            detector.benchmark(sample_count).await
        } else {
            Err(anyhow::anyhow!("AI detection not enabled"))
        }
    }
}

// Helper structs
#[derive(Debug, Clone)]
pub struct Challenge {
    pub id: String,
    pub challenge_type: String,
    pub data: String,
    pub reward: u64,
    pub deadline: u64,
}

#[derive(Debug, Clone)]
pub struct EnergyStats {
    pub power_watts: f32,
    pub efficiency_score: u32,
    pub carbon_footprint_kg_per_hour: f64,
}

// Clone implementation for DAGShieldNode (simplified)
impl Clone for DAGShieldNode {
    fn clone(&self) -> Self {
        Self {
            node_id: self.node_id.clone(),
            config: self.config.clone(),
            dag_processor: Arc::clone(&self.dag_processor),
            threat_detector: self.threat_detector.as_ref().map(Arc::clone),
            blockchain_client: Arc::clone(&self.blockchain_client),
            network_manager: Arc::clone(&self.network_manager),
            energy_monitor: Arc::clone(&self.energy_monitor),
            metrics_collector: Arc::clone(&self.metrics_collector),
            storage: Arc::clone(&self.storage),
            stats: Arc::clone(&self.stats),
            shutdown_tx: None, // Don't clone shutdown channel
        }
    }
}
