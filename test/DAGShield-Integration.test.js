const { expect } = require("chai")
const { ethers } = require("hardhat")
const { time } = require("@nomicfoundation/hardhat-network-helpers")

describe("DAGShield Integration Tests", () => {
  let dagToken, dagShield, dagOracle, dagStaking, dagGameification
  let owner, node1, node2, user1, user2
  const contracts = {}

  beforeEach(async () => {
    ;[owner, node1, node2, user1, user2] = await ethers.getSigners()

    // Deploy all contracts
    const DAGToken = await ethers.getContractFactory("DAGToken")
    dagToken = await DAGToken.deploy()
    contracts.dagToken = dagToken

    const DAGShield = await ethers.getContractFactory("DAGShield")
    dagShield = await DAGShield.deploy(dagToken.address)
    contracts.dagShield = dagShield

    const DAGOracle = await ethers.getContractFactory("DAGOracle")
    dagOracle = await DAGOracle.deploy()
    contracts.dagOracle = dagOracle

    const DAGStaking = await ethers.getContractFactory("DAGStaking")
    dagStaking = await DAGStaking.deploy(dagToken.address)
    contracts.dagStaking = dagStaking

    const DAGGameification = await ethers.getContractFactory("DAGGameification")
    dagGameification = await DAGGameification.deploy(dagToken.address)
    contracts.dagGameification = dagGameification

    // Set up permissions
    await dagToken.grantRole(await dagToken.MINTER_ROLE(), dagShield.address)
    await dagToken.grantRole(await dagToken.MINTER_ROLE(), dagStaking.address)
    await dagToken.grantRole(await dagToken.MINTER_ROLE(), dagGameification.address)

    // Authorize nodes
    await dagOracle.authorizeNode(node1.address)
    await dagOracle.authorizeNode(node2.address)

    // Mint initial tokens
    await dagToken.mint(user1.address, ethers.utils.parseEther("100000"))
    await dagToken.mint(user2.address, ethers.utils.parseEther("100000"))
  })

  describe("End-to-End Threat Detection Flow", () => {
    it("Should complete full threat detection and reward cycle", async () => {
      // 1. Submit threat report
      const threatData = {
        chainId: 1,
        contractAddress: "0x1234567890123456789012345678901234567890",
        threatLevel: 8,
        threatType: 1, // phishing
        evidenceHash: ethers.utils.keccak256(ethers.utils.toUtf8Bytes("evidence")),
        confidence: 95,
      }

      // Generate signature
      const messageHash = ethers.utils.keccak256(
        ethers.utils.defaultAbiCoder.encode(
          ["uint256", "address", "uint8", "uint8", "bytes32"],
          [
            threatData.chainId,
            threatData.contractAddress,
            threatData.threatLevel,
            threatData.threatType,
            threatData.evidenceHash,
          ],
        ),
      )
      const signature = await node1.signMessage(ethers.utils.arrayify(messageHash))

      // Submit threat report
      await dagOracle
        .connect(node1)
        .submitThreatReport(
          threatData.chainId,
          threatData.contractAddress,
          threatData.threatLevel,
          threatData.threatType,
          threatData.evidenceHash,
          threatData.confidence,
          signature,
        )

      // 2. Other nodes vote on the threat
      const reportId = ethers.utils.keccak256(
        ethers.utils.defaultAbiCoder.encode(
          ["uint256", "address", "uint8", "bytes32", "uint256"],
          [
            threatData.chainId,
            threatData.contractAddress,
            threatData.threatType,
            threatData.evidenceHash,
            (await ethers.provider.getBlock("latest")).timestamp,
          ],
        ),
      )

      await dagOracle.connect(node2).voteOnThreat(reportId, true)

      // 3. Check threat verification
      const report = await dagOracle.getThreatReport(reportId)
      expect(report.verified).to.be.true

      // 4. Update user activity and check gamification
      await dagGameification.updateUserActivity(node1.address, 1, 99, 1)

      const userStats = await dagGameification.getUserStats(node1.address)
      expect(userStats.threatsDetected).to.equal(1)
      expect(userStats.level).to.be.gt(0)
    })

    it("Should handle cross-chain threat propagation", async () => {
      // Configure cross-chain relay
      const CrossChainRelay = await ethers.getContractFactory("CrossChainRelay")
      const crossChainRelay = await CrossChainRelay.deploy(dagOracle.address)

      await dagOracle.updateChainConfig(137, true, 75, 3, crossChainRelay.address)

      // Submit high-severity threat that should trigger cross-chain alert
      const threatData = {
        chainId: 1,
        contractAddress: "0x1234567890123456789012345678901234567890",
        threatLevel: 9, // High severity
        threatType: 2, // rug pull
        evidenceHash: ethers.utils.keccak256(ethers.utils.toUtf8Bytes("evidence")),
        confidence: 98,
      }

      const messageHash = ethers.utils.keccak256(
        ethers.utils.defaultAbiCoder.encode(
          ["uint256", "address", "uint8", "uint8", "bytes32"],
          [
            threatData.chainId,
            threatData.contractAddress,
            threatData.threatLevel,
            threatData.threatType,
            threatData.evidenceHash,
          ],
        ),
      )
      const signature = await node1.signMessage(ethers.utils.arrayify(messageHash))

      const tx = await dagOracle
        .connect(node1)
        .submitThreatReport(
          threatData.chainId,
          threatData.contractAddress,
          threatData.threatLevel,
          threatData.threatType,
          threatData.evidenceHash,
          threatData.confidence,
          signature,
        )

      // Check for CrossChainAlert event
      const receipt = await tx.wait()
      const crossChainEvent = receipt.events?.find((e) => e.event === "CrossChainAlert")
      expect(crossChainEvent).to.not.be.undefined
    })
  })

  describe("Staking and Rewards Integration", () => {
    it("Should stake tokens and earn rewards with multipliers", async () => {
      const stakeAmount = ethers.utils.parseEther("10000")

      // Approve and stake
      await dagToken.connect(user1).approve(dagStaking.address, stakeAmount)
      await dagStaking.connect(user1).stake(1, stakeAmount) // Flexible pool

      // Set reward multipliers
      await dagStaking.updateRewardMultipliers(
        user1.address,
        2500, // 25% node performance
        1500, // 15% threat detection
        1000, // 10% community participation
        0, // No loyalty bonus yet
      )

      // Fast forward time
      await time.increase(86400) // 1 day

      // Calculate and claim rewards
      const rewards = await dagStaking.calculateRewards(user1.address, 1)
      expect(rewards).to.be.gt(0)

      const balanceBefore = await dagToken.balanceOf(user1.address)
      await dagStaking.connect(user1).claimRewards(1)
      const balanceAfter = await dagToken.balanceOf(user1.address)

      expect(balanceAfter).to.be.gt(balanceBefore)
    })

    it("Should handle emergency unstaking with penalties", async () => {
      const stakeAmount = ethers.utils.parseEther("5000")

      // Stake in 90-day lock pool
      await dagToken.connect(user1).approve(dagStaking.address, stakeAmount)
      await dagStaking.connect(user1).stake(3, stakeAmount)

      const balanceBefore = await dagToken.balanceOf(user1.address)

      // Emergency unstake (should incur penalty)
      await dagStaking.connect(user1).emergencyUnstake(3)

      const balanceAfter = await dagToken.balanceOf(user1.address)
      const returned = balanceAfter.sub(balanceBefore)

      // Should receive less than staked due to penalty
      expect(returned).to.be.lt(stakeAmount)
    })
  })

  describe("Gamification System", () => {
    it("Should complete challenges and unlock achievements", async () => {
      // Create a test challenge
      await dagGameification.createChallenge(
        "Test Challenge",
        "Detect 5 threats",
        5, // target
        ethers.utils.parseEther("500"), // reward
        86400, // 1 day duration
        0, // THREAT_DETECTION type
      )

      // Update user activity to complete challenge
      await dagGameification.updateUserActivity(user1.address, 5, 99, 2)

      const userStats = await dagGameification.getUserStats(user1.address)
      expect(userStats.challengesCompleted).to.equal(1)

      // Check if achievement was unlocked
      const achievements = await dagGameification.getUserAchievements(user1.address)
      expect(achievements.length).to.be.gt(0)
    })

    it("Should calculate correct reward multipliers", async () => {
      // Update user stats to trigger level up
      await dagGameification.updateUserActivity(user1.address, 100, 99, 50)

      const multiplier = await dagGameification.calculateRewardMultiplier(user1.address)
      expect(multiplier).to.be.gt(100) // Should be greater than base 100%
    })
  })

  describe("Network Performance Tests", () => {
    it("Should handle multiple concurrent threat reports", async () => {
      const promises = []

      for (let i = 0; i < 5; i++) {
        const threatData = {
          chainId: 1,
          contractAddress: `0x123456789012345678901234567890123456789${i}`,
          threatLevel: 5 + i,
          threatType: 1,
          evidenceHash: ethers.utils.keccak256(ethers.utils.toUtf8Bytes(`evidence${i}`)),
          confidence: 80 + i,
        }

        const messageHash = ethers.utils.keccak256(
          ethers.utils.defaultAbiCoder.encode(
            ["uint256", "address", "uint8", "uint8", "bytes32"],
            [
              threatData.chainId,
              threatData.contractAddress,
              threatData.threatLevel,
              threatData.threatType,
              threatData.evidenceHash,
            ],
          ),
        )
        const signature = await node1.signMessage(ethers.utils.arrayify(messageHash))

        promises.push(
          dagOracle
            .connect(node1)
            .submitThreatReport(
              threatData.chainId,
              threatData.contractAddress,
              threatData.threatLevel,
              threatData.threatType,
              threatData.evidenceHash,
              threatData.confidence,
              signature,
            ),
        )
      }

      // All should succeed
      await Promise.all(promises)
    })

    it("Should maintain consistent state across multiple operations", async () => {
      const initialBalance = await dagToken.balanceOf(user1.address)

      // Perform multiple operations
      await dagToken.connect(user1).approve(dagStaking.address, ethers.utils.parseEther("50000"))
      await dagStaking.connect(user1).stake(1, ethers.utils.parseEther("10000"))
      await dagStaking.connect(user1).stake(2, ethers.utils.parseEther("5000"))

      await dagGameification.updateUserActivity(user1.address, 10, 98, 5)

      await time.increase(3600) // 1 hour

      await dagStaking.connect(user1).claimRewards(1)
      await dagStaking.connect(user1).claimRewards(2)

      // Check final state consistency
      const finalBalance = await dagToken.balanceOf(user1.address)
      const totalStaked = await dagStaking.getTotalStaked(user1.address)

      expect(totalStaked).to.equal(ethers.utils.parseEther("15000"))
      expect(finalBalance).to.be.gt(initialBalance.sub(ethers.utils.parseEther("15000")))
    })
  })

  describe("Security Tests", () => {
    it("Should prevent unauthorized access to admin functions", async () => {
      await expect(dagOracle.connect(user1).authorizeNode(user2.address)).to.be.revertedWith(
        "Ownable: caller is not the owner",
      )

      await expect(
        dagStaking.connect(user1).updateRewardMultipliers(user1.address, 5000, 3000, 2000, 10000),
      ).to.be.revertedWith("Ownable: caller is not the owner")
    })

    it("Should validate threat report parameters", async () => {
      const invalidThreatData = {
        chainId: 999, // Unsupported chain
        contractAddress: "0x1234567890123456789012345678901234567890",
        threatLevel: 11, // Invalid level (max 10)
        threatType: 1,
        evidenceHash: ethers.utils.keccak256(ethers.utils.toUtf8Bytes("evidence")),
        confidence: 50, // Below minimum
      }

      const messageHash = ethers.utils.keccak256(
        ethers.utils.defaultAbiCoder.encode(
          ["uint256", "address", "uint8", "uint8", "bytes32"],
          [
            invalidThreatData.chainId,
            invalidThreatData.contractAddress,
            invalidThreatData.threatLevel,
            invalidThreatData.threatType,
            invalidThreatData.evidenceHash,
          ],
        ),
      )
      const signature = await node1.signMessage(ethers.utils.arrayify(messageHash))

      await expect(
        dagOracle
          .connect(node1)
          .submitThreatReport(
            invalidThreatData.chainId,
            invalidThreatData.contractAddress,
            invalidThreatData.threatLevel,
            invalidThreatData.threatType,
            invalidThreatData.evidenceHash,
            invalidThreatData.confidence,
            signature,
          ),
      ).to.be.reverted
    })
  })
})
