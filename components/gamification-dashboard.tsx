"use client"

import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card"
import { Badge } from "@/components/ui/badge"
import { Progress } from "@/components/ui/progress"
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs"
import { Trophy, Star, Flame, Award, Users, Clock } from "lucide-react"

const userStats = {
  level: 23,
  experience: 23450,
  nextLevelExp: 25000,
  streak: 12,
  totalRewards: 45678,
  threatsDetected: 1247,
  nodeUptime: 98.7,
  challengesCompleted: 8,
  achievements: 15,
  rank: 42,
}

const activeChallenges = [
  {
    id: 1,
    name: "Threat Hunter",
    description: "Detect 50 threats this week",
    progress: 36,
    target: 50,
    reward: 500,
    timeLeft: "2 days",
    type: "weekly",
  },
  {
    id: 2,
    name: "Perfect Uptime",
    description: "Maintain 99%+ uptime for 7 days",
    progress: 5,
    target: 7,
    reward: 750,
    timeLeft: "2 days",
    type: "weekly",
  },
  {
    id: 3,
    name: "Community Guardian",
    description: "Vote on 10 governance proposals",
    progress: 7,
    target: 10,
    reward: 300,
    timeLeft: "5 days",
    type: "monthly",
  },
]

const recentAchievements = [
  { id: 1, name: "First Blood", description: "Detected your first threat", reward: 100, unlocked: true },
  { id: 2, name: "Guardian", description: "Detected 100 threats", reward: 1000, unlocked: true },
  { id: 3, name: "Always On", description: "99% uptime for 30 days", reward: 2000, unlocked: true },
  { id: 4, name: "Rising Star", description: "Reached level 10", reward: 500, unlocked: true },
  { id: 5, name: "Sentinel", description: "Detected 1000 threats", reward: 10000, unlocked: false },
]

const leaderboard = [
  { rank: 1, user: "0x1234...5678", score: 125847, level: 45 },
  { rank: 2, user: "0xabcd...efgh", score: 118923, level: 42 },
  { rank: 3, user: "0x9876...5432", score: 112456, level: 41 },
  { rank: 42, user: "You", score: 45678, level: 23 },
]

