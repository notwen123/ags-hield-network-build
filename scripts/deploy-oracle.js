const { ethers } = require("hardhat")

async function main() {
  console.log("Deploying DAGShield Oracle contracts...")

  // Get the deployer account
  const [deployer] = await ethers.getSigners()
  console.log("Deploying contracts with account:", deployer.address)
  console.log("Account balance:", (await deployer.getBalance()).toString())

  // Deploy DAGOracle
  const DAGOracle = await ethers.getContractFactory("DAGOracle")
  const dagOracle = await DAGOracle.deploy()
  await dagOracle.deployed()
  console.log("DAGOracle deployed to:", dagOracle.address)

  // Deploy CrossChainRelay
  const CrossChainRelay = await ethers.getContractFactory("CrossChainRelay")
  const crossChainRelay = await CrossChainRelay.deploy(dagOracle.address)
  await crossChainRelay.deployed()
  console.log("CrossChainRelay deployed to:", crossChainRelay.address)

  // Configure oracle with relay contract
  const supportedChains = [1, 137, 56, 42161, 10] // Ethereum, Polygon, BSC, Arbitrum, Optimism

  for (const chainId of supportedChains) {
    await dagOracle.updateChainConfig(
      chainId,
      true, // active
      75, // minConfidence
      3, // consensusThreshold
      crossChainRelay.address, // relayContract
    )
    console.log(`Configured chain ${chainId} with relay contract`)
  }

  // Authorize the deployer as a node (for testing)
  await dagOracle.authorizeNode(deployer.address)
  console.log("Authorized deployer as oracle node")

  console.log("\nDeployment Summary:")
  console.log("==================")
  console.log("DAGOracle:", dagOracle.address)
  console.log("CrossChainRelay:", crossChainRelay.address)
  console.log("Supported Chains:", supportedChains.join(", "))

  // Save deployment addresses
  const { network } = require("hardhat")
  const deploymentInfo = {
    network: network.name,
    dagOracle: dagOracle.address,
    crossChainRelay: crossChainRelay.address,
    deployer: deployer.address,
    timestamp: new Date().toISOString(),
    supportedChains,
  }

  const fs = require("fs")
  const path = require("path")
  const deploymentsDir = path.join(__dirname, "..", "deployments")

  if (!fs.existsSync(deploymentsDir)) {
    fs.mkdirSync(deploymentsDir)
  }

  fs.writeFileSync(path.join(deploymentsDir, `${network.name}-oracle.json`), JSON.stringify(deploymentInfo, null, 2))

  console.log(`\nDeployment info saved to deployments/${network.name}-oracle.json`)
}

main()
  .then(() => process.exit(0))
  .catch((error) => {
    console.error(error)
    process.exit(1)
  })
