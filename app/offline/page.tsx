export default function OfflinePage() {
  return (
    <div className="min-h-screen bg-background flex items-center justify-center">
      <div className="text-center space-y-4">
        <div className="text-6xl">🛡️</div>
        <h1 className="text-2xl font-bold text-foreground">You're Offline</h1>
        <p className="text-muted-foreground max-w-md">
          DAGShield requires an internet connection to monitor threats in real-time. Please check your connection and
          try again.
        </p>
      </div>
    </div>
  )
}
