import type {
  SimSeason,
  SimulationResult,
  BalanceMetrics,
  PointOverrides,
  SimEventType,
} from './types'
import { BASE_EVENT_POINTS } from './data-mapper'

/**
 * Compute the Gini coefficient for an array of values.
 * 0 = perfectly equal, 1 = maximally unequal.
 */
export function gini(values: number[]): number {
  const n = values.length
  if (n === 0) return 0

  const sorted = values.slice().sort((a, b) => a - b)
  const mean = sorted.reduce((a, b) => a + b, 0) / n
  if (mean === 0) return 0

  let sumDiff = 0
  for (let i = 0; i < n; i++) {
    for (let j = 0; j < n; j++) {
      sumDiff += Math.abs(sorted[i] - sorted[j])
    }
  }

  return Math.round((sumDiff / (2 * n * n * mean)) * 10000) / 10000
}

/**
 * Compute Pearson correlation between two arrays.
 */
export function pearsonCorrelation(x: number[], y: number[]): number {
  const n = x.length
  if (n !== y.length || n < 2) return 0

  const meanX = x.reduce((a, b) => a + b, 0) / n
  const meanY = y.reduce((a, b) => a + b, 0) / n

  let num = 0
  let denomX = 0
  let denomY = 0

  for (let i = 0; i < n; i++) {
    const dx = x[i] - meanX
    const dy = y[i] - meanY
    num += dx * dy
    denomX += dx * dx
    denomY += dy * dy
  }

  const denom = Math.sqrt(denomX * denomY)
  if (denom === 0) return 0

  return Math.round((num / denom) * 10000) / 10000
}

/**
 * Analyze the balance of a simulation result.
 */
export function analyzeBalance(
  season: SimSeason,
  result: SimulationResult,
  overrides: PointOverrides = {}
): BalanceMetrics {
  const pts = { ...BASE_EVENT_POINTS, ...overrides }
  const teamScores = result.scores.map((s) => s.totalScore)

  // Gini coefficient of team scores
  const giniCoeff = gini(teamScores)

  // Spread
  const spread = Math.max(...teamScores) - Math.min(...teamScores)

  // Event type contribution: what % of total points comes from each type
  const eventContribution: Record<string, number> = {}
  let totalSeasonPoints = 0

  for (const event of season.events) {
    const eventPoints = Math.abs(pts[event.type])
    totalSeasonPoints += eventPoints
    const key = event.type as string
    eventContribution[key] = (eventContribution[key] || 0) + eventPoints
  }

  if (totalSeasonPoints > 0) {
    for (const key of Object.keys(eventContribution)) {
      eventContribution[key] = Math.round((eventContribution[key] / totalSeasonPoints) * 10000) / 10000
    }
  }

  // Winner advantage: how much the Survivor winner's fantasy points exceed the mean
  const winner = season.castaways.find((c) => c.isWinner)
  let winnerAdvantage = 0
  if (winner) {
    const winnerPoints = season.events
      .filter((e) => e.castawayId === winner.id)
      .reduce((sum, e) => sum + pts[e.type], 0)
    const allCastawayPoints = season.castaways.map((c) =>
      season.events
        .filter((e) => e.castawayId === c.id)
        .reduce((sum, e) => sum + pts[e.type], 0)
    )
    const meanPoints = allCastawayPoints.reduce((a, b) => a + b, 0) / allCastawayPoints.length
    winnerAdvantage = Math.round((winnerPoints - meanPoints) * 100) / 100
  }

  // Longevity correlation: placement (lower = better) vs fantasy points
  // We invert placement so higher = lasted longer
  const placements = season.castaways.map((c) => season.numCastaways - c.placement + 1)
  const castawayPoints = season.castaways.map((c) =>
    season.events
      .filter((e) => e.castawayId === c.id)
      .reduce((sum, e) => sum + pts[e.type], 0)
  )
  const longevityCorrelation = pearsonCorrelation(placements, castawayPoints)

  return {
    gini: giniCoeff,
    spread,
    eventContribution,
    winnerAdvantage,
    longevityCorrelation,
  }
}

/**
 * Suggest alternative point values that might improve balance.
 * Does a simple grid search over small adjustments to each event type.
 */
export function suggestAdjustments(
  season: SimSeason,
  result: SimulationResult,
  currentOverrides: PointOverrides = {}
): Array<{ type: SimEventType; currentPoints: number; suggestedPoints: number; newGini: number }> {
  const currentPts = { ...BASE_EVENT_POINTS, ...currentOverrides }
  const currentGini = analyzeBalance(season, result, currentOverrides).gini
  const suggestions: Array<{
    type: SimEventType
    currentPoints: number
    suggestedPoints: number
    newGini: number
  }> = []

  const eventTypes = Object.keys(currentPts) as SimEventType[]

  for (const eventType of eventTypes) {
    const currentVal = currentPts[eventType]
    let bestGini = currentGini
    let bestVal = currentVal

    // Try adjustments of -3 to +3
    for (let delta = -3; delta <= 3; delta++) {
      if (delta === 0) continue
      const newVal = currentVal + delta
      const testOverrides = { ...currentOverrides, [eventType]: newVal }
      const testGini = analyzeBalance(season, result, testOverrides).gini

      if (testGini < bestGini) {
        bestGini = testGini
        bestVal = newVal
      }
    }

    if (bestVal !== currentVal) {
      suggestions.push({
        type: eventType,
        currentPoints: currentVal,
        suggestedPoints: bestVal,
        newGini: bestGini,
      })
    }
  }

  return suggestions.sort((a, b) => a.newGini - b.newGini)
}
