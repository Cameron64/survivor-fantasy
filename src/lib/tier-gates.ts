import type { League } from '@prisma/client'

export const TIER_LIMITS = {
  FREE: { maxPlayers: 4, canCustomizeScoring: false, hasSlackIntegration: false },
  COMMISSIONER: { maxPlayers: 16, canCustomizeScoring: true, hasSlackIntegration: true },
  COMMUNITY: { maxPlayers: 50, canCustomizeScoring: true, hasSlackIntegration: true },
} as const

type Tier = keyof typeof TIER_LIMITS

function normalizeTier(tier: string): Tier {
  return (tier in TIER_LIMITS ? tier : 'FREE') as Tier
}

export function getLeagueLimits(league: League) {
  return TIER_LIMITS[normalizeTier(league.tier)]
}

export function canJoinLeague(league: League, currentMemberCount: number): boolean {
  return currentMemberCount < TIER_LIMITS[normalizeTier(league.tier)].maxPlayers
}

export function isPaidLeague(league: League): boolean {
  if (league.tier === 'FREE') return false
  if (!league.paidUntil) return false
  return league.paidUntil > new Date()
}
