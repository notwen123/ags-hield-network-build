"use client"

import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card"
import { Badge } from "@/components/ui/badge"
import { Button } from "@/components/ui/button"
import { AlertTriangle, Shield, Eye, ExternalLink } from "lucide-react"

const alerts = [
  {
    id: 1,
    type: "critical",
    title: "Phishing Attack Detected",
    description: "Malicious contract attempting to drain user funds on Ethereum",
    time: "2 minutes ago",
    chain: "Ethereum",
    address: "0x1234...5678",
    confidence: 98,
  },
  {
    id: 2,
    type: "warning",
    title: "Suspicious Token Transfer",
    description: "Large volume transfer to unknown address detected",
    time: "5 minutes ago",
    chain: "Polygon",
    address: "0xabcd...efgh",
    confidence: 87,
  },
  {
    id: 3,
    type: "info",
    title: "Flash Loan Pattern",
    description: "Potential arbitrage opportunity identified",
    time: "8 minutes ago",
    chain: "BSC",
    address: "0x9876...5432",
    confidence: 76,
  },
  {
    id: 4,
    type: "blocked",
    title: "Rug Pull Prevented",
    description: "Malicious liquidity removal blocked by network consensus",
    time: "12 minutes ago",
    chain: "Ethereum",
    address: "0xdef0...1234",
    confidence: 95,
  },
]

export function AlertsFeed() {
  return (
    <Card className="bg-card border-border">
      <CardHeader>
        <div className="flex items-center justify-between">
          <CardTitle className="flex items-center space-x-2">
            <AlertTriangle className="h-5 w-5 text-chart-3" />
            <span>Real-time Threat Alerts</span>
          </CardTitle>
          <Button variant="outline" size="sm">
            View All
          </Button>
        </div>
      </CardHeader>
      <CardContent>
        <div className="space-y-4">
          {alerts.map((alert) => (
            <div
              key={alert.id}
              className={`border rounded-lg p-4 ${
                alert.type === "critical"
                  ? "border-destructive/50 bg-destructive/5"
                  : alert.type === "warning"
                    ? "border-chart-3/50 bg-chart-3/5"
                    : alert.type === "blocked"
                      ? "border-accent/50 bg-accent/5"
                      : "border-border bg-muted/20"
              }`}
            >
              <div className="flex items-start justify-between mb-2">
                <div className="flex items-center space-x-2">
                  {alert.type === "critical" && <AlertTriangle className="h-4 w-4 text-destructive" />}
                  {alert.type === "warning" && <Eye className="h-4 w-4 text-chart-3" />}
                  {alert.type === "blocked" && <Shield className="h-4 w-4 text-accent" />}
                  {alert.type === "info" && <Eye className="h-4 w-4 text-primary" />}
                  <span className="font-medium text-sm">{alert.title}</span>
                </div>
                <div className="flex items-center space-x-2">
                  <Badge
                    variant={
                      alert.type === "critical"
                        ? "destructive"
                        : alert.type === "warning"
                          ? "secondary"
                          : alert.type === "blocked"
                            ? "default"
                            : "outline"
                    }
                    className={alert.type === "blocked" ? "bg-accent text-accent-foreground" : ""}
                  >
                    {alert.chain}
                  </Badge>
                  <Badge variant="outline" className="text-xs">
                    {alert.confidence}% confidence
                  </Badge>
                </div>
              </div>

              <p className="text-sm text-muted-foreground mb-3">{alert.description}</p>

              <div className="flex items-center justify-between">
                <div className="flex items-center space-x-4 text-xs text-muted-foreground">
                  <span>{alert.time}</span>
                  <span className="font-mono">{alert.address}</span>
                </div>
                <Button variant="ghost" size="sm" className="h-8 px-2">
                  <ExternalLink className="h-3 w-3 mr-1" />
                  Details
                </Button>
              </div>
            </div>
          ))}
        </div>
      </CardContent>
    </Card>
  )
}
