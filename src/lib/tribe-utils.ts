import { Tribe } from '@prisma/client'
import { db } from './db'

/**
 * Get the tribe a contestant belonged to at a specific week.
 * Returns the tribe from the membership active at that week
 * (fromWeek <= week AND (toWeek IS NULL OR toWeek >= week)).
 */
export async function getContestantTribeAtWeek(
  contestantId: string,
  week: number
): Promise<Tribe | null> {
  const membership = await db.tribeMembership.findFirst({
    where: {
      contestantId,
      fromWeek: { lte: week },
      OR: [
        { toWeek: null },
        { toWeek: { gte: week } },
      ],
    },
    include: { tribe: true },
    orderBy: { fromWeek: 'desc' },
  })

  return membership?.tribe ?? null
}

/**
 * Get the current tribe for a contestant (active membership with toWeek = null).
 */
export async function getContestantCurrentTribe(
  contestantId: string
): Promise<Tribe | null> {
  const membership = await db.tribeMembership.findFirst({
    where: {
      contestantId,
      toWeek: null,
    },
    include: { tribe: true },
  })

  return membership?.tribe ?? null
}

/**
 * Batch-load current tribes for multiple contestants.
 * Returns a map of contestantId -> Tribe.
 * Use this on list views to avoid N+1 queries.
 */
export async function getContestantCurrentTribes(
  contestantIds: string[]
): Promise<Map<string, Tribe>> {
  const memberships = await db.tribeMembership.findMany({
    where: {
      contestantId: { in: contestantIds },
      toWeek: null,
    },
    include: { tribe: true },
  })

  const result = new Map<string, Tribe>()
  for (const m of memberships) {
    result.set(m.contestantId, m.tribe)
  }
  return result
}
