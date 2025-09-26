import { DashboardHeader } from "@/components/dashboard-header"
import { ThreatMonitor } from "@/components/threat-monitor"
import { NetworkStatus } from "@/components/network-status"
import { NodeManager } from "@/components/node-manager"
import { TokenomicsPanel } from "@/components/tokenomics-panel"
import { AlertsFeed } from "@/components/alerts-feed"

export default function Dashboard() {
  return (
    <div className="min-h-screen bg-background">
      <DashboardHeader />

      <main className="container mx-auto px-4 py-6 space-y-6">
        {/* Top Row - Key Metrics */}
        <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
          <div className="lg:col-span-2">
            <ThreatMonitor />
          </div>
          <div>
            <NetworkStatus />
          </div>
        </div>

        {/* Middle Row - Node Management & Tokenomics */}
        <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
          <NodeManager />
          <TokenomicsPanel />
        </div>

        {/* Bottom Row - Alerts Feed */}
        <AlertsFeed />
      </main>
    </div>
  )
}
