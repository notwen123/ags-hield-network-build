import { StakingInterface } from "@/components/staking-interface"
import { DashboardHeader } from "@/components/dashboard-header"

export default function StakingPage() {
  return (
    <div className="min-h-screen bg-background">
      <DashboardHeader />

      <main className="container mx-auto px-4 py-6">
        <div className="mb-6">
          <h1 className="text-3xl font-bold text-foreground mb-2">DAG Staking</h1>
          <p className="text-muted-foreground">Stake your DAG tokens to earn rewards and secure the network</p>
        </div>

        <StakingInterface />
      </main>
    </div>
  )
}
