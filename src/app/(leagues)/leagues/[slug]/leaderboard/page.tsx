import { notFound, redirect } from 'next/navigation'
import { db } from '@/lib/db'
import { getCurrentUser } from '@/lib/auth'
import { calculateTotalPoints } from '@/lib/scoring'
import { getContestantDisplayName, getValidImageUrl } from '@/lib/utils'
import { Card, CardContent } from '@/components/ui/card'
import { Trophy, ArrowLeft } from 'lucide-react'
import Link from 'next/link'
import { OverviewClient } from '@/components/overview/overview-client'
import { ScoringInfoDialog } from '@/components/overview/scoring-info-dialog'
import type {
  PlayerStanding,
  ContestantScore,
  WeekEventsData,
} from '@/components/overview/overview-types'

interface Props {
  params: Promise<{ slug: string }>
}

async function getOverviewData(leagueId?: string) {
  const [currentUser, teams, allDbContestants, league, tribes] = await Promise.all([
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
                    tribe: { select: { name: true, color: true, buffImage: true, isMerge: true } },
                  },
                  take: 1,
                },
              },
            },
          },
        },
      },
    }),
    db.contestant.findMany({
      include: {
        events: {
          where: { isApproved: true },
        },
        tribeMemberships: {
          where: { toWeek: null },
          include: {
            tribe: { select: { name: true, color: true, buffImage: true, isMerge: true } },
          },
          take: 1,
        },
      },
    }),
    db.league.findFirst({
      where: leagueId ? { id: leagueId } : undefined,
      select: { showLastPlace: true },
    }),
    db.tribe.findMany({ select: { id: true, name: true, color: true } }),
  ])

  // Build contestant map (id -> all user names who drafted them)
  const contestantDraftedBy = new Map<string, string[]>()
  for (const team of teams) {
    for (const tc of team.contestants) {
      const existing = contestantDraftedBy.get(tc.contestant.id) ?? []
      existing.push(team.user.name.split(' ')[0])
      contestantDraftedBy.set(tc.contestant.id, existing)
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
          nickname: c.nickname ?? null,
          displayName: getContestantDisplayName(c),
          imageUrl: getValidImageUrl(c.imageUrl, c.originalImageUrl),
          isEliminated: c.isEliminated,
          totalPoints,
          tribeColor: currentTribe?.color ?? null,
          tribeBuffImage: currentTribe?.buffImage ?? null,
          tribeIsMerge: currentTribe?.isMerge ?? null,
          tribeName: currentTribe?.name ?? null,
          draftedBy: [team.user.name.split(' ')[0]],
          events: c.events.map((e) => ({
            id: e.id,
            type: e.type,
            contestantId: e.contestantId,
            contestantName: getContestantDisplayName(c),
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
    .reduce<PlayerStanding[]>((acc, entry, idx) => {
      const rank = idx > 0 && entry.totalScore === acc[idx - 1].totalScore
        ? acc[idx - 1].rank
        : acc[idx - 1]?.rank + 1 || 1
      acc.push({ ...entry, rank })
      return acc
    }, [])

  // Build all-contestant ranking
  const uniqueContestants: ContestantScore[] = allDbContestants
    .map((c) => {
      const totalPoints = calculateTotalPoints(c.events)
      const currentTribe = c.tribeMemberships[0]?.tribe ?? null

      return {
        id: c.id,
        name: c.name,
        nickname: c.nickname ?? null,
        displayName: getContestantDisplayName(c),
        imageUrl: getValidImageUrl(c.imageUrl, c.originalImageUrl),
        isEliminated: c.isEliminated,
        totalPoints,
        tribeColor: currentTribe?.color ?? null,
        tribeBuffImage: currentTribe?.buffImage ?? null,
        tribeIsMerge: currentTribe?.isMerge ?? null,
        tribeName: currentTribe?.name ?? null,
        draftedBy: contestantDraftedBy.get(c.id) ?? [],
        events: [],
      }
    })
    .sort((a, b) => b.totalPoints - a.totalPoints)

  // Build "This Week's Events" data
  let weekEventsData: WeekEventsData | null = null

  const latestWeekRow = await db.event.findFirst({
    where: { isApproved: true },
    orderBy: { week: 'desc' },
    select: { week: true },
  })

  if (latestWeekRow) {
    const latestWeek = latestWeekRow.week

    const [gameEvents, standaloneEvents, episode] = await Promise.all([
      db.gameEvent.findMany({
        where: { isApproved: true, week: latestWeek },
        orderBy: { createdAt: 'desc' },
        include: {
          events: {
            include: {
              contestant: { select: { id: true, name: true, nickname: true } },
            },
          },
          submittedBy: { select: { id: true, name: true } },
          approvedBy: { select: { id: true, name: true } },
        },
      }),
      db.event.findMany({
        where: { isApproved: true, week: latestWeek, gameEventId: null },
        orderBy: { createdAt: 'desc' },
        include: {
          contestant: {
            select: {
              id: true,
              name: true,
              nickname: true,
              imageUrl: true,
              originalImageUrl: true,
              tribeMemberships: {
                where: { toWeek: null },
                include: { tribe: { select: { name: true, color: true, buffImage: true, isMerge: true } } },
                take: 1,
              },
            },
          },
          submittedBy: { select: { id: true, name: true } },
        },
      }),
      db.episode.findFirst({
        where: { number: latestWeek },
        select: { title: true },
      }),
    ])

    const contestantNames: Record<string, string> = {}
    const contestantAvatars: WeekEventsData['contestantAvatars'] = {}
    for (const c of allDbContestants) {
      const currentTribe = c.tribeMemberships[0]?.tribe ?? null
      contestantNames[c.id] = c.nickname || c.name.split(' ')[0]
      contestantAvatars[c.id] = {
        imageUrl: getValidImageUrl(c.imageUrl, c.originalImageUrl),
        tribeColor: currentTribe?.color ?? null,
        tribeBuffImage: currentTribe?.buffImage ?? null,
        tribeIsMerge: currentTribe?.isMerge ?? null,
      }
    }

    const serializedGameEvents = gameEvents.map((ge) => ({
      kind: 'game-event' as const,
      id: ge.id,
      type: ge.type,
      week: ge.week,
      data: ge.data,
      isApproved: ge.isApproved,
      createdAt: ge.createdAt.toISOString(),
      events: ge.events.map((e) => ({
        id: e.id,
        type: e.type,
        points: e.points,
        contestant: { id: e.contestant.id, name: e.contestant.name, nickname: e.contestant.nickname },
      })),
      submittedBy: ge.submittedBy,
      approvedBy: ge.approvedBy,
    }))

    const serializedStandaloneEvents = standaloneEvents.map((e) => ({
      kind: 'standalone' as const,
      id: e.id,
      type: e.type,
      week: e.week,
      points: e.points,
      description: e.description,
      isApproved: e.isApproved,
      createdAt: e.createdAt.toISOString(),
      contestant: { id: e.contestant.id, name: e.contestant.name, nickname: e.contestant.nickname },
      submittedBy: e.submittedBy,
    }))

    weekEventsData = {
      week: latestWeek,
      episodeTitle: episode?.title ?? null,
      gameEvents: serializedGameEvents,
      standaloneEvents: serializedStandaloneEvents,
      contestantNames,
      contestantAvatars,
      tribes,
    }
  }

  const maxScore = standings.length > 0 ? standings[0].totalScore : 0

  return {
    currentUserId: currentUser?.id ?? null,
    standings,
    contestants: uniqueContestants,
    weekEventsData,
    maxScore,
    showLastPlace: league?.showLastPlace ?? false,
  }
}

export default async function LeagueLeaderboardPage({ params }: Props) {
  const { slug } = await params

  // "legacy" slug falls back to the singleton leaderboard data
  let leagueId: string | undefined
  if (slug !== 'legacy') {
    const league = await db.league.findFirst({
      where: { slug },
      select: { id: true },
    })
    if (!league) {
      notFound()
    }
    leagueId = league.id
  }

  const { currentUserId, standings, contestants, weekEventsData, maxScore, showLastPlace } =
    await getOverviewData(leagueId)

  if (standings.length === 0) {
    return (
      <div className="space-y-6 pb-20 lg:pb-6">
        <div className="flex items-center justify-between">
          <div>
            <Link
              href={slug !== 'legacy' ? `/leagues/${slug}/manage` : '/leaderboard'}
              className="flex items-center gap-1 text-sm text-muted-foreground hover:text-foreground mb-2"
            >
              <ArrowLeft className="h-4 w-4" />
              {slug !== 'legacy' ? 'Back to League' : 'Overview'}
            </Link>
            <h1 className="text-3xl font-bold tracking-tight">Overview</h1>
            <p className="text-muted-foreground">Season 50 Fantasy League</p>
          </div>
          <ScoringInfoDialog />
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
      <div className="flex items-center justify-between">
        <div>
          <Link
            href={slug !== 'legacy' ? `/leagues/${slug}/manage` : '/leaderboard'}
            className="flex items-center gap-1 text-sm text-muted-foreground hover:text-foreground mb-2"
          >
            <ArrowLeft className="h-4 w-4" />
            {slug !== 'legacy' ? 'Back to League' : 'Overview'}
          </Link>
          <h1 className="text-3xl font-bold tracking-tight">Overview</h1>
          <p className="text-muted-foreground">Season 50 Fantasy League</p>
        </div>
        <ScoringInfoDialog />
      </div>

      <OverviewClient
        standings={standings}
        contestants={contestants}
        weekEventsData={weekEventsData}
        currentUserId={currentUserId}
        showLastPlace={showLastPlace}
        maxScore={maxScore}
      />
    </div>
  )
}
