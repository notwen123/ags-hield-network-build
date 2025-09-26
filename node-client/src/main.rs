//! DAGShield Node Client
//! 
//! High-performance Rust node client for the DAGShield decentralized AI-DePIN security network.
//! Handles DAG processing, AI threat detection, blockchain interaction, and energy monitoring.

use anyhow::Result;
use clap::Parser;
use std::sync::Arc;
use tokio::signal;
use tracing::{info, error};

mod config;
mod node;
mod dag;
mod ai;
mod blockchain;
mod network;
mod energy;
mod metrics;
mod storage;

use config::NodeConfig;
use node::DAGShieldNode;

#[derive(Parser)]
#[command(name = "dagshield-node")]
#[command(about = "DAGShield decentralized AI-DePIN security node")]
struct Cli {
    /// Configuration file path
    #[arg(short, long, default_value = "config.toml")]
    config: String,
    
    /// Node ID (auto-generated if not provided)
    #[arg(short, long)]
    node_id: Option<String>,
    
    /// Enable verbose logging
    #[arg(short, long)]
    verbose: bool,
    
    /// Disable AI threat detection (for testing)
    #[arg(long)]
    no_ai: bool,
    
    /// Run in benchmark mode
    #[arg(long)]
    benchmark: bool,
}

#[tokio::main]
async fn main() -> Result<()> {
    let cli = Cli::parse();
    
    // Initialize logging
    let log_level = if cli.verbose { "debug" } else { "info" };
    tracing_subscriber::fmt()
        .with_env_filter(format!("dagshield_node={},warn", log_level))
        .init();
    
    info!("🛡️ Starting DAGShield Node Client v{}", env!("CARGO_PKG_VERSION"));
    
    // Load configuration
    let config = NodeConfig::load(&cli.config)?;
    info!("📋 Configuration loaded from: {}", cli.config);
    
    // Create and start the node
    let node = Arc::new(
        DAGShieldNode::new(config, cli.node_id, !cli.no_ai).await?
    );
    
    info!("🚀 Node initialized with ID: {}", node.get_node_id());
    
    // Start the node
    let node_handle = {
        let node = Arc::clone(&node);
        tokio::spawn(async move {
            if let Err(e) = node.start().await {
                error!("Node error: {}", e);
            }
        })
    };
    
    // Run benchmark if requested
    if cli.benchmark {
        info!("🏃 Running benchmark mode...");
        run_benchmark(&node).await?;
        return Ok(());
    }
    
    // Wait for shutdown signal
    info!("✅ Node is running. Press Ctrl+C to shutdown.");
    signal::ctrl_c().await?;
    
    info!("🛑 Shutdown signal received. Stopping node...");
    node.stop().await?;
    
    // Wait for node to finish
    if let Err(e) = node_handle.await {
        error!("Error waiting for node to stop: {}", e);
    }
    
    info!("👋 DAGShield node stopped successfully");
    Ok(())
}

async fn run_benchmark(node: &Arc<DAGShieldNode>) -> Result<()> {
    use std::time::Instant;
    
    info!("🔬 Starting DAGShield node benchmarks...");
    
    // Benchmark DAG processing
    let start = Instant::now();
    let dag_results = node.benchmark_dag_processing(1000).await?;
    let dag_duration = start.elapsed();
    
    info!("📊 DAG Processing Benchmark:");
    info!("   Transactions: 1000");
    info!("   Duration: {:?}", dag_duration);
    info!("   TPS: {:.2}", 1000.0 / dag_duration.as_secs_f64());
    info!("   Parallel efficiency: {:.2}%", dag_results.parallel_efficiency);
    
    // Benchmark AI threat detection
    let start = Instant::now();
    let ai_results = node.benchmark_ai_detection(100).await?;
    let ai_duration = start.elapsed();
    
    info!("🤖 AI Threat Detection Benchmark:");
    info!("   Samples: 100");
    info!("   Duration: {:?}", ai_duration);
    info!("   Accuracy: {:.2}%", ai_results.accuracy);
    info!("   Avg latency: {:.2}ms", ai_results.avg_latency_ms);
    
    // Benchmark energy efficiency
    let energy_stats = node.get_energy_stats().await?;
    info!("⚡ Energy Efficiency:");
    info!("   Power consumption: {:.2}W", energy_stats.power_watts);
    info!("   Efficiency score: {}/100", energy_stats.efficiency_score);
    info!("   Carbon footprint: {:.4}kg CO2/h", energy_stats.carbon_footprint_kg_per_hour);
    
    Ok(())
}
