//! Energy monitoring and optimization for sustainable DePIN operations

use anyhow::Result;
use battery::Manager;
use serde::{Deserialize, Serialize};
use std::sync::Arc;
use sysinfo::{CpuExt, System, SystemExt};
use tokio::sync::RwLock;
use tracing::{debug, info, warn};

use crate::config::EnergyConfig;
use crate::node::EnergyStats;

#[derive(Debug, Clone, Serialize, Deserialize)]
pub struct EnergyMetrics {
    pub cpu_usage_percent: f32,
    pub memory_usage_percent: f32,
    pub power_consumption_watts: f32,
    pub battery_level_percent: Option<f32>,
    pub temperature_celsius: f32,
    pub efficiency_score: u32,
    pub carbon_footprint_kg_per_hour: f64,
    pub timestamp: u64,
}

#[derive(Debug, Clone)]
pub struct PowerProfile {
    pub profile_name: String,
    pub max_cpu_usage: f32,
    pub max_power_watts: f32,
    pub target_efficiency: u32,
}

pub struct EnergyMonitor {
    config: EnergyConfig,
    system: Arc<RwLock<System>>,
    battery_manager: Arc<RwLock<Option<Manager>>>,
    current_metrics: Arc<RwLock<EnergyMetrics>>,
    power_profiles: Arc<RwLock<Vec<PowerProfile>>>,
    baseline_power: Arc<RwLock<f32>>,
}

impl EnergyMonitor {
    pub async fn new(config: &EnergyConfig) -> Result<Self> {
        info!("⚡ Initializing energy monitoring system...");
        
        let mut system = System::new_all();
        system.refresh_all();
        
        let battery_manager = if cfg!(target_os = "linux") || cfg!(target_os = "windows") || cfg!(target_os = "macos") {
            match Manager::new() {
                Ok(manager) => Some(manager),
                Err(e) => {
                    warn!("Battery manager not available: {}", e);
                    None
                }
            }
        } else {
            None
        };
        
        let monitor = Self {
            config: config.clone(),
            system: Arc::new(RwLock::new(system)),
            battery_manager: Arc::new(RwLock::new(battery_manager)),
            current_metrics: Arc::new(RwLock::new(EnergyMetrics::default())),
            power_profiles: Arc::new(RwLock::new(Vec::new())),
            baseline_power: Arc::new(RwLock::new(0.0)),
        };
        
        // Initialize power profiles
        monitor.initialize_power_profiles().await?;
        
        // Measure baseline power consumption
        monitor.measure_baseline_power().await?;
        
        info!("✅ Energy monitoring system initialized");
        Ok(monitor)
    }
    
    pub async fn start(&self) -> Result<()> {
        info!("🔋 Starting energy monitoring...");
        
        let mut monitoring_interval = tokio::time::interval(
            std::time::Duration::from_secs(10) // Monitor every 10 seconds
        );
        
        loop {
            monitoring_interval.tick().await;
            
            if self.config.monitoring_enabled {
                self.collect_metrics().await?;
                self.optimize_power_usage().await?;
                self.update_carbon_footprint().await?;
            }
        }
    }
    
    async fn initialize_power_profiles(&self) -> Result<()> {
        let mut profiles = self.power_profiles.write().await;
        
        profiles.push(PowerProfile {
            profile_name: "High Performance".to_string(),
            max_cpu_usage: 100.0,
            max_power_watts: self.config.power_limit_watts,
            target_efficiency: 60,
        });
        
        profiles.push(PowerProfile {
            profile_name: "Balanced".to_string(),
            max_cpu_usage: 80.0,
            max_power_watts: self.config.power_limit_watts * 0.8,
            target_efficiency: 75,
        });
        
        profiles.push(PowerProfile {
            profile_name: "Power Saver".to_string(),
            max_cpu_usage: 50.0,
            max_power_watts: self.config.power_limit_watts * 0.6,
            target_efficiency: 90,
        });
        
        profiles.push(PowerProfile {
            profile_name: "Ultra Efficient".to_string(),
            max_cpu_usage: 30.0,
            max_power_watts: self.config.power_limit_watts * 0.4,
            target_efficiency: 95,
        });
        
        info!("🔧 Initialized {} power profiles", profiles.len());
        Ok(())
    }
    
    async fn measure_baseline_power(&self) -> Result<()> {
        info!("📊 Measuring baseline power consumption...");
        
        // Simulate baseline measurement (in real implementation, would use hardware sensors)
        let estimated_baseline = self.estimate_system_baseline_power().await?;
        
        let mut baseline = self.baseline_power.write().await;
        *baseline = estimated_baseline;
        
        info!("✅ Baseline power consumption: {:.2}W", estimated_baseline);
        Ok(())
    }
    
