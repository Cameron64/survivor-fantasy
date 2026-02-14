import { NextRequest, NextResponse } from 'next/server'
import { requireSimUser } from '../auth'
import {
  loadSeason,
  loadAllSeasons,
  simulateDraft,
  calculateScores,
  runMonteCarlo,
} from '@/simulation/engine'
import type { DraftConfig, MonteCarloConfig, MonteCarloResult } from '@/simulation/engine'
import { SIM_DEFAULTS } from '@/simulation/config/defaults'

export async function POST(req: NextRequest) {
  try {
    await requireSimUser()
    const body = await req.json()
    const {
      season: seasonInput,
      sims = SIM_DEFAULTS.numSimulations,
      players = SIM_DEFAULTS.numPlayers,
      picksPerPlayer = SIM_DEFAULTS.picksPerPlayer,
      maxOwners = SIM_DEFAULTS.maxOwnersPerContestant,
      overrides = {},
    } = body

    const draftConfig: DraftConfig = {
      numPlayers: players,
      picksPerPlayer,
      maxOwnersPerContestant: maxOwners,
      mode: 'random',
    }

    const mcConfig: MonteCarloConfig = {
      numSimulations: sims,
      draftConfig,
      overrides,
    }

    if (seasonInput === 'all') {
      // Run across all seasons
      const allSeasons = loadAllSeasons()
      const results: MonteCarloResult[] = []
      const allHistogramScores: number[] = []

      for (const season of allSeasons) {
        const mcResult = runMonteCarlo(season, mcConfig)
        results.push(mcResult)

        // Collect raw scores for histogram
        for (let i = 0; i < Math.min(sims, 100); i++) {
          const draft = simulateDraft(season, draftConfig, overrides)
          const simResult = calculateScores(season, draft, overrides)
          for (const score of simResult.scores) {
            allHistogramScores.push(score.totalScore)
          }
        }
      }

      const histogram = buildHistogram(allHistogramScores)

      // Cross-season averages
      const avgGini = results.reduce((s, r) => s + r.balance.gini, 0) / results.length
      const avgSpread = results.reduce((s, r) => s + r.balance.spread, 0) / results.length
      const avgLongevity =
        results.reduce((s, r) => s + r.balance.longevityCorrelation, 0) / results.length

      return NextResponse.json({
        results,
        scoreHistogram: histogram,
        crossSeason: {
          avgGini: Math.round(avgGini * 10000) / 10000,
          avgSpread: Math.round(avgSpread * 100) / 100,
          avgLongevity: Math.round(avgLongevity * 10000) / 10000,
        },
      })
    } else {
      const seasonNum = typeof seasonInput === 'number' ? seasonInput : parseInt(seasonInput, 10)
      if (isNaN(seasonNum)) {
        return NextResponse.json({ error: 'Invalid season' }, { status: 400 })
      }

      const season = loadSeason(seasonNum)
      const mcResult = runMonteCarlo(season, mcConfig)

      // Replicate draft loop for histogram data
      const allTeamScores: number[] = []
      for (let i = 0; i < sims; i++) {
        const draft = simulateDraft(season, draftConfig, overrides)
        const simResult = calculateScores(season, draft, overrides)
        for (const score of simResult.scores) {
          allTeamScores.push(score.totalScore)
        }
      }

      const histogram = buildHistogram(allTeamScores)

      return NextResponse.json({
        results: [mcResult],
        scoreHistogram: histogram,
      })
    }
  } catch (error) {
    if (error instanceof Error) {
      if (error.message.includes('Unauthorized')) {
        return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })
      }
      if (error.message.includes('Forbidden')) {
        return NextResponse.json({ error: 'Forbidden' }, { status: 403 })
      }
    }
    const msg = error instanceof Error ? error.message : 'Failed to run batch analysis'
    const isValidation = msg.includes('Not enough draft slots') || msg.includes('No castaways available')
    return NextResponse.json({ error: msg }, { status: isValidation ? 400 : 500 })
  }
}

function buildHistogram(
  scores: number[],
  numBins = 20
): Array<{ binStart: number; binEnd: number; count: number }> {
  if (scores.length === 0) return []

  const min = Math.min(...scores)
  const max = Math.max(...scores)
  const binWidth = Math.max(1, Math.ceil((max - min) / numBins))

  const bins: Array<{ binStart: number; binEnd: number; count: number }> = []
  for (let i = 0; i < numBins; i++) {
    const binStart = min + i * binWidth
    const binEnd = binStart + binWidth
    bins.push({ binStart, binEnd, count: 0 })
  }

  for (const score of scores) {
    const idx = Math.min(Math.floor((score - min) / binWidth), numBins - 1)
    bins[idx].count++
  }

  return bins.filter((b) => b.count > 0)
}
