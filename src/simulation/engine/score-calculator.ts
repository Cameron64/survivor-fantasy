import type {
  SimSeason,
  SimEventType,
  DraftResult,
  PlayerScore,
  SimulationResult,
  PointOverrides,
} from './types'
import { BASE_EVENT_POINTS } from './data-mapper'

/**
 * Calculate scores for all players after a draft.
 * Reuses BASE_EVENT_POINTS as the baseline, with optional overrides
 * for balance testing.
 */
export function calculateScores(
  season: SimSeason,
  draft: DraftResult,
  overrides: PointOverrides = {}
): SimulationResult {
  const pts = { ...BASE_EVENT_POINTS, ...overrides }
  const scores: PlayerScore[] = []

  for (const [playerIdxStr, castawayIds] of Object.entries(draft.teams)) {
    const playerIndex = parseInt(playerIdxStr, 10)
    const castawayScores = castawayIds.map((castawayId) => {
      const castaway = season.castaways.find((c) => c.id === castawayId)
      const castawayEvents = season.events.filter((e) => e.castawayId === castawayId)

      const eventBreakdown: Partial<Record<SimEventType, number>> = {}
      let score = 0

      for (const event of castawayEvents) {
        const eventPoints = pts[event.type]
        score += eventPoints
        eventBreakdown[event.type] = (eventBreakdown[event.type] || 0) + eventPoints
      }

      return {
        id: castawayId,
        name: castaway?.name ?? castawayId,
        score,
        eventBreakdown,
      }
    })

    const totalScore = castawayScores.reduce((sum, c) => sum + c.score, 0)

    // Score by episode
    const scoreByEpisode: Record<number, number> = {}
    for (const castawayId of castawayIds) {
      for (const event of season.events.filter((e) => e.castawayId === castawayId)) {
        scoreByEpisode[event.episode] =
          (scoreByEpisode[event.episode] || 0) + pts[event.type]
      }
    }

    scores.push({
      playerIndex,
      totalScore,
      castaways: castawayScores,
      scoreByEpisode,
    })
  }

  // Rankings: sort by total score descending
  const rankings = scores
    .slice()
    .sort((a, b) => b.totalScore - a.totalScore)
    .map((s) => s.playerIndex)

  return {
    season: season.season,
    draft,
    scores,
    rankings,
  }
}

/**
 * Calculate total fantasy points for every castaway in a season.
 * Useful for the preview CLI command.
 */
export function calculateCastawayScores(
  season: SimSeason,
  overrides: PointOverrides = {}
): Array<{
  id: string
  name: string
  placement: number
  totalPoints: number
  breakdown: Partial<Record<SimEventType, number>>
}> {
  const pts = { ...BASE_EVENT_POINTS, ...overrides }

  return season.castaways.map((castaway) => {
    const castawayEvents = season.events.filter((e) => e.castawayId === castaway.id)
    const breakdown: Partial<Record<SimEventType, number>> = {}
    let totalPoints = 0

    for (const event of castawayEvents) {
      const eventPoints = pts[event.type]
      totalPoints += eventPoints
      breakdown[event.type] = (breakdown[event.type] || 0) + eventPoints
    }

    return {
      id: castaway.id,
      name: castaway.name,
      placement: castaway.placement,
      totalPoints,
      breakdown,
    }
  })
}
