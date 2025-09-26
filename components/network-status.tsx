"use client"

import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card"
import { Badge } from "@/components/ui/badge"
import { Progress } from "@/components/ui/progress"
import { Network, Users, Cpu, Leaf } from "lucide-react"

export function NetworkStatus() {
  return (
    <Card className="bg-card border-border">
      <CardHeader>
        <CardTitle className="flex items-center space-x-2">
          <Network className="h-5 w-5 text-accent" />
          <span>Network Status</span>
        </CardTitle>
      </CardHeader>
      <CardContent className="space-y-6">
        {/* Active Nodes */}
        <div>
          <div className="flex items-center justify-between mb-2">
            <div className="flex items-center space-x-2">
              <Users className="h-4 w-4 text-muted-foreground" />
              <span className="text-sm font-medium">Active Nodes</span>
            </div>
            <Badge variant="secondary">2,847</Badge>
          </div>
          <Progress value={85} className="h-2" />
          <div className="text-xs text-muted-foreground mt-1">85% of target capacity</div>
        </div>

        {/* Network Health */}
        <div>
          <div className="flex items-center justify-between mb-2">
            <div className="flex items-center space-x-2">
              <Cpu className="h-4 w-4 text-muted-foreground" />
              <span className="text-sm font-medium">Network Health</span>
            </div>
            <Badge variant="default" className="bg-accent text-accent-foreground">
              Excellent
            </Badge>
          </div>
          <Progress value={96} className="h-2" />
          <div className="text-xs text-muted-foreground mt-1">96% uptime (24h)</div>
        </div>

        {/* Energy Efficiency */}
        <div>
          <div className="flex items-center justify-between mb-2">
            <div className="flex items-center space-x-2">
              <Leaf className="h-4 w-4 text-accent" />
              <span className="text-sm font-medium">Energy Efficiency</span>
            </div>
            <Badge variant="outline" className="text-accent border-accent">
              92% Green
            </Badge>
          </div>
          <Progress value={92} className="h-2" />
          <div className="text-xs text-muted-foreground mt-1">Carbon neutral operations</div>
        </div>

        {/* Quick Stats */}
        <div className="grid grid-cols-2 gap-4 pt-4 border-t border-border">
          <div className="text-center">
            <div className="text-lg font-bold text-primary">47ms</div>
            <div className="text-xs text-muted-foreground">Avg Latency</div>
          </div>
          <div className="text-center">
            <div className="text-lg font-bold text-accent">99.8%</div>
            <div className="text-xs text-muted-foreground">Consensus</div>
          </div>
        </div>
      </CardContent>
    </Card>
  )
}
