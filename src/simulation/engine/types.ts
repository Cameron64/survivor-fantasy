/**
 * Event types matching the Prisma EventType enum.
 * Duplicated here so the simulation engine has zero Next.js/Prisma dependencies.
 */
export type SimEventType =
  | 'INDIVIDUAL_IMMUNITY_WIN'
  | 'REWARD_CHALLENGE_WIN'
  | 'TEAM_CHALLENGE_WIN'
  | 'CORRECT_VOTE'
  | 'IDOL_PLAY_SUCCESS'
  | 'IDOL_FIND'
  | 'FIRE_MAKING_WIN'
  | 'ZERO_VOTES_RECEIVED'
  | 'SURVIVED_WITH_VOTES'
  | 'CAUSED_BLINDSIDE'
  | 'MADE_JURY'
  | 'FINALIST'
  | 'WINNER'
  | 'VOTED_OUT_WITH_IDOL'
  | 'QUIT'

export interface SimCastaway {
  id: string
  name: string
  tribe: string
  placement: number
  isJury: boolean
  isFinalist: boolean
  isWinner: boolean
}

export interface SimEvent {
  type: SimEventType
  castawayId: string
  episode: number
  points: number
  description: string
}

export interface SimSeason {
  season: number
  name: string
  numCastaways: number
  numEpisodes: number
  castaways: SimCastaway[]
  events: SimEvent[]
}

export type PointOverrides = Partial<Record<SimEventType, number>>

export interface DraftConfig {
  numPlayers: number
  picksPerPlayer: number
  /** Max times a single contestant can be drafted (default: 2) */
  maxOwnersPerContestant?: number
  mode: 'random' | 'manual' | 'hybrid'
  /** For manual/hybrid mode: player index -> array of castaway IDs */
  manualPicks?: Record<number, string[]>
}

export interface DraftResult {
  /** player index -> array of castaway IDs */
  teams: Record<number, string[]>
  /** Full draft order: [round, pick, playerIndex, castawayId] */
  picks: Array<[number, number, number, string]>
}

export interface PlayerScore {
  playerIndex: number
  totalScore: number
  castaways: Array<{
    id: string
    name: string
    score: number
    eventBreakdown: Partial<Record<SimEventType, number>>
  }>
  scoreByEpisode: Record<number, number>
}

export interface SimulationResult {
  season: number
  draft: DraftResult
  scores: PlayerScore[]
  rankings: number[] // player indices sorted by score descending
}

export interface MonteCarloResult {
  season: number | 'all'
  numSimulations: number
  numPlayers: number
  picksPerPlayer: number
  /** Per-castaway stats across all sims */
  castawayStats: Array<{
    id: string
    name: string
    totalPoints: number
    avgTeamRank: number
    draftRate: number // fraction of sims where this castaway was drafted
  }>
  /** Score distribution across all sims */
  scoreDistribution: {
    mean: number
    median: number
    stdDev: number
    min: number
    max: number
    p25: number
    p75: number
  }
  balance: BalanceMetrics
}

export interface BalanceMetrics {
  gini: number
  spread: number // max - min team score
  /** Fraction of total points from each event type */
  eventContribution: Record<string, number>
  /** How much the Survivor winner's fantasy value exceeds mean castaway value */
  winnerAdvantage: number
  /** Pearson correlation between placement (lower = better) and fantasy points */
  longevityCorrelation: number
}

export interface PointSchemeComparison {
  schemeA: { label: string; overrides: PointOverrides }
  schemeB: { label: string; overrides: PointOverrides }
  resultA: MonteCarloResult
  resultB: MonteCarloResult
}

// --- Raw data types from survivoR export ---

export interface RawVoteHistory {
  season: number
  episode: number
  tribe_status: string
  castaway: string
  castaway_id: string
  vote: string
  vote_id: string
  voted_out: string
  voted_out_id: string
  nullified: boolean
  vote_event: string
  vote_event_outcome?: string
}

export interface RawChallengeResult {
  season: number
  episode: number
  castaway: string
  castaway_id: string
  challenge_type: string
  outcome_type?: string
  result: string
  tribe: string
  won_individual_immunity?: number
  won_individual_reward?: number
}

export interface RawAdvantageMovement {
  season: number
  episode: number
  castaway: string
  castaway_id: string
  advantage_type: string
  event: string
  played_for?: string
  played_for_id?: string
  votes_nullified?: number
}

export interface RawCastaway {
  season: number
  castaway: string
  castaway_id: string
  tribe: string
  placement: number
  jury: boolean
  finalist: boolean
  result: string
}

export interface RawBootMapping {
  season: number
  episode: number
  castaway: string
  castaway_id: string
  boot_order: number
}

export interface RawSeasonSummary {
  season: number
  season_name: string
  num_castaways: number
  num_episodes: number
}
