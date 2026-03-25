import { NextRequest, NextResponse } from 'next/server'
import { requireUser } from '@/lib/auth'
import { db } from '@/lib/db'
import { getLeagueBySlug } from '@/lib/league-context'
import type { SeasonReadiness } from '@/lib/season-readiness'

interface RouteParams {
  params: Promise<{ leagueSlug: string }>
}

// GET /api/[leagueSlug]/season-readiness
export async function GET(_req: NextRequest, { params }: RouteParams) {
  try {
    await requireUser()
    const { leagueSlug } = await params

    const league = await getLeagueBySlug(leagueSlug)
    if (!league) {
      const result: SeasonReadiness = {
        isReady: false,
        checks: { hasContestants: false, hasTribes: false, allContestantsAssigned: false, hasEpisodes: false },
        details: { contestantCount: 0, tribeCount: 0, unassignedCount: 0, episodeCount: 0 },
      }
      return NextResponse.json(result)
    }

    const [contestantCount, tribeCount, episodeCount, assignedCount] = await Promise.all([
      db.contestant.count({ where: { seasonId: league.seasonId ?? undefined } }),
      db.tribe.count({ where: { leagueId: league.id } }),
      db.episode.count({ where: { leagueId: league.id } }),
      db.contestant.count({
        where: {
          seasonId: league.seasonId ?? undefined,
          tribeMemberships: { some: { toWeek: null } },
        },
      }),
    ])

    const unassignedCount = contestantCount - assignedCount
    const hasContestants = contestantCount > 0
    const hasTribes = tribeCount > 0
    const allContestantsAssigned = hasContestants && unassignedCount === 0
    const hasEpisodes = episodeCount > 0

    const result: SeasonReadiness = {
      isReady: hasContestants && hasEpisodes,
      checks: { hasContestants, hasTribes, allContestantsAssigned, hasEpisodes },
      details: { contestantCount, tribeCount, unassignedCount, episodeCount },
    }

    return NextResponse.json(result)
  } catch (error) {
    if (error instanceof Error && error.message === 'Unauthorized') {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })
    }
    console.error('Error checking season readiness:', error)
    return NextResponse.json({ error: 'Failed to check readiness' }, { status: 500 })
  }
}
