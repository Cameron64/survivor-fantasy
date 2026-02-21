import { db } from '@/lib/db'
import { getCurrentUser } from '@/lib/auth'
import { calculateTotalPoints } from '@/lib/scoring'
import { Card, CardContent } from '@/components/ui/card'
import { Trophy } from 'lucide-react'
import { OverviewClient } from '@/components/overview/overview-client'
import type {
  PlayerStanding,
  ContestantScore,
  ApprovedEvent,
} from '@/components/overview/overview-types'

async function getOverviewData() {
  const [currentUser, teams, recentEvents] = await Promise.all([
    getCurrentUser(),
    db.team.findMany({
      include: {
        user: {
          select: { id: true, name: true, isPaid: true },
        },
        contestants: {
          include: {
            contestant: {
              include: {
                events: {
                  where: { isApproved: true },
                  orderBy: { createdAt: 'desc' },
                },
                tribeMemberships: {
                  where: { toWeek: null },
                  include: {
                    tribe: { select: { name: true, color: true } },
                  },
                  take: 1,
                },
              },
            },
          },
        },
      },
    }),
    db.event.findMany({
      where: { isApproved: true },
      orderBy: { createdAt: 'desc' },
      take: 30,
      include: {
        contestant: { select: { name: true } },
      },
    }),
  ])

  // Build contestant map (id -> drafted-by user name)
  const contestantDraftedBy = new Map<string, string>()
  for (const team of teams) {
    for (const tc of team.contestants) {
      contestantDraftedBy.set(tc.contestant.id, team.user.name)
    }
  }

  // Build standings
  const standings: PlayerStanding[] = teams
    .map((team) => {
      const contestants: ContestantScore[] = team.contestants.map((tc) => {
        const c = tc.contestant
        const totalPoints = calculateTotalPoints(c.events)
        const currentTribe = c.tribeMemberships[0]?.tribe ?? null

        return {
          id: c.id,
          name: c.name,
          imageUrl: c.imageUrl,
          isEliminated: c.isEliminated,
          totalPoints,
          tribeColor: currentTribe?.color ?? null,
          tribeName: currentTribe?.name ?? null,
          draftedBy: team.user.name,
          events: c.events.map((e) => ({
            id: e.id,
            type: e.type,
            contestantId: e.contestantId,
            contestantName: c.name,
            week: e.week,
            points: e.points,
            createdAt: e.createdAt.toISOString(),
          })),
        }
      })

      const totalScore = contestants.reduce((s, c) => s + c.totalPoints, 0)
      const allEliminated =
        contestants.length > 0 && contestants.every((c) => c.isEliminated)

      return {
        teamId: team.id,
        userId: team.user.id,
        userName: team.user.name,
        rank: 0,
        totalScore,
        allEliminated,
        contestants,
      }
    })
    .sort((a, b) => b.totalScore - a.totalScore)
    .map((entry, idx) => ({ ...entry, rank: idx + 1 }))

  // Build all-contestant ranking
  const allContestants: ContestantScore[] = teams
    .flatMap((team) =>
      team.contestants.map((tc) => {
        const c = tc.contestant
        const totalPoints = calculateTotalPoints(c.events)
        const currentTribe = c.tribeMemberships[0]?.tribe ?? null

        return {
          id: c.id,
          name: c.name,
          imageUrl: c.imageUrl,
          isEliminated: c.isEliminated,
          totalPoints,
          tribeColor: currentTribe?.color ?? null,
          tribeName: currentTribe?.name ?? null,
          draftedBy: contestantDraftedBy.get(c.id) ?? null,
          events: [],
        }
      })
    )
    .sort((a, b) => b.totalPoints - a.totalPoints)

  // Deduplicate contestants (in case same contestant on multiple teams - shouldn't happen but be safe)
  const seenIds = new Set<string>()
  const uniqueContestants = allContestants.filter((c) => {
    if (seenIds.has(c.id)) return false
    seenIds.add(c.id)
    return true
  })

  // Build activity feed
  const feedEvents: ApprovedEvent[] = recentEvents.map((e) => ({
    id: e.id,
    type: e.type,
    contestantId: e.contestantId,
    contestantName: e.contestant.name,
    week: e.week,
    points: e.points,
    createdAt: e.createdAt.toISOString(),
  }))

  const maxScore = standings.length > 0 ? standings[0].totalScore : 0

  return {
    currentUserId: currentUser?.id ?? null,
    standings,
    contestants: uniqueContestants,
    feedEvents,
    maxScore,
  }
}

export default async function LeaderboardPage() {
  const { currentUserId, standings, contestants, feedEvents, maxScore } =
    await getOverviewData()

  if (standings.length === 0) {
    return (
      <div className="space-y-6 pb-20 lg:pb-6">
        <div>
          <h1 className="text-3xl font-bold tracking-tight">Overview</h1>
          <p className="text-muted-foreground">
            Season 50 Fantasy League
          </p>
        </div>
        <Card>
          <CardContent className="flex flex-col items-center justify-center py-12">
            <Trophy className="h-12 w-12 text-muted-foreground mb-4" />
            <p className="text-lg font-medium">No teams yet</p>
            <p className="text-sm text-muted-foreground">
              Teams will appear here once the draft is complete
            </p>
          </CardContent>
        </Card>
      </div>
    )
  }

  return (
    <div className="space-y-6 pb-20 lg:pb-6">
      <div>
        <h1 className="text-3xl font-bold tracking-tight">Overview</h1>
        <p className="text-muted-foreground">
          Season 50 Fantasy League
        </p>
      </div>

      <OverviewClient
        standings={standings}
        contestants={contestants}
        feedEvents={feedEvents}
        currentUserId={currentUserId}
        maxScore={maxScore}
      />
    </div>
  )
}
