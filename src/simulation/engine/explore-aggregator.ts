import type { SimSeason, SimEventType, PointOverrides } from './types'
import { calculateCastawayScores } from './score-calculator'
import { BASE_EVENT_POINTS } from './data-mapper'

/**
 * Event categories — duplicated from sim-constants since engine can't import client code.
 */
const EVENT_CATEGORIES: Record<string, SimEventType[]> = {
  Challenges: ['INDIVIDUAL_IMMUNITY_WIN', 'REWARD_CHALLENGE_WIN', 'TEAM_CHALLENGE_WIN', 'FIRE_MAKING_WIN'],
  Tribal: ['CORRECT_VOTE', 'ZERO_VOTES_RECEIVED', 'SURVIVED_WITH_VOTES', 'CAUSED_BLINDSIDE'],
  Idols: ['IDOL_FIND', 'IDOL_PLAY_SUCCESS'],
  Endgame: ['MADE_JURY', 'FINALIST', 'WINNER'],
  Penalties: ['VOTED_OUT_WITH_IDOL', 'QUIT'],
}

interface SeasonStats {
  avgPoints: number
  medianPoints: number
  topPoints: number
  bottomPoints: number
  eventTypeBreakdown: Array<{
    type: SimEventType
    count: number
    totalPoints: number
    percentage: number
  }>
}

interface CastawayEpisodeTrendEntry {
  episode: number
  [castawayName: string]: number
}

interface SeasonScoring {
  season: number
  name: string
  numCastaways: number
  numEpisodes: number
  stats: SeasonStats
  castaways: Array<{
    id: string
    name: string
    placement: number
    totalPoints: number
    breakdown: Partial<Record<SimEventType, number>>
  }>
  castawayTrends: CastawayEpisodeTrendEntry[]
}

interface LeaderboardEntry {
  name: string
  season: number
  seasonName: string
  placement: number
  totalPoints: number
  breakdown: Partial<Record<SimEventType, number>>
}

interface EventTrendEntry {
  season: number
  [category: string]: number
}

export interface PlayerSeasonAppearance {
  season: number
  seasonName: string
  placement: number
  isWinner: boolean
  isFinalist: boolean
  isJury: boolean
  totalPoints: number
  breakdown: Partial<Record<SimEventType, number>>
  episodeTrends: Array<{ episode: number; points: number }>
}

export interface PlayerProfile {
  id: string
  name: string
  seasons: PlayerSeasonAppearance[]
  careerPoints: number
  seasonsPlayed: number
  bestPlacement: number
}

/**
 * Build a player index grouped by castaway_id across all seasons.
 * Each player profile includes all season appearances, career totals, and per-episode trends.
 */
export function buildPlayerIndex(
  seasons: SimSeason[],
  overrides: PointOverrides = {}
): PlayerProfile[] {
  const pts = { ...BASE_EVENT_POINTS, ...overrides }
  const profileMap = new Map<string, PlayerProfile>()

  for (const season of seasons) {
    const castawayScores = calculateCastawayScores(season, overrides)

    // Build per-castaway per-episode cumulative points for this season
    const episodePointsByCastaway = new Map<string, Map<number, number>>()
    for (const event of season.events) {
      if (!episodePointsByCastaway.has(event.castawayId)) {
        episodePointsByCastaway.set(event.castawayId, new Map())
      }
      const epMap = episodePointsByCastaway.get(event.castawayId)!
      epMap.set(event.episode, (epMap.get(event.episode) || 0) + pts[event.type])
    }

    for (const scored of castawayScores) {
      const castaway = season.castaways.find((c) => c.id === scored.id)
      if (!castaway) continue

      // Build cumulative episode trends for this castaway
      const epMap = episodePointsByCastaway.get(scored.id) || new Map()
      const episodes = Array.from(epMap.keys()).sort((a, b) => a - b)
      let cumulative = 0
      const episodeTrends = episodes.map((ep) => {
        cumulative += epMap.get(ep) || 0
        return { episode: ep, points: cumulative }
      })

      const appearance: PlayerSeasonAppearance = {
        season: season.season,
        seasonName: season.name,
        placement: castaway.placement,
        isWinner: castaway.isWinner,
        isFinalist: castaway.isFinalist,
        isJury: castaway.isJury,
        totalPoints: scored.totalPoints,
        breakdown: scored.breakdown,
        episodeTrends,
      }

      if (profileMap.has(scored.id)) {
        const profile = profileMap.get(scored.id)!
        profile.seasons.push(appearance)
        profile.careerPoints += scored.totalPoints
        profile.seasonsPlayed += 1
        if (castaway.placement < profile.bestPlacement) {
          profile.bestPlacement = castaway.placement
        }
      } else {
        profileMap.set(scored.id, {
          id: scored.id,
          name: scored.name,
          seasons: [appearance],
          careerPoints: scored.totalPoints,
          seasonsPlayed: 1,
          bestPlacement: castaway.placement,
        })
      }
    }
  }

  // Sort seasons within each profile and return sorted by career points desc
  const profiles = Array.from(profileMap.values())
  for (const p of profiles) {
    p.seasons.sort((a, b) => a.season - b.season)
  }
  return profiles.sort((a, b) => b.careerPoints - a.careerPoints)
}

function median(values: number[]): number {
  if (values.length === 0) return 0
  const sorted = [...values].sort((a, b) => a - b)
  const mid = Math.floor(sorted.length / 2)
  return sorted.length % 2 !== 0 ? sorted[mid] : (sorted[mid - 1] + sorted[mid]) / 2
}