    async fn estimate_system_baseline_power(&self) -> Result<f32> {
        let system = self.system.read().await;
        
        // Estimate based on system specifications
        let cpu_count = system.cpus().len() as f32;
        let total_memory_gb = system.total_memory() as f32 / (1024.0 * 1024.0 * 1024.0);
        
        // Rough estimation formula (would be calibrated with real measurements)
        let cpu_base_power = cpu_count * 15.0; // ~15W per core at idle
        let memory_power = total_memory_gb * 2.0; // ~2W per GB
        let system_overhead = 20.0; // Motherboard, storage, etc.
        
        Ok(cpu_base_power + memory_power + system_overhead)
    }
    
    async fn collect_metrics(&self) -> Result<()> {
        let mut system = self.system.write().await;
        system.refresh_all();
        
        // CPU metrics
        let cpu_usage = system.global_cpu_info().cpu_usage();
        
        // Memory metrics
        let memory_usage = (system.used_memory() as f32 / system.total_memory() as f32) * 100.0;
        
        // Temperature (simplified - would use proper sensors)
        let temperature = self.estimate_cpu_temperature(cpu_usage).await;
        
        // Power consumption estimation
        let power_consumption = self.estimate_power_consumption(cpu_usage, memory_usage).await?;
        
        // Battery level
        let battery_level = self.get_battery_level().await?;
        
        // Calculate efficiency score
        let efficiency_score = self.calculate_efficiency_score(
            cpu_usage,
            power_consumption,
            temperature,
        ).await;
        
        // Carbon footprint calculation
        let carbon_footprint = self.calculate_carbon_footprint(power_consumption).await;
        
        let metrics = EnergyMetrics {
            cpu_usage_percent: cpu_usage,
            memory_usage_percent: memory_usage,
            power_consumption_watts: power_consumption,
            battery_level_percent: battery_level,
            temperature_celsius: temperature,
            efficiency_score,
            carbon_footprint_kg_per_hour: carbon_footprint,
            timestamp: chrono::Utc::now().timestamp() as u64,
        };
        
        let mut current_metrics = self.current_metrics.write().await;
        *current_metrics = metrics.clone();
        
        debug!("📊 Energy metrics updated: CPU {:.1}%, Power {:.1}W, Efficiency {}/100",
               metrics.cpu_usage_percent, metrics.power_consumption_watts, metrics.efficiency_score);
        
        Ok(())
    }
    
    async fn estimate_cpu_temperature(&self, cpu_usage: f32) -> f32 {
        // Simplified temperature estimation based on CPU usage
        let base_temp = 35.0; // Base temperature in Celsius
        let temp_increase = (cpu_usage / 100.0) * 30.0; // Up to 30°C increase under load
        base_temp + temp_increase
    }
    
    async fn estimate_power_consumption(&self, cpu_usage: f32, memory_usage: f32) -> Result<f32> {
        let baseline = *self.baseline_power.read().await;
        
        // Dynamic power consumption based on usage
        let cpu_dynamic_power = (cpu_usage / 100.0) * 50.0; // Up to 50W additional for CPU
        let memory_dynamic_power = (memory_usage / 100.0) * 10.0; // Up to 10W additional for memory
        
        let total_power = baseline + cpu_dynamic_power + memory_dynamic_power;
        
        Ok(total_power)
    }
    
    async fn get_battery_level(&self) -> Result<Option<f32>> {
        let battery_manager = self.battery_manager.read().await;
        
        if let Some(ref manager) = *battery_manager {
            if let Ok(batteries) = manager.batteries() {
                for battery in batteries {
                    if let Ok(battery) = battery {
                        let state_of_charge = battery.state_of_charge().get::<battery::units::ratio::percent>();
                        return Ok(Some(state_of_charge));
                    }
                }
            }
        }
        
        Ok(None)
    }
    
    async fn calculate_efficiency_score(
        &self,
        cpu_usage: f32,
        power_consumption: f32,
        temperature: f32,
    ) -> u32 {
        // Efficiency score based on multiple factors
        let mut score = 100.0;
        
        // Penalize high power consumption
        if power_consumption > self.config.power_limit_watts {
            score -= ((power_consumption - self.config.power_limit_watts) / self.config.power_limit_watts) * 30.0;
        }
        
        // Penalize high temperature
        if temperature > 70.0 {
            score -= ((temperature - 70.0) / 30.0) * 20.0;
        }
        
        // Reward efficient CPU usage (not too low, not too high)
        let optimal_cpu_range = 40.0..=80.0;
        if !optimal_cpu_range.contains(&cpu_usage) {
            if cpu_usage < 40.0 {
                score -= (40.0 - cpu_usage) * 0.5;
            } else {
                score -= (cpu_usage - 80.0) * 0.3;
            }
        }
        
        score.max(0.0).min(100.0) as u32
    }
    
    async fn calculate_carbon_footprint(&self, power_consumption_watts: f32) -> f64 {
        if !self.config.carbon_tracking_enabled {
            return 0.0;
        }
        
        // Carbon intensity varies by region and energy source
        // Using global average: ~0.5 kg CO2 per kWh
        let carbon_intensity_kg_per_kwh = 0.5;
        let power_consumption_kw = power_consumption_watts as f64 / 1000.0;
        
        power_consumption_kw * carbon_intensity_kg_per_kwh
    }
    
