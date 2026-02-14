import type { SimEventType } from '@/simulation/engine/types'
import type { PlayerProfile } from './player-types'
import { EVENT_CATEGORIES } from './sim-constants'

export interface CompareMetrics {
  id: string
  name: string
  careerPoints: number
  seasonsPlayed: number
  avgPlacement: number
  totalEpisodes: number
  pointsPerEpisode: number | null
  // Challenge
  immunityWins: number
  immunityWinRate: number | null
  allChallengeWins: number
  challengeWinRate: number | null
  // Idols
  idolFinds: number
  idolFindRate: number | null
  idolPlaysSuccess: number
  // Tribal
  correctVotes: number
  tribalsSurvived: number
  votingAccuracy: number | null
  zeroVotesReceived: number
  survivalStealth: number | null
  survivedWithVotes: number
  threatLevel: number | null
  // Endgame
  seasonsMadeJury: number
  juryMakeRate: number | null
  finalistSeasons: number
  finalistRate: number | null
  winnerSeasons: number
  // Category breakdown
  categoryBreakdown: Record<string, number>
  categoryPercentages: Record<string, number>
}

export interface RadarDataPoint {
  axis: string
  axisLabel: string
  [playerName: string]: number | string
}

/** Derive event count from point total and per-event point value */
function getEventCount(
  breakdown: Partial<Record<SimEventType, number>>,
  type: SimEventType,
  pointValue: number
): number {
  const pts = breakdown[type] ?? 0
  if (pointValue === 0) return 0
  return Math.round(pts / pointValue)
}

export function computeCompareMetrics(
  player: PlayerProfile,
  pointValues: Record<SimEventType, number>
): CompareMetrics {
  const { seasons } = player

  // Aggregate breakdowns across all seasons
  const totalBreakdown: Partial<Record<SimEventType, number>> = {}
  for (const s of seasons) {
    for (const [type, pts] of Object.entries(s.breakdown)) {
      const t = type as SimEventType
      totalBreakdown[t] = (totalBreakdown[t] ?? 0) + (pts ?? 0)
    }
  }

  // Total episodes = sum of max episode from each season's episodeTrends
  const totalEpisodes = seasons.reduce((sum, s) => {
    if (s.episodeTrends.length === 0) return sum
    return sum + Math.max(...s.episodeTrends.map((t) => t.episode))
  }, 0)

  // Event counts
  const immunityWins = getEventCount(totalBreakdown, 'INDIVIDUAL_IMMUNITY_WIN', pointValues.INDIVIDUAL_IMMUNITY_WIN)
  const rewardWins = getEventCount(totalBreakdown, 'REWARD_CHALLENGE_WIN', pointValues.REWARD_CHALLENGE_WIN)
  const teamWins = getEventCount(totalBreakdown, 'TEAM_CHALLENGE_WIN', pointValues.TEAM_CHALLENGE_WIN)
  const fireMakingWins = getEventCount(totalBreakdown, 'FIRE_MAKING_WIN', pointValues.FIRE_MAKING_WIN)
  const allChallengeWins = immunityWins + rewardWins + teamWins + fireMakingWins

  const idolFinds = getEventCount(totalBreakdown, 'IDOL_FIND', pointValues.IDOL_FIND)
  const idolPlaysSuccess = getEventCount(totalBreakdown, 'IDOL_PLAY_SUCCESS', pointValues.IDOL_PLAY_SUCCESS)

  const correctVotes = getEventCount(totalBreakdown, 'CORRECT_VOTE', pointValues.CORRECT_VOTE)
  const zeroVotesReceived = getEventCount(totalBreakdown, 'ZERO_VOTES_RECEIVED', pointValues.ZERO_VOTES_RECEIVED)
  const survivedWithVotes = getEventCount(totalBreakdown, 'SURVIVED_WITH_VOTES', pointValues.SURVIVED_WITH_VOTES)
  const tribalsSurvived = zeroVotesReceived + survivedWithVotes

  const seasonsMadeJury = seasons.filter((s) => s.isJury).length
  const finalistSeasons = seasons.filter((s) => s.isFinalist).length
  const winnerSeasons = seasons.filter((s) => s.isWinner).length

  const avgPlacement = seasons.length > 0
    ? seasons.reduce((sum, s) => sum + s.placement, 0) / seasons.length
    : 0

  // Category breakdown
  const categoryBreakdown: Record<string, number> = {}
  for (const [category, eventTypes] of Object.entries(EVENT_CATEGORIES)) {
    let sum = 0
    for (const et of eventTypes) {
      sum += totalBreakdown[et] ?? 0
    }
    categoryBreakdown[category] = sum
  }

  const totalPts = player.careerPoints || 1
  const categoryPercentages: Record<string, number> = {}
  for (const [cat, pts] of Object.entries(categoryBreakdown)) {
    categoryPercentages[cat] = Math.round((pts / totalPts) * 100)
  }

  return {
    id: player.id,
    name: player.name,
    careerPoints: player.careerPoints,
    seasonsPlayed: player.seasonsPlayed,
    avgPlacement,
    totalEpisodes,
    pointsPerEpisode: totalEpisodes > 0 ? round2(player.careerPoints / totalEpisodes) : null,
    immunityWins,
    immunityWinRate: totalEpisodes > 0 ? round2(immunityWins / totalEpisodes) : null,
    allChallengeWins,
    challengeWinRate: totalEpisodes > 0 ? round2(allChallengeWins / totalEpisodes) : null,
    idolFinds,
    idolFindRate: totalEpisodes > 0 ? round2(idolFinds / totalEpisodes) : null,
    idolPlaysSuccess,
    correctVotes,
    tribalsSurvived,
    votingAccuracy: tribalsSurvived > 0 ? round2(correctVotes / tribalsSurvived) : null,
    zeroVotesReceived,
    survivalStealth: tribalsSurvived > 0 ? round2(zeroVotesReceived / tribalsSurvived) : null,
    survivedWithVotes,
    threatLevel: tribalsSurvived > 0 ? round2(survivedWithVotes / tribalsSurvived) : null,
    seasonsMadeJury,
    juryMakeRate: seasons.length > 0 ? round2(seasonsMadeJury / seasons.length) : null,
    finalistSeasons,
    finalistRate: seasons.length > 0 ? round2(finalistSeasons / seasons.length) : null,
    winnerSeasons,
    categoryBreakdown,
    categoryPercentages,
  }
}

