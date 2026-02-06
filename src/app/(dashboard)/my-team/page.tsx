import { getCurrentUser } from '@/lib/auth'
import { db } from '@/lib/db'
import { calculateTotalPoints, calculatePointsByWeek, getEventTypeLabel } from '@/lib/scoring'
import { Card, CardContent, CardHeader, CardTitle, CardDescription } from '@/components/ui/card'
import { Badge } from '@/components/ui/badge'
import { Avatar, AvatarFallback, AvatarImage } from '@/components/ui/avatar'
import { Users, Trophy, TrendingUp } from 'lucide-react'

async function getUserTeam(userId: string) {
  const team = await db.team.findUnique({
    where: { userId },
    include: {
      contestants: {
        include: {
          contestant: {
            include: {
              events: {
                where: { isApproved: true },
                orderBy: { week: 'desc' },
              },
              tribeMemberships: {
                where: { toWeek: null },
                include: {
                  tribe: {
                    select: { id: true, name: true, color: true },
                  },
                },
              },
            },
          },
        },
        orderBy: { draftOrder: 'asc' },
      },
    },
  })

  return team
}

export default async function MyTeamPage() {
  const user = await getCurrentUser()

  if (!user) {
    return (
      <div className="space-y-6 pb-20 lg:pb-6">
        <div>
          <h1 className="text-3xl font-bold tracking-tight">My Team</h1>
          <p className="text-muted-foreground">
            Your drafted contestants and their scores
          </p>
        </div>
        <Card>
          <CardContent className="flex flex-col items-center justify-center py-12">
            <Users className="h-12 w-12 text-muted-foreground mb-4" />
            <p className="text-lg font-medium">Account setup in progress</p>
            <p className="text-sm text-muted-foreground text-center">
              Your account is being set up. Please refresh in a moment.
            </p>
          </CardContent>
        </Card>
      </div>
    )
  }

  const team = await getUserTeam(user.id)

  const totalScore = team?.contestants.reduce((sum, tc) => {
    return sum + calculateTotalPoints(tc.contestant.events)
  }, 0) || 0

  return (
    <div className="space-y-6 pb-20 lg:pb-6">
      <div>
        <h1 className="text-3xl font-bold tracking-tight">My Team</h1>
        <p className="text-muted-foreground">
          Your drafted contestants and their scores
        </p>
      </div>

      {/* Team Summary */}
      <Card>
        <CardHeader>
          <CardTitle className="flex items-center gap-2">
            <Trophy className="h-5 w-5 text-primary" />
            Total Score
          </CardTitle>
        </CardHeader>
        <CardContent>
          <p className="text-4xl font-bold">{totalScore}</p>
          <p className="text-sm text-muted-foreground">points earned</p>
        </CardContent>
      </Card>

      {!team || team.contestants.length === 0 ? (
        <Card>
          <CardContent className="flex flex-col items-center justify-center py-12">
            <Users className="h-12 w-12 text-muted-foreground mb-4" />
            <p className="text-lg font-medium">No contestants drafted yet</p>
            <p className="text-sm text-muted-foreground text-center">
              Your team will appear here once you&apos;ve made your draft picks
            </p>
          </CardContent>
        </Card>
      ) : (
        <div className="grid gap-4 md:grid-cols-2">
          {team.contestants.map((tc, index) => {
            const contestantPoints = calculateTotalPoints(tc.contestant.events)
            const weeklyPoints = calculatePointsByWeek(tc.contestant.events)

            return (
              <Card key={tc.id}>
                <CardHeader>
                  <div className="flex items-start justify-between">
                    <div className="flex items-center gap-3">
                      <Avatar className="h-12 w-12">
                        {tc.contestant.imageUrl && (
                          <AvatarImage src={tc.contestant.imageUrl} alt={tc.contestant.name} />
                        )}
                        <AvatarFallback className="text-lg">
                          {tc.contestant.name.split(' ').map(n => n[0]).join('')}
                        </AvatarFallback>
                      </Avatar>
                      <div>
                        <CardTitle className="text-lg">{tc.contestant.name}</CardTitle>
                        <CardDescription>
                          <span className="flex items-center gap-1.5">
                            {(() => {
                              const membership = tc.contestant.tribeMemberships?.[0]
                              if (membership) {
                                return (
                                  <>
                                    <span
                                      className="inline-block h-2.5 w-2.5 rounded-full"
                                      style={{ backgroundColor: membership.tribe.color }}
                                    />
                                    {membership.tribe.name}
                                  </>
                                )
                              }
                              return tc.contestant.tribe || 'Unknown tribe'
                            })()}
                          </span>
                          {tc.contestant.isEliminated && (
                            <Badge variant="destructive" className="ml-2">
                              Eliminated
                            </Badge>
                          )}
                        </CardDescription>
                      </div>
                    </div>
                    <Badge variant="outline">Pick #{index + 1}</Badge>
                  </div>
                </CardHeader>
                <CardContent className="space-y-4">
                  <div className="flex items-center justify-between">
                    <span className="text-sm text-muted-foreground">Total Points</span>
                    <span className="text-2xl font-bold">{contestantPoints}</span>
                  </div>

                  {tc.contestant.events.length > 0 && (
                    <div className="space-y-2">
                      <p className="text-sm font-medium flex items-center gap-1">
                        <TrendingUp className="h-4 w-4" />
                        Recent Events
                      </p>
                      <div className="space-y-1">
                        {tc.contestant.events.slice(0, 5).map((event) => (
                          <div
                            key={event.id}
                            className="flex items-center justify-between text-sm"
                          >
                            <span className="text-muted-foreground">
                              Week {event.week}: {getEventTypeLabel(event.type)}
                            </span>
                            <span className={event.points >= 0 ? 'text-green-600' : 'text-red-600'}>
                              {event.points > 0 ? '+' : ''}{event.points}
                            </span>
                          </div>
                        ))}
                      </div>
                    </div>
                  )}

                  {Object.keys(weeklyPoints).length > 0 && (
                    <div className="pt-2 border-t">
                      <p className="text-sm font-medium mb-2">Weekly Breakdown</p>
                      <div className="flex flex-wrap gap-2">
                        {Object.entries(weeklyPoints)
                          .sort(([a], [b]) => parseInt(a) - parseInt(b))
                          .map(([week, points]) => (
                            <Badge key={week} variant="secondary">
                              Wk {week}: {points}
                            </Badge>
                          ))}
                      </div>
                    </div>
                  )}
                </CardContent>
              </Card>
            )
          })}
        </div>
      )}
    </div>
  )
}