    async fn optimize_power_usage(&self) -> Result<()> {
        let metrics = self.current_metrics.read().await;
        
        // Check if power consumption exceeds limits
        if metrics.power_consumption_watts > self.config.power_limit_watts {
            warn!("⚠️ Power consumption ({:.1}W) exceeds limit ({:.1}W)", 
                  metrics.power_consumption_watts, self.config.power_limit_watts);
            
            // Switch to more efficient power profile
            self.switch_to_efficient_profile().await?;
        }
        
        // Check efficiency score
        if metrics.efficiency_score < self.config.target_efficiency_score {
            info!("🔧 Efficiency score ({}) below target ({}), optimizing...", 
                  metrics.efficiency_score, self.config.target_efficiency_score);
            
            self.apply_efficiency_optimizations().await?;
        }
        
        Ok(())
    }
    
    async fn switch_to_efficient_profile(&self) -> Result<()> {
        let profiles = self.power_profiles.read().await;
        
        // Find the most efficient profile that meets current needs
        if let Some(efficient_profile) = profiles.iter()
            .filter(|p| p.max_power_watts <= self.config.power_limit_watts)
            .max_by_key(|p| p.target_efficiency) {
            
            info!("🔄 Switching to power profile: {}", efficient_profile.profile_name);
            
            // Apply profile settings (in real implementation, would adjust system settings)
            self.apply_power_profile(efficient_profile).await?;
        }
        
        Ok(())
    }
    
    async fn apply_power_profile(&self, profile: &PowerProfile) -> Result<()> {
        info!("⚙️ Applying power profile: {} (target efficiency: {}%)", 
              profile.profile_name, profile.target_efficiency);
        
        // In a real implementation, this would:
        // - Adjust CPU frequency scaling
        // - Modify thread pool sizes
        // - Change processing batch sizes
        // - Adjust network polling intervals
        
        Ok(())
    }
    
    async fn apply_efficiency_optimizations(&self) -> Result<()> {
        info!("🔧 Applying energy efficiency optimizations...");
        
        // Example optimizations:
        // - Reduce processing frequency
        // - Batch operations more aggressively
        // - Use more efficient algorithms
        // - Reduce network activity
        
        Ok(())
    }
    
    async fn update_carbon_footprint(&self) -> Result<()> {
        if !self.config.carbon_tracking_enabled {
            return Ok();
        }
        
        let metrics = self.current_metrics.read().await;
        
        // Log carbon footprint periodically
        if metrics.timestamp % 3600 == 0 { // Every hour
            info!("🌱 Carbon footprint: {:.4} kg CO2/hour", metrics.carbon_footprint_kg_per_hour);
        }
        
        Ok(())
    }
    
    pub async fn get_current_stats(&self) -> Result<EnergyStats> {
        let metrics = self.current_metrics.read().await;
        
        Ok(EnergyStats {
            power_watts: metrics.power_consumption_watts,
            efficiency_score: metrics.efficiency_score,
            carbon_footprint_kg_per_hour: metrics.carbon_footprint_kg_per_hour,
        })
    }
    
    pub async fn get_current_power_usage(&self) -> Result<f32> {
        let metrics = self.current_metrics.read().await;
        Ok(metrics.power_consumption_watts)
    }
    
    pub async fn solve_efficiency_challenge(&self, challenge_data: &str) -> Result<Option<String>> {
        debug!("🎯 Solving energy efficiency challenge: {}", challenge_data);
        
        // Parse challenge requirements
        let target_efficiency: u32 = challenge_data
            .split("target_efficiency:")
            .nth(1)
            .and_then(|s| s.trim().parse().ok())
            .unwrap_or(80);
        
        // Apply optimizations to meet target
        self.apply_efficiency_optimizations().await?;
        
        // Wait for metrics to update
        tokio::time::sleep(std::time::Duration::from_secs(5)).await;
        
        let current_stats = self.get_current_stats().await?;
        
        if current_stats.efficiency_score >= target_efficiency {
            let solution = format!("efficiency_achieved_{}", current_stats.efficiency_score);
            Ok(Some(solution))
        } else {
            Ok(None)
        }
    }
    
    pub async fn get_detailed_metrics(&self) -> EnergyMetrics {
        self.current_metrics.read().await.clone()
    }
    
    pub async fn get_power_profiles(&self) -> Vec<PowerProfile> {
        self.power_profiles.read().await.clone()
    }
}

impl Default for EnergyMetrics {
    fn default() -> Self {
        Self {
            cpu_usage_percent: 0.0,
            memory_usage_percent: 0.0,
            power_consumption_watts: 0.0,
            battery_level_percent: None,
            temperature_celsius: 25.0,
            efficiency_score: 50,
            carbon_footprint_kg_per_hour: 0.0,
            timestamp: chrono::Utc::now().timestamp() as u64,
        }
    }
}
