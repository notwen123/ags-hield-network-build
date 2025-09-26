const { expect } = require("chai")
const { ethers } = require("hardhat")

describe("DAGShield", () => {
  let dagToken, dagShield
  let owner, node1, node2, node3
  let tokenAddress, shieldAddress

  beforeEach(async () => {
    ;[owner, node1, node2, node3] = await ethers.getSigners()

    // Deploy DAGToken
    const DAGToken = await ethers.getContractFactory("DAGToken")
    dagToken = await DAGToken.deploy()
    await dagToken.waitForDeployment()
    tokenAddress = await dagToken.getAddress()

    // Deploy DAGShield
    const DAGShield = await ethers.getContractFactory("DAGShield")
    dagShield = await DAGShield.deploy(tokenAddress)
    await dagShield.waitForDeployment()
    shieldAddress = await dagShield.getAddress()
  })

  describe("Node Registration", () => {
    it("Should register a node successfully", async () => {
      const nodeId = "node_001"
      const stakeAmount = ethers.parseEther("100")

      await expect(dagShield.connect(node1).registerNode(nodeId, { value: stakeAmount }))
        .to.emit(dagShield, "NodeRegistered")
        .withArgs(node1.address, nodeId, stakeAmount, (await ethers.provider.getBlockNumber()) + 1)

      const nodeInfo = await dagShield.getNode(node1.address)
      expect(nodeInfo.nodeId).to.equal(nodeId)
      expect(nodeInfo.active).to.be.true
      expect(nodeInfo.stake).to.equal(stakeAmount)
    })

    it("Should fail with insufficient stake", async () => {
      const nodeId = "node_001"
      const insufficientStake = ethers.parseEther("50")

      await expect(dagShield.connect(node1).registerNode(nodeId, { value: insufficientStake })).to.be.revertedWith(
        "Insufficient stake",
      )
    })
  })

  describe("Threat Reporting", () => {
    beforeEach(async () => {
      // Register a node first
      const nodeId = "node_001"
      const stakeAmount = ethers.parseEther("100")
      await dagShield.connect(node1).registerNode(nodeId, { value: stakeAmount })
    })

    it("Should report a threat successfully", async () => {
      const threatType = "phishing"
      const targetAddress = "0x1234567890123456789012345678901234567890"
      const confidence = 85
      const chainId = 1

      await expect(dagShield.connect(node1).reportThreat(threatType, targetAddress, confidence, chainId)).to.emit(
        dagShield,
        "ThreatDetected",
      )

      const stats = await dagShield.getNetworkStats()
      expect(stats[2]).to.equal(1) // totalThreats should be 1
    })

    it("Should fail with low confidence", async () => {
      const threatType = "phishing"
      const targetAddress = "0x1234567890123456789012345678901234567890"
      const lowConfidence = 60
      const chainId = 1

      await expect(
        dagShield.connect(node1).reportThreat(threatType, targetAddress, lowConfidence, chainId),
      ).to.be.revertedWith("Confidence too low")
    })
  })

  describe("Threat Voting", () => {
    let alertId

    beforeEach(async () => {
      // Register nodes
      const stakeAmount = ethers.parseEther("100")
      await dagShield.connect(node1).registerNode("node_001", { value: stakeAmount })
      await dagShield.connect(node2).registerNode("node_002", { value: stakeAmount })
      await dagShield.connect(node3).registerNode("node_003", { value: stakeAmount })

      // Report a threat
      const threatType = "phishing"
      const targetAddress = "0x1234567890123456789012345678901234567890"
      const confidence = 85
      const chainId = 1

      const tx = await dagShield.connect(node1).reportThreat(threatType, targetAddress, confidence, chainId)
      const receipt = await tx.wait()

      // Extract alertId from the event
      const event = receipt.logs.find((log) => log.fragment && log.fragment.name === "ThreatDetected")
      alertId = event.args[0]
    })

    it("Should allow voting on threats", async () => {
      await expect(dagShield.connect(node2).voteOnThreat(alertId, true)).to.not.be.reverted

      await expect(dagShield.connect(node3).voteOnThreat(alertId, true)).to.not.be.reverted
    })

    it("Should prevent double voting", async () => {
      await dagShield.connect(node2).voteOnThreat(alertId, true)

      await expect(dagShield.connect(node2).voteOnThreat(alertId, true)).to.be.revertedWith("Already voted")
    })
  })

  describe("Challenges", () => {
    it("Should create and complete challenges", async () => {
      const challengeType = "threat_detection"
      const expectedResult = ethers.keccak256(ethers.toUtf8Bytes("correct_answer"))
      const reward = ethers.parseEther("100")

      await dagShield.createChallenge(challengeType, expectedResult, reward)

      // Register a node
      const stakeAmount = ethers.parseEther("100")
      await dagShield.connect(node1).registerNode("node_001", { value: stakeAmount })

      // Submit correct solution
      const challengeId = ethers.keccak256(
        ethers.solidityPacked(
          ["string", "bytes32", "uint256"],
          [challengeType, expectedResult, await ethers.provider.getBlockNumber()],
        ),
      )

      await expect(dagShield.connect(node1).submitChallengeSolution(challengeId, expectedResult)).to.not.be.reverted
    })
  })

  describe("Token Integration", () => {
    it("Should handle staking correctly", async () => {
      const stakeAmount = ethers.parseEther("1000")
      const stakeDuration = 90 * 24 * 60 * 60 // 90 days

      await expect(dagToken.connect(owner).stake(stakeAmount, stakeDuration)).to.emit(dagToken, "Staked")

      const userStakes = await dagToken.getUserStakes(owner.address)
      expect(userStakes.length).to.equal(1)
      expect(userStakes[0].amount).to.equal(stakeAmount)
    })

    it("Should calculate rewards correctly", async () => {
      const stakeAmount = ethers.parseEther("1000")
      const stakeDuration = 90 * 24 * 60 * 60 // 90 days

      await dagToken.connect(owner).stake(stakeAmount, stakeDuration)

      const pendingRewards = await dagToken.getTotalPendingRewards(owner.address)
      expect(pendingRewards).to.be.gt(0)
    })
  })

  describe("Network Statistics", () => {
    it("Should track network stats correctly", async () => {
      // Register multiple nodes
      const stakeAmount = ethers.parseEther("100")
      await dagShield.connect(node1).registerNode("node_001", { value: stakeAmount })
      await dagShield.connect(node2).registerNode("node_002", { value: stakeAmount })

      const stats = await dagShield.getNetworkStats()
      expect(stats[0]).to.equal(2) // totalNodes
      expect(stats[1]).to.equal(stakeAmount * 2n) // totalStaked
    })
  })
})
