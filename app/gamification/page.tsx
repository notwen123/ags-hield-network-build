import { GamificationDashboard } from "@/components/gamification-dashboard"
import { DashboardHeader } from "@/components/dashboard-header"

export default function GamificationPage() {
  return (
    <div className="min-h-screen bg-background">
      <DashboardHeader />

      <main className="container mx-auto px-4 py-6">
        <div className="mb-6">
          <h1 className="text-3xl font-bold text-foreground mb-2">Gamification Hub</h1>
          <p className="text-muted-foreground">Complete challenges, unlock achievements, and climb the leaderboard</p>
        </div>

        <GamificationDashboard />
      </main>
    </div>
  )
}
