import { NextRequest, NextResponse } from 'next/server'
import { requireSimUser } from '../auth'
import { loadSeason, loadAllSeasons } from '@/simulation/engine'
import {
  aggregateSeasonScoring,
  buildCrossSeasonLeaderboard,
  buildEventTrendData,
  buildPlayerIndex,
} from '@/simulation/engine/explore-aggregator'

export async function POST(req: NextRequest) {
  try {
    await requireSimUser()
    const body = await req.json()
    const { seasons: seasonInput, overrides = {} } = body

    // Load requested seasons
    let seasonData
    if (seasonInput === 'all') {
      seasonData = loadAllSeasons()
    } else if (Array.isArray(seasonInput) && seasonInput.length > 0) {
      seasonData = seasonInput.map((n: number) => loadSeason(n))
    } else {
      return NextResponse.json({ error: 'seasons must be "all" or a non-empty array of numbers' }, { status: 400 })
    }

    const seasons = seasonData.map((s) => aggregateSeasonScoring(s, overrides))
    const leaderboard = buildCrossSeasonLeaderboard(seasonData, overrides, 50)
    const eventTrends = buildEventTrendData(seasonData, overrides)
    const playerIndex = buildPlayerIndex(seasonData, overrides)

    return NextResponse.json({ seasons, leaderboard, eventTrends, playerIndex })
  } catch (error) {
    if (error instanceof Error) {
      if (error.message.includes('Unauthorized')) {
        return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })
      }
      if (error.message.includes('Forbidden')) {
        return NextResponse.json({ error: 'Forbidden' }, { status: 403 })
      }
    }
    const msg = error instanceof Error ? error.message : 'Failed to run exploration'
    return NextResponse.json({ error: msg }, { status: 500 })
  }
}