export function GamificationDashboard() {
  return (
    <div className="space-y-6">
      {/* User Level & Progress */}
      <Card className="bg-gradient-to-r from-primary/10 to-accent/10 border-primary/20">
        <CardContent className="p-6">
          <div className="flex items-center justify-between mb-4">
            <div className="flex items-center space-x-4">
              <div className="relative">
                <div className="w-16 h-16 rounded-full bg-primary/20 flex items-center justify-center">
                  <Star className="h-8 w-8 text-primary" />
                </div>
                <Badge className="absolute -bottom-1 -right-1 bg-accent text-accent-foreground">
                  {userStats.level}
                </Badge>
              </div>
              <div>
                <h2 className="text-2xl font-bold text-foreground">Level {userStats.level}</h2>
                <p className="text-muted-foreground">Guardian Protector</p>
              </div>
            </div>
            <div className="text-right">
              <div className="flex items-center space-x-2 mb-2">
                <Flame className="h-5 w-5 text-chart-3" />
                <span className="text-lg font-bold text-chart-3">{userStats.streak} day streak</span>
              </div>
              <div className="text-sm text-muted-foreground">Rank #{userStats.rank} globally</div>
            </div>
          </div>

          <div className="space-y-2">
            <div className="flex justify-between text-sm">
              <span>Experience</span>
              <span>
                {userStats.experience.toLocaleString()} / {userStats.nextLevelExp.toLocaleString()}
              </span>
            </div>
            <Progress value={(userStats.experience / userStats.nextLevelExp) * 100} className="h-3" />
            <div className="text-xs text-muted-foreground">
              {(userStats.nextLevelExp - userStats.experience).toLocaleString()} XP to next level
            </div>
          </div>
        </CardContent>
      </Card>

      <Tabs defaultValue="challenges" className="space-y-4">
        <TabsList className="grid w-full grid-cols-4">
          <TabsTrigger value="challenges">Challenges</TabsTrigger>
          <TabsTrigger value="achievements">Achievements</TabsTrigger>
          <TabsTrigger value="leaderboard">Leaderboard</TabsTrigger>
          <TabsTrigger value="stats">Stats</TabsTrigger>
        </TabsList>

        <TabsContent value="challenges" className="space-y-4">
          <div className="grid gap-4">
            {activeChallenges.map((challenge) => (
              <Card key={challenge.id} className="bg-card border-border">
                <CardContent className="p-4">
                  <div className="flex items-start justify-between mb-3">
                    <div>
                      <h3 className="font-semibold text-foreground">{challenge.name}</h3>
                      <p className="text-sm text-muted-foreground">{challenge.description}</p>
                    </div>
                    <div className="text-right">
                      <Badge variant={challenge.type === "weekly" ? "default" : "secondary"}>{challenge.type}</Badge>
                      <div className="text-sm text-muted-foreground mt-1">
                        <Clock className="h-3 w-3 inline mr-1" />
                        {challenge.timeLeft}
                      </div>
                    </div>
                  </div>

                  <div className="space-y-2">
                    <div className="flex justify-between text-sm">
                      <span>Progress</span>
                      <span>
                        {challenge.progress} / {challenge.target}
                      </span>
                    </div>
                    <Progress value={(challenge.progress / challenge.target) * 100} className="h-2" />
                    <div className="flex justify-between items-center">
                      <span className="text-xs text-muted-foreground">
                        {Math.round((challenge.progress / challenge.target) * 100)}% complete
                      </span>
                      <div className="flex items-center text-accent">
                        <Trophy className="h-3 w-3 mr-1" />
                        <span className="text-sm font-medium">{challenge.reward} DAG</span>
                      </div>
                    </div>
                  </div>
                </CardContent>
              </Card>
            ))}
          </div>
        </TabsContent>

        <TabsContent value="achievements" className="space-y-4">
          <div className="grid gap-3">
            {recentAchievements.map((achievement) => (
              <Card
                key={achievement.id}
                className={`bg-card border-border ${achievement.unlocked ? "opacity-100" : "opacity-60"}`}
              >
                <CardContent className="p-4">
                  <div className="flex items-center justify-between">
                    <div className="flex items-center space-x-3">
                      <div
                        className={`w-10 h-10 rounded-full flex items-center justify-center ${
                          achievement.unlocked ? "bg-accent/20" : "bg-muted"
                        }`}
                      >
                        <Award
                          className={`h-5 w-5 ${achievement.unlocked ? "text-accent" : "text-muted-foreground"}`}
                        />
                      </div>
                      <div>
                        <h3 className="font-medium text-foreground">{achievement.name}</h3>
                        <p className="text-sm text-muted-foreground">{achievement.description}</p>
                      </div>
                    </div>
                    <div className="text-right">
                      {achievement.unlocked ? (
                        <Badge className="bg-accent text-accent-foreground">Unlocked</Badge>
                      ) : (
                        <Badge variant="outline">Locked</Badge>
                      )}
                      <div className="text-sm text-accent mt-1">+{achievement.reward} DAG</div>
                    </div>
                  </div>
                </CardContent>
              </Card>
            ))}
          </div>
        </TabsContent>

        <TabsContent value="leaderboard" className="space-y-4">
          <Card className="bg-card border-border">
            <CardHeader>
              <CardTitle className="flex items-center space-x-2">
                <Users className="h-5 w-5 text-primary" />
                <span>Global Leaderboard</span>
              </CardTitle>
            </CardHeader>
            <CardContent>
              <div className="space-y-3">
                {leaderboard.map((entry) => (
                  <div
                    key={entry.rank}
                    className={`flex items-center justify-between p-3 rounded-lg ${
                      entry.user === "You" ? "bg-primary/10 border border-primary/20" : "bg-muted/20"
                    }`}
                  >
                    <div className="flex items-center space-x-3">
                      <div
                        className={`w-8 h-8 rounded-full flex items-center justify-center text-sm font-bold ${
                          entry.rank === 1
                            ? "bg-chart-3 text-background"
                            : entry.rank === 2
                              ? "bg-muted text-foreground"
                              : entry.rank === 3
                                ? "bg-chart-4 text-background"
                                : "bg-muted/50 text-muted-foreground"
                        }`}
                      >
                        {entry.rank}
                      </div>
                      <div>
                        <div className="font-medium text-foreground">{entry.user}</div>
                        <div className="text-sm text-muted-foreground">Level {entry.level}</div>
                      </div>
                    </div>
                    <div className="text-right">
                      <div className="font-bold text-foreground">{entry.score.toLocaleString()}</div>
                      <div className="text-sm text-muted-foreground">points</div>
                    </div>
                  </div>
                ))}
              </div>
            </CardContent>
          </Card>
        </TabsContent>

        <TabsContent value="stats" className="space-y-4">
          <div className="grid grid-cols-2 md:grid-cols-4 gap-4">
            <Card className="bg-card border-border">
              <CardContent className="p-4 text-center">
                <div className="text-2xl font-bold text-primary">{userStats.threatsDetected}</div>
                <div className="text-sm text-muted-foreground">Threats Detected</div>
              </CardContent>
            </Card>
            <Card className="bg-card border-border">
              <CardContent className="p-4 text-center">
                <div className="text-2xl font-bold text-accent">{userStats.nodeUptime}%</div>
                <div className="text-sm text-muted-foreground">Node Uptime</div>
              </CardContent>
            </Card>
            <Card className="bg-card border-border">
              <CardContent className="p-4 text-center">
                <div className="text-2xl font-bold text-chart-3">{userStats.challengesCompleted}</div>
                <div className="text-sm text-muted-foreground">Challenges Won</div>
              </CardContent>
            </Card>
            <Card className="bg-card border-border">
              <CardContent className="p-4 text-center">
                <div className="text-2xl font-bold text-foreground">{userStats.totalRewards.toLocaleString()}</div>
                <div className="text-sm text-muted-foreground">Total Rewards</div>
              </CardContent>
            </Card>
          </div>

          <Card className="bg-card border-border">
            <CardHeader>
              <CardTitle>Performance Multipliers</CardTitle>
            </CardHeader>
            <CardContent className="space-y-4">
              <div>
                <div className="flex justify-between mb-2">
                  <span className="text-sm">Node Performance</span>
                  <span className="text-sm font-medium">+25%</span>
                </div>
                <Progress value={50} className="h-2" />
              </div>
              <div>
                <div className="flex justify-between mb-2">
                  <span className="text-sm">Threat Detection</span>
                  <span className="text-sm font-medium">+15%</span>
                </div>
                <Progress value={50} className="h-2" />
              </div>
              <div>
                <div className="flex justify-between mb-2">
                  <span className="text-sm">Community Participation</span>
                  <span className="text-sm font-medium">+10%</span>
                </div>
                <Progress value={50} className="h-2" />
              </div>
              <div>
                <div className="flex justify-between mb-2">
                  <span className="text-sm">Loyalty Bonus</span>
                  <span className="text-sm font-medium">+30%</span>
                </div>
                <Progress value={30} className="h-2" />
              </div>
            </CardContent>
          </Card>
        </TabsContent>
      </Tabs>
    </div>
  )
}
