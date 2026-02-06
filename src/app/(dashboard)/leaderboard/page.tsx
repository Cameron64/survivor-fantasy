import { db } from '@/lib/db'
import { calculateTotalPoints } from '@/lib/scoring'
import { Card, CardContent } from '@/components/ui/card'
import { Badge } from '@/components/ui/badge'
import { Trophy, Medal, Award } from 'lucide-react'

async function getLeaderboard() {
  const teams = await db.team.findMany({
    include: {
      user: {
        select: {
          id: true,
          name: true,
          isPaid: true,
        },
      },
      contestants: {
        include: {
          contestant: {
            include: {
              events: {
                where: { isApproved: true },
              },
            },
          },
        },
      },
    },
  })

  const leaderboard = teams.map((team) => {
    const contestantScores = team.contestants.map((tc) => {
      const totalPoints = calculateTotalPoints(tc.contestant.events)
      return {
        contestant: tc.contestant,
        totalPoints,
      }
    })

    const totalScore = contestantScores.reduce((sum, cs) => sum + cs.totalPoints, 0)

    return {
      teamId: team.id,
      user: team.user,
      contestants: contestantScores,
      totalScore,
    }
  })

  leaderboard.sort((a, b) => b.totalScore - a.totalScore)

  return leaderboard.map((entry, index) => ({
    ...entry,
    rank: index + 1,
  }))
}

export default async function LeaderboardPage() {
  const leaderboard = await getLeaderboard()

  return (
    <div className="space-y-6 pb-20 lg:pb-6">
      <div>
        <h1 className="text-3xl font-bold tracking-tight">Leaderboard</h1>
        <p className="text-muted-foreground">
          Season 50 Fantasy League Standings
        </p>
      </div>

      {leaderboard.length === 0 ? (
        <Card>
          <CardContent className="flex flex-col items-center justify-center py-12">
            <Trophy className="h-12 w-12 text-muted-foreground mb-4" />
            <p className="text-lg font-medium">No teams yet</p>
            <p className="text-sm text-muted-foreground">
              Teams will appear here once the draft is complete
            </p>
          </CardContent>
        </Card>
      ) : (
        <div className="space-y-4">
          {leaderboard.map((entry) => (
            <Card key={entry.teamId} className={entry.rank <= 3 ? 'border-primary/50' : ''}>
              <CardContent className="flex items-center gap-4 p-4">
                <div className="flex items-center justify-center w-12 h-12 rounded-full bg-muted">
                  {entry.rank === 1 ? (
                    <Trophy className="h-6 w-6 text-yellow-500" />
                  ) : entry.rank === 2 ? (
                    <Medal className="h-6 w-6 text-gray-400" />
                  ) : entry.rank === 3 ? (
                    <Award className="h-6 w-6 text-amber-600" />
                  ) : (
                    <span className="text-lg font-bold text-muted-foreground">
                      {entry.rank}
                    </span>
                  )}
                </div>

                <div className="flex-1 min-w-0">
                  <div className="flex items-center gap-2">
                    <p className="font-semibold truncate">{entry.user.name}</p>
                    {!entry.user.isPaid && (
                      <Badge variant="outline" className="text-xs">
                        Unpaid
                      </Badge>
                    )}
                  </div>
                  <div className="flex gap-2 mt-1">
                    {entry.contestants.map((cs) => (
                      <Badge
                        key={cs.contestant.id}
                        variant={cs.contestant.isEliminated ? 'secondary' : 'default'}
                        className="text-xs"
                      >
                        {cs.contestant.name} ({cs.totalPoints})
                      </Badge>
                    ))}
                  </div>
                </div>

                <div className="text-right">
                  <p className="text-2xl font-bold">{entry.totalScore}</p>
                  <p className="text-xs text-muted-foreground">points</p>
                </div>
              </CardContent>
            </Card>
          ))}
        </div>
      )}
    </div>
  )
}
