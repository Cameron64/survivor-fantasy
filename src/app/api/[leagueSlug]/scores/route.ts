import { NextRequest, NextResponse } from 'next/server'
import { db } from '@/lib/db'
import { getCurrentUser } from '@/lib/auth'
import { getValidImageUrl } from '@/lib/utils'
import { calculateTotalPoints, calculatePointsByWeek } from '@/lib/scoring'
import { getLeagueBySlug } from '@/lib/league-context'

interface RouteParams {
  params: Promise<{ leagueSlug: string }>
}

// GET /api/[leagueSlug]/scores
export async function GET(req: NextRequest, { params }: RouteParams) {
  try {
    const { leagueSlug } = await params
    const league = await getLeagueBySlug(leagueSlug)
    if (!league) {
      return NextResponse.json({ error: 'League not found' }, { status: 404 })
    }

    const user = await getCurrentUser()
    if (!user && !league.isPublic) {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })
    }

    const searchParams = req.nextUrl.searchParams
    const week = searchParams.get('week')

    const teams = await db.team.findMany({
      where: { leagueId: league.id },
      include: {
        user: {
          select: { id: true, name: true, isPaid: true },
        },
        contestants: {
          include: {
            contestant: {
              include: {
                events: {
                  where: {
                    isApproved: true,
                    ...(week && { week: parseInt(week) }),
                  },
                },
              },
            },
          },
        },
      },
    })

    const leaderboard = teams.map((team) => {
      const contestantScores = team.contestants.map((tc) => {
        const events = tc.contestant.events
        const totalPoints = calculateTotalPoints(events)
        const weeklyPoints = calculatePointsByWeek(events)

        return {
          contestant: {
            id: tc.contestant.id,
            name: tc.contestant.name,
            imageUrl: getValidImageUrl(tc.contestant.imageUrl, tc.contestant.originalImageUrl),
            isEliminated: tc.contestant.isEliminated,
          },
          draftOrder: tc.draftOrder,
          totalPoints,
          weeklyPoints,
          events: events.map((e) => ({
            id: e.id,
            type: e.type,
            week: e.week,
            points: e.points,
          })),
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

    const rankedLeaderboard = leaderboard.map((entry, index) => ({
      ...entry,
      rank: index + 1,
    }))

    return NextResponse.json(rankedLeaderboard)
  } catch (error) {
    console.error('Error fetching scores:', error)
    return NextResponse.json({ error: 'Failed to fetch scores' }, { status: 500 })
  }
}
