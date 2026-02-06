import { NextRequest, NextResponse } from 'next/server'
import { requireSimAdmin } from '../auth'
import { loadSeason, runMonteCarlo } from '@/simulation/engine'
import type { DraftConfig, MonteCarloConfig } from '@/simulation/engine'
import { SIM_DEFAULTS } from '@/simulation/config/defaults'

export async function POST(req: NextRequest) {
  try {
    await requireSimAdmin()
    const body = await req.json()
    const {
      season: seasonNum,
      sims = SIM_DEFAULTS.numSimulations,
      players = SIM_DEFAULTS.numPlayers,
      picksPerPlayer = SIM_DEFAULTS.picksPerPlayer,
      maxOwners = SIM_DEFAULTS.maxOwnersPerContestant,
      schemeA,
      schemeB,
    } = body

    if (!seasonNum || typeof seasonNum !== 'number') {
      return NextResponse.json({ error: 'Season number is required' }, { status: 400 })
    }
    if (!schemeA || !schemeB) {
      return NextResponse.json({ error: 'Both schemeA and schemeB are required' }, { status: 400 })
    }

    const season = loadSeason(seasonNum)

    const draftConfig: DraftConfig = {
      numPlayers: players,
      picksPerPlayer,
      maxOwnersPerContestant: maxOwners,
      mode: 'random',
    }

    const configA: MonteCarloConfig = {
      numSimulations: sims,
      draftConfig,
      overrides: schemeA.overrides ?? {},
    }

    const configB: MonteCarloConfig = {
      numSimulations: sims,
      draftConfig,
      overrides: schemeB.overrides ?? {},
    }

    const resultA = runMonteCarlo(season, configA)
    const resultB = runMonteCarlo(season, configB)

    return NextResponse.json({
      schemeA: { label: schemeA.label || 'Scheme A', result: resultA },
      schemeB: { label: schemeB.label || 'Scheme B', result: resultB },
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
    const msg = error instanceof Error ? error.message : 'Failed to run comparison'
    return NextResponse.json({ error: msg }, { status: 500 })
  }
}