/**
 * Build per-episode cumulative point totals for each castaway in a season.
 */
function buildCastawayEpisodeTrends(
  season: SimSeason,
  overrides: PointOverrides = {}
): CastawayEpisodeTrendEntry[] {
  const pts = { ...BASE_EVENT_POINTS, ...overrides }

  // Build castaway id -> name lookup
  const nameById = new Map<string, string>()
  for (const c of season.castaways) {
    nameById.set(c.id, c.name)
  }

  // Accumulate points per castaway per episode
  const episodePoints = new Map<number, Map<string, number>>()
  for (const event of season.events) {
    if (!episodePoints.has(event.episode)) {
      episodePoints.set(event.episode, new Map())
    }
    const epMap = episodePoints.get(event.episode)!
    const prev = epMap.get(event.castawayId) || 0
    epMap.set(event.castawayId, prev + pts[event.type])
  }

  const episodes = Array.from(episodePoints.keys()).sort((a, b) => a - b)
  const castawayIds = season.castaways.map((c) => c.id)

  // Build cumulative trend
  const cumulative = new Map<string, number>()
  for (const id of castawayIds) {
    cumulative.set(id, 0)
  }

  return episodes.map((episode) => {
    const epMap = episodePoints.get(episode)!
    const entry: CastawayEpisodeTrendEntry = { episode }

    for (const id of castawayIds) {
      const earned = epMap.get(id) || 0
      cumulative.set(id, cumulative.get(id)! + earned)
      const name = nameById.get(id) || id
      entry[name] = cumulative.get(id)!
    }

    return entry
  })
}

/**
 * Aggregate scoring stats for a single season.
 */
export function aggregateSeasonScoring(
  season: SimSeason,
  overrides: PointOverrides = {}
): SeasonScoring {
  const pts = { ...BASE_EVENT_POINTS, ...overrides }
  const castaways = calculateCastawayScores(season, overrides)
  const scores = castaways.map((c) => c.totalPoints)

  // Event type breakdown
  const eventCounts: Partial<Record<SimEventType, number>> = {}
  const eventPoints: Partial<Record<SimEventType, number>> = {}

  for (const event of season.events) {
    eventCounts[event.type] = (eventCounts[event.type] || 0) + 1
    eventPoints[event.type] = (eventPoints[event.type] || 0) + pts[event.type]
  }

  const totalPoints = scores.reduce((s, v) => s + v, 0)

  const eventTypeBreakdown = (Object.keys(pts) as SimEventType[])
    .filter((t) => (eventCounts[t] || 0) > 0)
    .map((type) => ({
      type,
      count: eventCounts[type] || 0,
      totalPoints: eventPoints[type] || 0,
      percentage: totalPoints > 0 ? (eventPoints[type] || 0) / totalPoints : 0,
    }))
    .sort((a, b) => b.totalPoints - a.totalPoints)

  return {
    season: season.season,
    name: season.name,
    numCastaways: season.numCastaways,
    numEpisodes: season.numEpisodes,
    stats: {
      avgPoints: scores.length > 0 ? Math.round((totalPoints / scores.length) * 100) / 100 : 0,
      medianPoints: Math.round(median(scores) * 100) / 100,
      topPoints: scores.length > 0 ? Math.max(...scores) : 0,
      bottomPoints: scores.length > 0 ? Math.min(...scores) : 0,
      eventTypeBreakdown,
    },
    castaways: castaways.sort((a, b) => b.totalPoints - a.totalPoints),
    castawayTrends: buildCastawayEpisodeTrends(season, overrides),
  }
}

/**
 * Build a cross-season leaderboard of top-scoring castaways.
 */
export function buildCrossSeasonLeaderboard(
  seasons: SimSeason[],
  overrides: PointOverrides = {},
  topN = 50
): LeaderboardEntry[] {
  const all: LeaderboardEntry[] = []

  for (const season of seasons) {
    const castaways = calculateCastawayScores(season, overrides)
    for (const c of castaways) {
      all.push({
        name: c.name,
        season: season.season,
        seasonName: season.name,
        placement: c.placement,
        totalPoints: c.totalPoints,
        breakdown: c.breakdown,
      })
    }
  }

  return all.sort((a, b) => b.totalPoints - a.totalPoints).slice(0, topN)
}

/**
 * Build event category trend data across seasons.
 * For each season, computes what % of total points each event category contributed.
 */
export function buildEventTrendData(
  seasons: SimSeason[],
  overrides: PointOverrides = {}
): EventTrendEntry[] {
  const pts = { ...BASE_EVENT_POINTS, ...overrides }

  return seasons
    .sort((a, b) => a.season - b.season)
    .map((season) => {
      // Sum points per category
      const categoryPoints: Record<string, number> = {}
      for (const cat of Object.keys(EVENT_CATEGORIES)) {
        categoryPoints[cat] = 0
      }

      let totalPoints = 0
      for (const event of season.events) {
        const eventPts = pts[event.type]
        totalPoints += eventPts
        for (const [cat, types] of Object.entries(EVENT_CATEGORIES)) {
          if (types.includes(event.type)) {
            categoryPoints[cat] += eventPts
            break
          }
        }
      }

      const entry: EventTrendEntry = { season: season.season }
      for (const cat of Object.keys(EVENT_CATEGORIES)) {
        entry[cat] = totalPoints > 0
          ? Math.round((categoryPoints[cat] / totalPoints) * 1000) / 10
          : 0
      }

      return entry
    })
}
