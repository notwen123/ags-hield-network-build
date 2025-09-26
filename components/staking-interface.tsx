"use client"

import { useState } from "react"
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card"
import { Button } from "@/components/ui/button"
import { Badge } from "@/components/ui/badge"
import { Input } from "@/components/ui/input"
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs"
import { Lock, Unlock, Coins, Calculator } from "lucide-react"

const stakingPools = [
  {
    id: 1,
    name: "Flexible Staking",
    apy: 5,
    minStake: 0,
    lockPeriod: 0,
    totalStaked: 2500000,
    capacity: "Unlimited",
    type: "flexible",
  },
  {
    id: 2,
    name: "30-Day Lock",
    apy: 8,
    minStake: 1000,
    lockPeriod: 30,
    totalStaked: 1800000,
    capacity: "Unlimited",
    type: "fixed",
  },
  {
    id: 3,
    name: "90-Day Lock",
    apy: 12,
    minStake: 5000,
    lockPeriod: 90,
    totalStaked: 3200000,
    capacity: "Unlimited",
    type: "fixed",
  },
  {
    id: 4,
    name: "180-Day Lock",
    apy: 18,
    minStake: 10000,
    lockPeriod: 180,
    totalStaked: 2100000,
    capacity: "Unlimited",
    type: "fixed",
  },
  {
    id: 5,
    name: "365-Day Lock",
    apy: 25,
    minStake: 25000,
    lockPeriod: 365,
    totalStaked: 5400000,
    capacity: "Unlimited",
    type: "fixed",
  },
  {
    id: 6,
    name: "Node Operator Pool",
    apy: 30,
    minStake: 50000,
    lockPeriod: 90,
    totalStaked: 8500000,
    capacity: 10000000,
    type: "special",
  },
]

const userStakes = [
  {
    poolId: 3,
    poolName: "90-Day Lock",
    amount: 15000,
    stakeTime: "2024-01-15",
    unlockTime: "2024-04-15",
    apy: 12,
    accumulatedRewards: 450,
    status: "active",
  },
  {
    poolId: 6,
    poolName: "Node Operator Pool",
    amount: 75000,
    stakeTime: "2024-02-01",
    unlockTime: "2024-05-01",
    apy: 30,
    accumulatedRewards: 2250,
    status: "active",
  },
]

