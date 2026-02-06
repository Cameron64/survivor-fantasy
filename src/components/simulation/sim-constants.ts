import type { SimEventType } from '@/simulation/engine/types'

/**
 * Client-safe duplicate of BASE_EVENT_POINTS from engine/data-mapper.ts.
 * The engine can't be imported client-side (uses fs), so we duplicate here.
 */
export const DEFAULT_BASE_POINTS: Record<SimEventType, number> = {
  INDIVIDUAL_IMMUNITY_WIN: 5,
  REWARD_CHALLENGE_WIN: 3,
  TEAM_CHALLENGE_WIN: 1,
  CORRECT_VOTE: 2,
  IDOL_PLAY_SUCCESS: 5,
  IDOL_FIND: 3,
  FIRE_MAKING_WIN: 5,
  ZERO_VOTES_RECEIVED: 1,
  SURVIVED_WITH_VOTES: 2,
  CAUSED_BLINDSIDE: 2,
  MADE_JURY: 5,
  FINALIST: 10,
  WINNER: 20,
  VOTED_OUT_WITH_IDOL: -3,
  QUIT: -10,
}

export const SIM_EVENT_LABELS: Record<SimEventType, string> = {
  INDIVIDUAL_IMMUNITY_WIN: 'Individual Immunity Win',
  REWARD_CHALLENGE_WIN: 'Reward Challenge Win',
  TEAM_CHALLENGE_WIN: 'Team Challenge Win',
  CORRECT_VOTE: 'Correct Vote',
  IDOL_PLAY_SUCCESS: 'Idol Play (Success)',
  IDOL_FIND: 'Idol Find',
  FIRE_MAKING_WIN: 'Fire Making Win',
  ZERO_VOTES_RECEIVED: 'Zero Votes Received',
  SURVIVED_WITH_VOTES: 'Survived with Votes',
  CAUSED_BLINDSIDE: 'Caused Blindside',
  MADE_JURY: 'Made Jury',
  FINALIST: 'Finalist',
  WINNER: 'Winner',
  VOTED_OUT_WITH_IDOL: 'Voted Out with Idol',
  QUIT: 'Quit',
}

export const EVENT_CATEGORIES: Record<string, SimEventType[]> = {
  Challenges: ['INDIVIDUAL_IMMUNITY_WIN', 'REWARD_CHALLENGE_WIN', 'TEAM_CHALLENGE_WIN', 'FIRE_MAKING_WIN'],
  Tribal: ['CORRECT_VOTE', 'ZERO_VOTES_RECEIVED', 'SURVIVED_WITH_VOTES', 'CAUSED_BLINDSIDE'],
  Idols: ['IDOL_FIND', 'IDOL_PLAY_SUCCESS'],
  Endgame: ['MADE_JURY', 'FINALIST', 'WINNER'],
  Penalties: ['VOTED_OUT_WITH_IDOL', 'QUIT'],
}

export const CATEGORY_COLORS: Record<string, string> = {
  Challenges: '#2563eb', // blue-600
  Tribal: '#d97706',     // amber-600
  Idols: '#7c3aed',      // violet-600
  Endgame: '#059669',    // emerald-600
  Penalties: '#dc2626',  // red-600
}

export function getCategoryForEvent(eventType: SimEventType): string {
  for (const [category, types] of Object.entries(EVENT_CATEGORIES)) {
    if (types.includes(eventType)) return category
  }
  return 'Other'
}

export function getColorForEvent(eventType: SimEventType): string {
  return CATEGORY_COLORS[getCategoryForEvent(eventType)] ?? '#6b7280'
}

export const SIM_DEFAULTS = {
  numPlayers: 8,
  picksPerPlayer: 2,
  maxOwners: 2,
  numSimulations: 1000,
}

export const BALANCE_THRESHOLDS = {
  gini: { green: 0.15, yellow: 0.25 },
  spread: { green: 30, yellow: 50 },
  winnerAdvantage: { green: 20, yellow: 35 },
  longevityCorrelation: { green: 0.5, yellow: 0.75 },
}

export function getThresholdColor(metric: keyof typeof BALANCE_THRESHOLDS, value: number): string {
  const abs = Math.abs(value)
  const t = BALANCE_THRESHOLDS[metric]
  if (abs <= t.green) return 'text-green-600'
  if (abs <= t.yellow) return 'text-yellow-600'
  return 'text-red-600'
}

export function getThresholdBg(metric: keyof typeof BALANCE_THRESHOLDS, value: number): string {
  const abs = Math.abs(value)
  const t = BALANCE_THRESHOLDS[metric]
  if (abs <= t.green) return 'bg-green-50 border-green-200'
  if (abs <= t.yellow) return 'bg-yellow-50 border-yellow-200'
  return 'bg-red-50 border-red-200'
}
