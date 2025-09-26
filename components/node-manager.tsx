"use client"

import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card"
import { Button } from "@/components/ui/button"
import { Badge } from "@/components/ui/badge"
import { Progress } from "@/components/ui/progress"
import { Server, Play, Pause, Settings, TrendingUp } from "lucide-react"

const nodeData = [
  { id: "node-001", status: "active", performance: 98, rewards: "1,247 DAG", location: "US-East" },
  { id: "node-002", status: "active", performance: 94, rewards: "1,156 DAG", location: "EU-West" },
  { id: "node-003", status: "maintenance", performance: 0, rewards: "892 DAG", location: "Asia-Pacific" },
]

export function NodeManager() {
  return (
    <Card className="bg-card border-border">
      <CardHeader>
        <div className="flex items-center justify-between">
          <CardTitle className="flex items-center space-x-2">
            <Server className="h-5 w-5 text-primary" />
            <span>My Nodes</span>
          </CardTitle>
          <Button size="sm" className="bg-primary hover:bg-primary/90">
            Add Node
          </Button>
        </div>
      </CardHeader>
      <CardContent>
        <div className="space-y-4">
          {nodeData.map((node) => (
            <div key={node.id} className="border border-border rounded-lg p-4">
              <div className="flex items-center justify-between mb-3">
                <div className="flex items-center space-x-3">
                  <div className="font-mono text-sm">{node.id}</div>
                  <Badge
                    variant={node.status === "active" ? "default" : "secondary"}
                    className={node.status === "active" ? "bg-accent text-accent-foreground" : ""}
                  >
                    {node.status}
                  </Badge>
                  <span className="text-xs text-muted-foreground">{node.location}</span>
                </div>
                <div className="flex items-center space-x-2">
                  <Button variant="ghost" size="icon" className="h-8 w-8">
                    {node.status === "active" ? <Pause className="h-4 w-4" /> : <Play className="h-4 w-4" />}
                  </Button>
                  <Button variant="ghost" size="icon" className="h-8 w-8">
                    <Settings className="h-4 w-4" />
                  </Button>
                </div>
              </div>

              <div className="grid grid-cols-2 gap-4">
                <div>
                  <div className="flex items-center justify-between mb-1">
                    <span className="text-xs text-muted-foreground">Performance</span>
                    <span className="text-xs font-medium">{node.performance}%</span>
                  </div>
                  <Progress value={node.performance} className="h-1.5" />
                </div>
                <div className="text-right">
                  <div className="text-xs text-muted-foreground">Rewards Earned</div>
                  <div className="text-sm font-medium text-accent flex items-center justify-end">
                    <TrendingUp className="h-3 w-3 mr-1" />
                    {node.rewards}
                  </div>
                </div>
              </div>
            </div>
          ))}
        </div>

        <div className="mt-6 p-4 bg-muted/50 rounded-lg">
          <div className="text-sm font-medium mb-2">Node Performance Summary</div>
          <div className="grid grid-cols-3 gap-4 text-center">
            <div>
              <div className="text-lg font-bold text-accent">2</div>
              <div className="text-xs text-muted-foreground">Active</div>
            </div>
            <div>
              <div className="text-lg font-bold text-chart-3">1</div>
              <div className="text-xs text-muted-foreground">Maintenance</div>
            </div>
            <div>
              <div className="text-lg font-bold text-primary">96%</div>
              <div className="text-xs text-muted-foreground">Avg Performance</div>
            </div>
          </div>
        </div>
      </CardContent>
    </Card>
  )
}
