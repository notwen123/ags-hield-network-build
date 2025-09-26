const { ethers } = require("hardhat")
const fs = require("fs")
const path = require("path")

async function main() {
  console.log("🚀 Deploying DAGShield Full Network...\n")

  const [deployer] = await ethers.getSigners()
  console.log("Deploying with account:", deployer.address)
  console.log("Account balance:", ethers.utils.formatEther(await deployer.getBalance()), "ETH\n")

  const deployments = {}
  const { network } = require("hardhat")

  try {
    // 1. Deploy DAGToken
    console.log("📄 Deploying DAGToken...")
    const DAGToken = await ethers.getContractFactory("DAGToken")
    const dagToken = await DAGToken.deploy()
    await dagToken.deployed()
    deployments.dagToken = dagToken.address
    console.log("✅ DAGToken deployed to:", dagToken.address)

    // 2. Deploy DAGShield main contract
    console.log("\n🛡️  Deploying DAGShield...")
    const DAGShield = await ethers.getContractFactory("DAGShield")
    const dagShield = await DAGShield.deploy(dagToken.address)
    await dagShield.deployed()
    deployments.dagShield = dagShield.address
    console.log("✅ DAGShield deployed to:", dagShield.address)

    // 3. Deploy DAGOracle
    console.log("\n🔮 Deploying DAGOracle...")
    const DAGOracle = await ethers.getContractFactory("DAGOracle")
    const dagOracle = await DAGOracle.deploy()
    await dagOracle.deployed()
    deployments.dagOracle = dagOracle.address
    console.log("✅ DAGOracle deployed to:", dagOracle.address)

    // 4. Deploy CrossChainRelay
    console.log("\n🌉 Deploying CrossChainRelay...")
    const CrossChainRelay = await ethers.getContractFactory("CrossChainRelay")
    const crossChainRelay = await CrossChainRelay.deploy(dagOracle.address)
    await crossChainRelay.deployed()
    deployments.crossChainRelay = crossChainRelay.address
    console.log("✅ CrossChainRelay deployed to:", crossChainRelay.address)

    // 5. Deploy DAGStaking
    console.log("\n💰 Deploying DAGStaking...")
    const DAGStaking = await ethers.getContractFactory("DAGStaking")
    const dagStaking = await DAGStaking.deploy(dagToken.address)
    await dagStaking.deployed()
    deployments.dagStaking = dagStaking.address
    console.log("✅ DAGStaking deployed to:", dagStaking.address)

    // 6. Deploy DAGGameification
    console.log("\n🎮 Deploying DAGGameification...")
    const DAGGameification = await ethers.getContractFactory("DAGGameification")
    const dagGameification = await DAGGameification.deploy(dagToken.address)
    await dagGameification.deployed()
    deployments.dagGameification = dagGameification.address
    console.log("✅ DAGGameification deployed to:", dagGameification.address)

    // 7. Deploy Governance (TimelockController first)
    console.log("\n🏛️  Deploying Governance System...")
    const TimelockController = await ethers.getContractFactory("TimelockController")
    const timelock = await TimelockController.deploy(
      86400, // 1 day delay
      [deployer.address], // proposers
      [deployer.address], // executors
      deployer.address, // admin
    )
    await timelock.deployed()
    deployments.timelock = timelock.address
    console.log("✅ TimelockController deployed to:", timelock.address)

    const DAGGovernance = await ethers.getContractFactory("DAGGovernance")
    const dagGovernance = await DAGGovernance.deploy(
      dagToken.address, // voting token
      timelock.address, // timelock
      4, // 4% quorum
      17280, // ~3 days voting period (assuming 15s blocks)
      1, // 1 block voting delay
    )
    await dagGovernance.deployed()
    deployments.dagGovernance = dagGovernance.address
    console.log("✅ DAGGovernance deployed to:", dagGovernance.address)

    // 8. Configure contracts
    console.log("\n⚙️  Configuring contracts...")

    // Set up token minting permissions
    await dagToken.grantRole(await dagToken.MINTER_ROLE(), dagShield.address)
    await dagToken.grantRole(await dagToken.MINTER_ROLE(), dagStaking.address)
    await dagToken.grantRole(await dagToken.MINTER_ROLE(), dagGameification.address)
    console.log("✅ Token minting permissions configured")

    // Configure oracle with relay
    const supportedChains = [1, 137, 56, 42161, 10]
    for (const chainId of supportedChains) {
      await dagOracle.updateChainConfig(
        chainId,
        true, // active
        75, // minConfidence
        3, // consensusThreshold
        crossChainRelay.address,
      )
    }
    console.log("✅ Oracle cross-chain configuration completed")

    // Authorize deployer as oracle node for testing
    await dagOracle.authorizeNode(deployer.address)
    console.log("✅ Deployer authorized as oracle node")

    // Configure staking contract with gamification
    await dagStaking.updateRewardMultipliers(
      deployer.address,
      2500, // 25% node performance bonus
      1500, // 15% threat detection bonus
      1000, // 10% community participation bonus
      3000, // 30% loyalty bonus
    )
    console.log("✅ Staking reward multipliers configured")

    // Initial token distribution for testing
    const initialSupply = ethers.utils.parseEther("1000000") // 1M tokens
    await dagToken.mint(deployer.address, initialSupply)
    console.log("✅ Initial token supply minted")

    // 9. Save deployment information
    const deploymentInfo = {
      network: network.name,
      chainId: network.config.chainId,
      deployer: deployer.address,
      timestamp: new Date().toISOString(),
      contracts: deployments,
      configuration: {
        supportedChains,
        initialSupply: initialSupply.toString(),
        governanceSettings: {
          votingDelay: 1,
          votingPeriod: 17280,
          quorum: 4,
          timelockDelay: 86400,
        },
      },
    }

    const deploymentsDir = path.join(__dirname, "..", "deployments")
    if (!fs.existsSync(deploymentsDir)) {
      fs.mkdirSync(deploymentsDir)
    }

    fs.writeFileSync(
      path.join(deploymentsDir, `${network.name}-full-deployment.json`),
      JSON.stringify(deploymentInfo, null, 2),
    )

    // 10. Generate contract addresses file for frontend
    const contractAddresses = {
      DAGToken: dagToken.address,
      DAGShield: dagShield.address,
      DAGOracle: dagOracle.address,
      CrossChainRelay: crossChainRelay.address,
      DAGStaking: dagStaking.address,
      DAGGameification: dagGameification.address,
      DAGGovernance: dagGovernance.address,
      TimelockController: timelock.address,
    }

    fs.writeFileSync(path.join(__dirname, "..", "frontend-contracts.json"), JSON.stringify(contractAddresses, null, 2))

    console.log("\n🎉 DAGShield Network Deployment Complete!")
    console.log("==========================================")
    console.log("📄 DAGToken:", dagToken.address)
    console.log("🛡️  DAGShield:", dagShield.address)
    console.log("🔮 DAGOracle:", dagOracle.address)
    console.log("🌉 CrossChainRelay:", crossChainRelay.address)
    console.log("💰 DAGStaking:", dagStaking.address)
    console.log("🎮 DAGGameification:", dagGameification.address)
    console.log("🏛️  DAGGovernance:", dagGovernance.address)
    console.log("⏰ TimelockController:", timelock.address)
    console.log("\n📁 Deployment info saved to:", `deployments/${network.name}-full-deployment.json`)
    console.log("📁 Contract addresses saved to: frontend-contracts.json")
  } catch (error) {
    console.error("\n❌ Deployment failed:", error)
    process.exit(1)
  }
}

main()
  .then(() => process.exit(0))
  .catch((error) => {
    console.error(error)
    process.exit(1)
  })