const RADAR_AXES: { key: keyof CompareMetrics; label: string }[] = [
  { key: 'pointsPerEpisode', label: 'PPE' },
  { key: 'challengeWinRate', label: 'Challenge' },
  { key: 'idolFindRate', label: 'Idol Find' },
  { key: 'votingAccuracy', label: 'Voting' },
  { key: 'survivalStealth', label: 'Stealth' },
  { key: 'juryMakeRate', label: 'Jury Rate' },
]

export function normalizeRadarData(
  metricsArray: CompareMetrics[]
): RadarDataPoint[] {
  // Find max for each axis across all players
  const maxValues: Record<string, number> = {}
  for (const axis of RADAR_AXES) {
    let max = 0
    for (const m of metricsArray) {
      const val = m[axis.key] as number | null
      if (val !== null && val > max) max = val
    }
    maxValues[axis.key] = max
  }

  return RADAR_AXES.map((axis) => {
    const point: RadarDataPoint = {
      axis: axis.key,
      axisLabel: axis.label,
    }
    for (const m of metricsArray) {
      const raw = m[axis.key] as number | null
      const max = maxValues[axis.key]
      // Normalized 0-1 (max among group = 1)
      point[`${m.name}_norm`] = raw !== null && max > 0 ? round2(raw / max) : 0
      // Raw value for tooltip
      point[`${m.name}_raw`] = raw ?? 0
    }
    return point
  })
}

function round2(n: number): number {
  return Math.round(n * 100) / 100
}

export const PLAYER_COMPARE_COLORS = ['#2563eb', '#dc2626', '#059669', '#d97706']
