import type {
  SimSeason,
  DraftConfig,
  MonteCarloResult,
  PointOverrides,
  SimulationResult,
} from './types'
import { simulateDraft } from './draft-simulator'
import { calculateScores } from './score-calculator'
import { analyzeBalance } from './balance-analyzer'
import { BASE_EVENT_POINTS } from './data-mapper'

export interface MonteCarloConfig {
  numSimulations: number
  draftConfig: DraftConfig
  overrides?: PointOverrides
  /** Pin a specific player's picks across all simulations */
  pinnedPicks?: { playerIndex: number; castawayIds: string[] }
}

export function runMonteCarlo(
  season: SimSeason,
  config: MonteCarloConfig
): MonteCarloResult {
  const { numSimulations, draftConfig, overrides = {} } = config
  const results: SimulationResult[] = []

  // Track per-castaway stats
  const castawayDraftCount = new Map<string, number>()
  const castawayTeamRanks = new Map<string, number[]>()
  const allTeamScores: number[] = []

  for (let i = 0; i < numSimulations; i++) {
    // Build draft config with pinned picks if specified
    const simDraftConfig: DraftConfig = {
      ...draftConfig,
      mode: config.pinnedPicks ? 'hybrid' : draftConfig.mode,
      manualPicks: config.pinnedPicks
        ? { [config.pinnedPicks.playerIndex]: config.pinnedPicks.castawayIds }
        : draftConfig.manualPicks,
    }

    const draft = simulateDraft(season, simDraftConfig, overrides)
    const result = calculateScores(season, draft, overrides)
    results.push(result)

    // Track draft rates
    for (const castawayIds of Object.values(draft.teams)) {
      for (const id of castawayIds) {
        castawayDraftCount.set(id, (castawayDraftCount.get(id) || 0) + 1)
      }
    }

    // Track team ranks per castaway
    for (const score of result.scores) {
      const rank = result.rankings.indexOf(score.playerIndex) + 1
      allTeamScores.push(score.totalScore)
      for (const castaway of score.castaways) {
        if (!castawayTeamRanks.has(castaway.id)) castawayTeamRanks.set(castaway.id, [])
        castawayTeamRanks.get(castaway.id)!.push(rank)
      }
    }
  }

  // Calculate castaway stats
  const totalDraftSlots = draftConfig.numPlayers * draftConfig.picksPerPlayer * numSimulations
  const castawayStats = season.castaways.map((c) => {
    const draftCount = castawayDraftCount.get(c.id) || 0
    const ranks = castawayTeamRanks.get(c.id) || []
    const avgRank = ranks.length > 0 ? ranks.reduce((a, b) => a + b, 0) / ranks.length : 0

    // Calculate total points for this castaway
    const pts = { ...BASE_EVENT_POINTS, ...overrides }
    let totalPoints = 0
    for (const e of season.events.filter((ev) => ev.castawayId === c.id)) {
      totalPoints += pts[e.type]
    }

    return {
      id: c.id,
      name: c.name,
      totalPoints,
      avgTeamRank: Math.round(avgRank * 100) / 100,
      draftRate: Math.round((draftCount / totalDraftSlots) * 1000) / 1000,
    }
  })

  // Score distribution
  const sorted = allTeamScores.slice().sort((a, b) => a - b)
  const mean = sorted.reduce((a, b) => a + b, 0) / sorted.length
  const variance = sorted.reduce((sum, s) => sum + (s - mean) ** 2, 0) / sorted.length

  const scoreDistribution = {
    mean: Math.round(mean * 100) / 100,
    median: sorted[Math.floor(sorted.length / 2)],
    stdDev: Math.round(Math.sqrt(variance) * 100) / 100,
    min: sorted[0],
    max: sorted[sorted.length - 1],
    p25: sorted[Math.floor(sorted.length * 0.25)],
    p75: sorted[Math.floor(sorted.length * 0.75)],
  }

  // Balance analysis from the last simulation (representative)
  const balance = analyzeBalance(season, results[results.length - 1], overrides)

  return {
    season: season.season,
    numSimulations,
    numPlayers: draftConfig.numPlayers,
    picksPerPlayer: draftConfig.picksPerPlayer,
    castawayStats: castawayStats.sort((a, b) => b.totalPoints - a.totalPoints),
    scoreDistribution,
    balance,
  }
}
