import { NextRequest, NextResponse } from 'next/server'
import { requireSimUser } from '../auth'
import { loadSeason, simulateDraft, calculateScores } from '@/simulation/engine'
import type { DraftConfig } from '@/simulation/engine'
import { SIM_DEFAULTS } from '@/simulation/config/defaults'

export async function POST(req: NextRequest) {
  try {
    await requireSimUser()
    const body = await req.json()
    const {
      season: seasonNum,
      players = SIM_DEFAULTS.numPlayers,
      picksPerPlayer = SIM_DEFAULTS.picksPerPlayer,
      maxOwners = SIM_DEFAULTS.maxOwnersPerContestant,
      overrides = {},
    } = body

    if (!seasonNum || typeof seasonNum !== 'number') {
      return NextResponse.json({ error: 'Season number is required' }, { status: 400 })
    }

    const season = loadSeason(seasonNum)

    const draftConfig: DraftConfig = {
      numPlayers: players,
      picksPerPlayer,
      maxOwnersPerContestant: maxOwners,
      mode: 'random',
    }

    const draft = simulateDraft(season, draftConfig, overrides)
    const result = calculateScores(season, draft, overrides)

    // Build castaway name map
    const castawayNames: Record<string, string> = {}
    for (const c of season.castaways) {
      castawayNames[c.id] = c.name
    }

    return NextResponse.json({
      season: {
        season: season.season,
        name: season.name,
        numCastaways: season.numCastaways,
        numEpisodes: season.numEpisodes,
      },
      result,
      castawayNames,
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
    const msg = error instanceof Error ? error.message : 'Failed to run simulation'
    const isValidation = msg.includes('Not enough draft slots') || msg.includes('No castaways available')
    return NextResponse.json({ error: msg }, { status: isValidation ? 400 : 500 })
  }
}
