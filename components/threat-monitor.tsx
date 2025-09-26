"use client"

import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card"
import { Badge } from "@/components/ui/badge"
import { LineChart, Line, XAxis, YAxis, CartesianGrid, Tooltip, ResponsiveContainer } from "recharts"
import { Shield, Zap } from "lucide-react"

const threatData = [
  { time: "00:00", threats: 12, blocked: 11 },
  { time: "04:00", threats: 8, blocked: 8 },
  { time: "08:00", threats: 24, blocked: 22 },
  { time: "12:00", threats: 18, blocked: 17 },
  { time: "16:00", threats: 32, blocked: 30 },
  { time: "20:00", threats: 15, blocked: 14 },
  { time: "24:00", threats: 9, blocked: 9 },
]

export function ThreatMonitor() {
  return (
    <Card className="bg-card border-border">
      <CardHeader>
        <div className="flex items-center justify-between">
          <CardTitle className="flex items-center space-x-2">
            <Shield className="h-5 w-5 text-primary" />
            <span>Threat Detection</span>
          </CardTitle>
          <div className="flex items-center space-x-2">
            <Badge variant="outline" className="text-accent border-accent">
              <Zap className="h-3 w-3 mr-1" />
              Real-time
            </Badge>
          </div>
        </div>
      </CardHeader>
      <CardContent>
        <div className="grid grid-cols-2 md:grid-cols-4 gap-4 mb-6">
          <div className="text-center">
            <div className="text-2xl font-bold text-primary">1,247</div>
            <div className="text-sm text-muted-foreground">Threats Detected</div>
          </div>
          <div className="text-center">
            <div className="text-2xl font-bold text-accent">1,198</div>
            <div className="text-sm text-muted-foreground">Threats Blocked</div>
          </div>
          <div className="text-center">
            <div className="text-2xl font-bold text-chart-3">96.1%</div>
            <div className="text-sm text-muted-foreground">Success Rate</div>
          </div>
          <div className="text-center">
            <div className="text-2xl font-bold text-foreground">0.3s</div>
            <div className="text-sm text-muted-foreground">Avg Response</div>
          </div>
        </div>

        <div className="h-64">
          <ResponsiveContainer width="100%" height="100%">
            <LineChart data={threatData}>
              <CartesianGrid strokeDasharray="3 3" stroke="rgb(var(--border))" />
              <XAxis dataKey="time" stroke="rgb(var(--muted-foreground))" fontSize={12} />
              <YAxis stroke="rgb(var(--muted-foreground))" fontSize={12} />
              <Tooltip
                contentStyle={{
                  backgroundColor: "rgb(var(--card))",
                  border: "1px solid rgb(var(--border))",
                  borderRadius: "8px",
                  color: "rgb(var(--foreground))",
                }}
              />
              <Line
                type="monotone"
                dataKey="threats"
                stroke="rgb(var(--primary))"
                strokeWidth={2}
                name="Threats Detected"
              />
              <Line
                type="monotone"
                dataKey="blocked"
                stroke="rgb(var(--accent))"
                strokeWidth={2}
                name="Threats Blocked"
              />
            </LineChart>
          </ResponsiveContainer>
        </div>
      </CardContent>
    </Card>
  )
}
