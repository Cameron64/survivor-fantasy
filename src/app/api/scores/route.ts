import { NextRequest, NextResponse } from 'next/server'
import { db } from '@/lib/db'
import { requireUser } from '@/lib/auth'
import { calculateTotalPoints, calculatePointsByWeek } from '@/lib/scoring'

// GET /api/scores - Get leaderboard with scores
export async function GET(req: NextRequest) {
  try {
    await requireUser()

    const searchParams = req.nextUrl.searchParams
    const week = searchParams.get('week')

    // Get all teams with their contestants and events
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

    // Calculate scores for each team
    const leaderboard = teams.map((team) => {
      const contestantScores = team.contestants.map((tc) => {
        const events = tc.contestant.events
        const totalPoints = calculateTotalPoints(events)
        const weeklyPoints = calculatePointsByWeek(events)

        return {
          contestant: {
            id: tc.contestant.id,
            name: tc.contestant.name,
            tribe: tc.contestant.tribe,
            imageUrl: tc.contestant.imageUrl,
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

    // Sort by total score descending
    leaderboard.sort((a, b) => b.totalScore - a.totalScore)

    // Add rank
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