export function StakingInterface() {
  const [selectedPool, setSelectedPool] = useState(stakingPools[0])
  const [stakeAmount, setStakeAmount] = useState("")
  const [unstakeAmount, setUnstakeAmount] = useState("")

  const calculateRewards = (amount: number, apy: number, days: number) => {
    return (amount * apy * days) / (365 * 100)
  }

  const totalStaked = userStakes.reduce((sum, stake) => sum + stake.amount, 0)
  const totalRewards = userStakes.reduce((sum, stake) => sum + stake.accumulatedRewards, 0)

  return (
    <div className="space-y-6">
      {/* Staking Overview */}
      <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
        <Card className="bg-card border-border">
          <CardContent className="p-4 text-center">
            <div className="text-2xl font-bold text-primary">{totalStaked.toLocaleString()}</div>
            <div className="text-sm text-muted-foreground">Total Staked</div>
          </CardContent>
        </Card>
        <Card className="bg-card border-border">
          <CardContent className="p-4 text-center">
            <div className="text-2xl font-bold text-accent">{totalRewards.toLocaleString()}</div>
            <div className="text-sm text-muted-foreground">Pending Rewards</div>
          </CardContent>
        </Card>
        <Card className="bg-card border-border">
          <CardContent className="p-4 text-center">
            <div className="text-2xl font-bold text-chart-3">18.5%</div>
            <div className="text-sm text-muted-foreground">Avg APY</div>
          </CardContent>
        </Card>
      </div>

      <Tabs defaultValue="stake" className="space-y-4">
        <TabsList className="grid w-full grid-cols-3">
          <TabsTrigger value="stake">Stake Tokens</TabsTrigger>
          <TabsTrigger value="manage">Manage Stakes</TabsTrigger>
          <TabsTrigger value="calculator">Rewards Calculator</TabsTrigger>
        </TabsList>

        <TabsContent value="stake" className="space-y-4">
          <div className="grid gap-4">
            {stakingPools.map((pool) => (
              <Card
                key={pool.id}
                className={`bg-card border-border cursor-pointer transition-colors ${
                  selectedPool.id === pool.id ? "border-primary bg-primary/5" : ""
                }`}
                onClick={() => setSelectedPool(pool)}
              >
                <CardContent className="p-4">
                  <div className="flex items-center justify-between mb-3">
                    <div>
                      <h3 className="font-semibold text-foreground">{pool.name}</h3>
                      <div className="flex items-center space-x-4 text-sm text-muted-foreground">
                        <span>Min: {pool.minStake.toLocaleString()} DAG</span>
                        {pool.lockPeriod > 0 && (
                          <span className="flex items-center">
                            <Lock className="h-3 w-3 mr-1" />
                            {pool.lockPeriod} days
                          </span>
                        )}
                      </div>
                    </div>
                    <div className="text-right">
                      <div className="text-2xl font-bold text-accent">{pool.apy}%</div>
                      <div className="text-sm text-muted-foreground">APY</div>
                    </div>
                  </div>

                  <div className="flex justify-between items-center">
                    <div className="text-sm">
                      <span className="text-muted-foreground">TVL: </span>
                      <span className="font-medium">{(pool.totalStaked / 1000000).toFixed(1)}M DAG</span>
                    </div>
                    <Badge
                      variant={pool.type === "flexible" ? "secondary" : pool.type === "fixed" ? "default" : "outline"}
                    >
                      {pool.type === "special" ? "Node Operators" : pool.type}
                    </Badge>
                  </div>
                </CardContent>
              </Card>
            ))}
          </div>

          {/* Stake Form */}
          <Card className="bg-card border-border">
            <CardHeader>
              <CardTitle className="flex items-center space-x-2">
                <Coins className="h-5 w-5 text-primary" />
                <span>Stake in {selectedPool.name}</span>
              </CardTitle>
            </CardHeader>
            <CardContent className="space-y-4">
              <div>
                <label className="text-sm font-medium text-foreground">Amount to Stake</label>
                <Input
                  type="number"
                  placeholder="Enter amount"
                  value={stakeAmount}
                  onChange={(e) => setStakeAmount(e.target.value)}
                  className="mt-1"
                />
                <div className="text-xs text-muted-foreground mt-1">
                  Minimum: {selectedPool.minStake.toLocaleString()} DAG
                </div>
              </div>

              {stakeAmount && Number(stakeAmount) > 0 && (
                <div className="p-3 bg-muted/50 rounded-lg space-y-2">
                  <div className="flex justify-between text-sm">
                    <span>Estimated Daily Rewards:</span>
                    <span className="font-medium text-accent">
                      {calculateRewards(Number(stakeAmount), selectedPool.apy, 1).toFixed(2)} DAG
                    </span>
                  </div>
                  <div className="flex justify-between text-sm">
                    <span>Estimated Monthly Rewards:</span>
                    <span className="font-medium text-accent">
                      {calculateRewards(Number(stakeAmount), selectedPool.apy, 30).toFixed(2)} DAG
                    </span>
                  </div>
                  {selectedPool.lockPeriod > 0 && (
                    <div className="flex justify-between text-sm">
                      <span>Unlock Date:</span>
                      <span className="font-medium">
                        {new Date(Date.now() + selectedPool.lockPeriod * 24 * 60 * 60 * 1000).toLocaleDateString()}
                      </span>
                    </div>
                  )}
                </div>
              )}

              <Button
                className="w-full bg-primary hover:bg-primary/90"
                disabled={!stakeAmount || Number(stakeAmount) < selectedPool.minStake}
              >
                Stake {stakeAmount} DAG
              </Button>
            </CardContent>
          </Card>
        </TabsContent>

        <TabsContent value="manage" className="space-y-4">
          <div className="grid gap-4">
            {userStakes.map((stake, index) => (
              <Card key={index} className="bg-card border-border">
                <CardContent className="p-4">
                  <div className="flex items-center justify-between mb-4">
                    <div>
                      <h3 className="font-semibold text-foreground">{stake.poolName}</h3>
                      <div className="text-sm text-muted-foreground">Staked: {stake.amount.toLocaleString()} DAG</div>
                    </div>
                    <Badge className="bg-accent text-accent-foreground">{stake.apy}% APY</Badge>
                  </div>

                  <div className="grid grid-cols-2 gap-4 mb-4">
                    <div>
                      <div className="text-sm text-muted-foreground">Staked On</div>
                      <div className="font-medium">{stake.stakeTime}</div>
                    </div>
                    <div>
                      <div className="text-sm text-muted-foreground">Unlock Date</div>
                      <div className="font-medium">{stake.unlockTime}</div>
                    </div>
                  </div>

                  <div className="flex justify-between items-center mb-4">
                    <div>
                      <div className="text-sm text-muted-foreground">Pending Rewards</div>
                      <div className="text-lg font-bold text-accent">
                        {stake.accumulatedRewards.toLocaleString()} DAG
                      </div>
                    </div>
                    <Button variant="outline" size="sm">
                      Claim Rewards
                    </Button>
                  </div>

                  <div className="flex space-x-2">
                    <Button variant="outline" className="flex-1 bg-transparent">
                      <Unlock className="h-4 w-4 mr-2" />
                      Unstake
                    </Button>
                    <Button variant="outline" className="flex-1 bg-transparent">
                      Add More
                    </Button>
                  </div>
                </CardContent>
              </Card>
            ))}
          </div>
        </TabsContent>

        <TabsContent value="calculator" className="space-y-4">
          <Card className="bg-card border-border">
            <CardHeader>
              <CardTitle className="flex items-center space-x-2">
                <Calculator className="h-5 w-5 text-primary" />
                <span>Staking Rewards Calculator</span>
              </CardTitle>
            </CardHeader>
            <CardContent className="space-y-4">
              <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
                <div>
                  <label className="text-sm font-medium text-foreground">Stake Amount</label>
                  <Input type="number" placeholder="10000" className="mt-1" />
                </div>
                <div>
                  <label className="text-sm font-medium text-foreground">APY (%)</label>
                  <Input type="number" placeholder="15" className="mt-1" />
                </div>
                <div>
                  <label className="text-sm font-medium text-foreground">Duration (days)</label>
                  <Input type="number" placeholder="365" className="mt-1" />
                </div>
              </div>

              <div className="p-4 bg-muted/50 rounded-lg">
                <h4 className="font-medium mb-3">Projected Rewards</h4>
                <div className="grid grid-cols-2 md:grid-cols-4 gap-4">
                  <div className="text-center">
                    <div className="text-lg font-bold text-accent">41.1</div>
                    <div className="text-xs text-muted-foreground">Daily</div>
                  </div>
                  <div className="text-center">
                    <div className="text-lg font-bold text-accent">1,233</div>
                    <div className="text-xs text-muted-foreground">Monthly</div>
                  </div>
                  <div className="text-center">
                    <div className="text-lg font-bold text-accent">15,000</div>
                    <div className="text-xs text-muted-foreground">Yearly</div>
                  </div>
                  <div className="text-center">
                    <div className="text-lg font-bold text-primary">25,000</div>
                    <div className="text-xs text-muted-foreground">Total Value</div>
                  </div>
                </div>
              </div>
            </CardContent>
          </Card>
        </TabsContent>
      </Tabs>
    </div>
  )
}
