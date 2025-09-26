const { ethers } = require("hardhat")
const fs = require("fs")

class NetworkMonitor {
  constructor(contractAddresses) {
    this.contracts = contractAddresses
    this.metrics = {
      totalThreatsDetected: 0,
      totalValueLocked: 0,
      activeNodes: 0,
      networkHealth: 100,
      lastUpdate: Date.now(),
    }
  }

  async initialize() {
    console.log("🔍 Initializing DAGShield Network Monitor...")

    // Connect to contracts
    this.dagToken = await ethers.getContractAt("DAGToken", this.contracts.DAGToken)
    this.dagShield = await ethers.getContractAt("DAGShield", this.contracts.DAGShield)
    this.dagOracle = await ethers.getContractAt("DAGOracle", this.contracts.DAGOracle)
    this.dagStaking = await ethers.getContractAt("DAGStaking", this.contracts.DAGStaking)
    this.dagGameification = await ethers.getContractAt("DAGGameification", this.contracts.DAGGameification)

    console.log("✅ Connected to all contracts")

    // Set up event listeners
    this.setupEventListeners()

    // Start monitoring loop
    this.startMonitoring()
  }

  setupEventListeners() {
    console.log("👂 Setting up event listeners...")

    // Threat detection events
    this.dagOracle.on("ThreatReported", (reportId, chainId, contractAddress, threatLevel) => {
      console.log(`🚨 Threat Reported: Level ${threatLevel} on chain ${chainId}`)
      console.log(`   Contract: ${contractAddress}`)
      console.log(`   Report ID: ${reportId}`)
      this.metrics.totalThreatsDetected++
      this.logMetric("threat_reported", { reportId, chainId, contractAddress, threatLevel })
    })

    this.dagOracle.on("ThreatVerified", (reportId, consensusScore) => {
      console.log(`✅ Threat Verified: ${reportId} (Consensus: ${consensusScore})`)
      this.logMetric("threat_verified", { reportId, consensusScore })
    })

    this.dagOracle.on("CrossChainAlert", (targetChain, reportId, threatLevel) => {
      console.log(`🌐 Cross-Chain Alert: Level ${threatLevel} threat propagated to chain ${targetChain}`)
      this.logMetric("cross_chain_alert", { targetChain, reportId, threatLevel })
    })

    // Staking events
    this.dagStaking.on("Staked", (user, poolId, amount) => {
      console.log(`💰 Stake: ${ethers.utils.formatEther(amount)} DAG in pool ${poolId} by ${user}`)
      this.logMetric("staked", { user, poolId, amount: ethers.utils.formatEther(amount) })
    })

    this.dagStaking.on("RewardsClaimed", (user, amount) => {
      console.log(`🎁 Rewards Claimed: ${ethers.utils.formatEther(amount)} DAG by ${user}`)
      this.logMetric("rewards_claimed", { user, amount: ethers.utils.formatEther(amount) })
    })

    // Gamification events
    this.dagGameification.on("ChallengeCompleted", (user, challengeId, reward) => {
      console.log(`🏆 Challenge Completed: User ${user} earned ${ethers.utils.formatEther(reward)} DAG`)
      this.logMetric("challenge_completed", { user, challengeId, reward: ethers.utils.formatEther(reward) })
    })

    this.dagGameification.on("AchievementUnlocked", (user, achievementId, reward) => {
      console.log(`🎖️  Achievement Unlocked: User ${user} earned ${ethers.utils.formatEther(reward)} DAG`)
      this.logMetric("achievement_unlocked", { user, achievementId, reward: ethers.utils.formatEther(reward) })
    })

    this.dagGameification.on("LevelUp", (user, newLevel) => {
      console.log(`📈 Level Up: User ${user} reached level ${newLevel}`)
      this.logMetric("level_up", { user, newLevel })
    })
  }

