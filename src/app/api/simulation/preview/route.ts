import { NextRequest, NextResponse } from 'next/server'
import { requireSimUser } from '../auth'
import { loadSeason, calculateCastawayScores } from '@/simulation/engine'

export async function POST(req: NextRequest) {
  try {
    await requireSimUser()
    const body = await req.json()
    const { season: seasonNum, overrides } = body

    if (!seasonNum || typeof seasonNum !== 'number') {
      return NextResponse.json({ error: 'Season number is required' }, { status: 400 })
    }

    const season = loadSeason(seasonNum)
    const castaways = calculateCastawayScores(season, overrides ?? {})

    return NextResponse.json({
      season: {
        season: season.season,
        name: season.name,
        numCastaways: season.numCastaways,
        numEpisodes: season.numEpisodes,
      },
      castaways: castaways.sort((a, b) => b.totalPoints - a.totalPoints),
    })
  } catch (error) {
    if (error instanceof Error) {
      if (error.message.includes('Unauthorized')) {
        return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })
      }
      if (error.message.includes('Forbidden')) {
        return NextResponse.json({ error: 'Forbidden' }, { status: 403 })
      }
    }
    const msg = error instanceof Error ? error.message : 'Failed to run preview'
    return NextResponse.json({ error: msg }, { status: 500 })
  }
}
