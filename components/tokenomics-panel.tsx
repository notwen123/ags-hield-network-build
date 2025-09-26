"use client"

import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card"
import { Button } from "@/components/ui/button"
import { Badge } from "@/components/ui/badge"
import { Progress } from "@/components/ui/progress"
import { Coins, TrendingUp, Gift, Lock, Unlock } from "lucide-react"

export function TokenomicsPanel() {
  return (
    <Card className="bg-card border-border">
      <CardHeader>
        <CardTitle className="flex items-center space-x-2">
          <Coins className="h-5 w-5 text-chart-3" />
          <span>DAG Rewards</span>
        </CardTitle>
      </CardHeader>
      <CardContent className="space-y-6">
        {/* Balance Overview */}
        <div className="text-center p-4 bg-muted/50 rounded-lg">
          <div className="text-3xl font-bold text-chart-3 mb-1">12,847 DAG</div>
          <div className="text-sm text-muted-foreground">Total Balance</div>
          <div className="flex items-center justify-center mt-2 text-sm text-accent">
            <TrendingUp className="h-4 w-4 mr-1" />
            +247 DAG today
          </div>
        </div>

        {/* Staking Status */}
        <div>
          <div className="flex items-center justify-between mb-3">
            <div className="flex items-center space-x-2">
              <Lock className="h-4 w-4 text-muted-foreground" />
              <span className="text-sm font-medium">Staked Tokens</span>
            </div>
            <Badge variant="outline" className="text-primary border-primary">
              8,500 DAG
            </Badge>
          </div>
          <Progress value={66} className="h-2 mb-2" />
          <div className="flex justify-between text-xs text-muted-foreground">
            <span>66% of balance staked</span>
            <span>APY: 12.5%</span>
          </div>
        </div>

        {/* Available Actions */}
        <div className="space-y-3">
          <Button className="w-full bg-primary hover:bg-primary/90">
            <Coins className="h-4 w-4 mr-2" />
            Stake More Tokens
          </Button>
          <Button variant="outline" className="w-full bg-transparent">
            <Unlock className="h-4 w-4 mr-2" />
            Unstake Tokens
          </Button>
        </div>

        {/* Rewards Breakdown */}
        <div className="space-y-3">
          <div className="text-sm font-medium">Recent Rewards</div>
          <div className="space-y-2">
            <div className="flex justify-between items-center text-sm">
              <span className="text-muted-foreground">Threat Detection</span>
              <span className="text-accent">+89 DAG</span>
            </div>
            <div className="flex justify-between items-center text-sm">
              <span className="text-muted-foreground">Node Uptime</span>
              <span className="text-accent">+124 DAG</span>
            </div>
            <div className="flex justify-between items-center text-sm">
              <span className="text-muted-foreground">Community Challenge</span>
              <span className="text-accent">+34 DAG</span>
            </div>
          </div>
        </div>

        {/* Gamification Element */}
        <div className="p-3 bg-gradient-to-r from-primary/10 to-accent/10 rounded-lg border border-primary/20">
          <div className="flex items-center space-x-2 mb-2">
            <Gift className="h-4 w-4 text-primary" />
            <span className="text-sm font-medium">Weekly Challenge</span>
            <Badge variant="secondary" className="text-xs">
              2 days left
            </Badge>
          </div>
          <div className="text-xs text-muted-foreground mb-2">Detect 50 threats to earn bonus rewards</div>
          <Progress value={72} className="h-1.5" />
          <div className="text-xs text-muted-foreground mt-1">36/50 threats detected</div>
        </div>
      </CardContent>
    </Card>
  )
}