  async startMonitoring() {
    console.log("🚀 Starting network monitoring...\n")

    setInterval(async () => {
      await this.updateMetrics()
      this.displayMetrics()
    }, 30000) // Update every 30 seconds

    // Initial metrics update
    await this.updateMetrics()
    this.displayMetrics()
  }

  async updateMetrics() {
    try {
      // Get total value locked
      this.metrics.totalValueLocked = await this.dagStaking.totalValueLocked()

      // Get token supply
      this.metrics.totalSupply = await this.dagToken.totalSupply()

      // Calculate network health (simplified)
      const currentTime = Date.now()
      const timeSinceLastUpdate = currentTime - this.metrics.lastUpdate

      // Network health decreases if no activity for too long
      if (timeSinceLastUpdate > 300000) {
        // 5 minutes
        this.metrics.networkHealth = Math.max(0, this.metrics.networkHealth - 1)
      } else {
        this.metrics.networkHealth = Math.min(100, this.metrics.networkHealth + 0.1)
      }

      this.metrics.lastUpdate = currentTime
    } catch (error) {
      console.error("❌ Error updating metrics:", error.message)
      this.metrics.networkHealth = Math.max(0, this.metrics.networkHealth - 5)
    }
  }

  displayMetrics() {
    console.clear()
    console.log("🛡️  DAGShield Network Monitor")
    console.log("================================")
    console.log(`📊 Network Health: ${this.metrics.networkHealth.toFixed(1)}%`)
    console.log(`🚨 Total Threats Detected: ${this.metrics.totalThreatsDetected}`)
    console.log(`💰 Total Value Locked: ${ethers.utils.formatEther(this.metrics.totalValueLocked || 0)} DAG`)
    console.log(`🪙 Total Supply: ${ethers.utils.formatEther(this.metrics.totalSupply || 0)} DAG`)
    console.log(`🕐 Last Update: ${new Date(this.metrics.lastUpdate).toLocaleTimeString()}`)
    console.log("================================\n")

    // Save metrics to file
    this.saveMetrics()
  }

  logMetric(eventType, data) {
    const logEntry = {
      timestamp: new Date().toISOString(),
      type: eventType,
      data: data,
    }

    // Append to log file
    fs.appendFileSync("network-activity.log", JSON.stringify(logEntry) + "\n")
  }

  saveMetrics() {
    const metricsData = {
      ...this.metrics,
      timestamp: new Date().toISOString(),
    }

    fs.writeFileSync("network-metrics.json", JSON.stringify(metricsData, null, 2))
  }

  async generateReport() {
    console.log("📋 Generating Network Report...")

    const report = {
      timestamp: new Date().toISOString(),
      metrics: this.metrics,
      contracts: this.contracts,
      summary: {
        status:
          this.metrics.networkHealth > 90
            ? "Excellent"
            : this.metrics.networkHealth > 70
              ? "Good"
              : this.metrics.networkHealth > 50
                ? "Fair"
                : "Poor",
        recommendations: [],
      },
    }

    if (this.metrics.networkHealth < 90) {
      report.summary.recommendations.push("Monitor network activity more closely")
    }

    if (this.metrics.totalThreatsDetected === 0) {
      report.summary.recommendations.push("Consider running threat detection tests")
    }

    fs.writeFileSync(`network-report-${Date.now()}.json`, JSON.stringify(report, null, 2))

    console.log("✅ Network report generated")
    return report
  }
}

// Load contract addresses and start monitoring
async function main() {
  try {
    const contractAddresses = JSON.parse(fs.readFileSync("frontend-contracts.json", "utf8"))

    const monitor = new NetworkMonitor(contractAddresses)
    await monitor.initialize()

    // Generate report every hour
    setInterval(async () => {
      await monitor.generateReport()
    }, 3600000)
  } catch (error) {
    console.error("❌ Failed to start network monitor:", error)
    process.exit(1)
  }
}

if (require.main === module) {
  main().catch(console.error)
}

module.exports = NetworkMonitor
