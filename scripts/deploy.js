const { ethers } = require("hardhat")

async function main() {
  console.log("🚀 Deploying DAGShield contracts...")

  // Get the deployer account
  const [deployer] = await ethers.getSigners()
  console.log("Deploying contracts with account:", deployer.address)
  console.log("Account balance:", (await deployer.provider.getBalance(deployer.address)).toString())

  // Deploy DAGToken first
  console.log("\n📄 Deploying DAGToken...")
  const DAGToken = await ethers.getContractFactory("DAGToken")
  const dagToken = await DAGToken.deploy()
  await dagToken.waitForDeployment()
  const tokenAddress = await dagToken.getAddress()
  console.log("✅ DAGToken deployed to:", tokenAddress)

  // Deploy DAGShield main contract
  console.log("\n🛡️ Deploying DAGShield...")
  const DAGShield = await ethers.getContractFactory("DAGShield")
  const dagShield = await DAGShield.deploy(tokenAddress)
  await dagShield.waitForDeployment()
  const shieldAddress = await dagShield.getAddress()
  console.log("✅ DAGShield deployed to:", shieldAddress)

  // Initial setup
  console.log("\n⚙️ Setting up initial configuration...")

  // Transfer some tokens to the DAGShield contract for rewards
  const initialRewardPool = ethers.parseEther("1000000") // 1M tokens
  await dagToken.transfer(shieldAddress, initialRewardPool)
  console.log("✅ Transferred 1M tokens to DAGShield for rewards")

  // Create initial challenge
  const challengeType = "threat_detection_accuracy"
  const expectedResult = ethers.keccak256(ethers.toUtf8Bytes("sample_threat_signature"))
  const challengeReward = ethers.parseEther("1000") // 1000 tokens

  await dagShield.createChallenge(challengeType, expectedResult, challengeReward)
  console.log("✅ Created initial challenge")

  console.log("\n🎉 Deployment completed successfully!")
  console.log("📋 Contract Addresses:")
  console.log("   DAGToken:", tokenAddress)
  console.log("   DAGShield:", shieldAddress)

  console.log("\n📊 Network Stats:")
  const stats = await dagShield.getNetworkStats()
  console.log("   Total Nodes:", stats[0].toString())
  console.log("   Total Staked:", ethers.formatEther(stats[1]), "ETH")
  console.log("   Total Threats:", stats[2].toString())
  console.log("   Verified Threats:", stats[3].toString())

  // Save deployment info
  const deploymentInfo = {
    network: await ethers.provider.getNetwork(),
    deployer: deployer.address,
    contracts: {
      DAGToken: tokenAddress,
      DAGShield: shieldAddress,
    },
    timestamp: new Date().toISOString(),
  }

  console.log("\n💾 Deployment Info:", JSON.stringify(deploymentInfo, null, 2))
}

main()
  .then(() => process.exit(0))
  .catch((error) => {
    console.error("❌ Deployment failed:", error)
    process.exit(1)
  })
