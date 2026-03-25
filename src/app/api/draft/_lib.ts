import { db } from '@/lib/db'
import type { DraftStatePayload, DraftUserEntry } from '@/lib/draft-types'

/**
 * Calculates the 0-based index into draftOrder for the current pick (snake draft).
 */
export function getCurrentPickerIndex(
  pickNumber: number,
  round: number,
  totalUsers: number
): number {
  const positionInRound = (pickNumber - 1) % totalUsers
  return round % 2 === 1 ? positionInRound : totalUsers - 1 - positionInRound
}

/**
 * Fetches the full draft state for SSE broadcast and API responses.
 * Scopes to leagueId if provided; otherwise returns the most recent draft.
 */
export async function fetchDraftState(leagueId?: string): Promise<DraftStatePayload | null> {
  const draft = await db.draft.findFirst({
    where: leagueId ? { leagueId } : undefined,
    orderBy: { createdAt: 'desc' },
  })

  if (!draft) return null

  const draftOrderIds = draft.draftOrder as string[]

  const users = await db.user.findMany({
    where: { id: { in: draftOrderIds } },
    select: {
      id: true,
      name: true,
      team: {
        include: {
          contestants: {
            include: {
              contestant: {
                select: { id: true, name: true, tribe: true, imageUrl: true },
              },
            },
            orderBy: { draftOrder: 'asc' },
          },
        },
      },
    },
  })

  // Collect all drafted contestant IDs
  const draftedIds = new Set<string>()
  for (const u of users) {
    for (const tc of u.team?.contestants ?? []) {
      draftedIds.add(tc.contestantId)
    }
  }

  const availableContestants = await db.contestant.findMany({
    where: draftedIds.size > 0 ? { id: { notIn: Array.from(draftedIds) } } : undefined,
    orderBy: [{ tribe: 'asc' }, { name: 'asc' }],
    select: { id: true, name: true, tribe: true, imageUrl: true, isEliminated: true },
  })

  const totalPicks = draftOrderIds.length * draft.picksPerUser
  const currentUserIndex = getCurrentPickerIndex(
    draft.currentPick,
    draft.currentRound,
    draftOrderIds.length
  )
  const isWaiting = draft.status === 'WAITING'
  const currentUserId =
    isWaiting || draft.isComplete ? null : draftOrderIds[currentUserIndex] ?? null

  const orderedUsers: DraftUserEntry[] = draftOrderIds.map((userId) => {
    const user = users.find((u) => u.id === userId)
    return {
      userId,
      name: user?.name ?? 'Unknown',
      picks:
        user?.team?.contestants.map((tc) => ({
          id: tc.contestant.id,
          name: tc.contestant.name,
          tribe: tc.contestant.tribe ?? null,
          imageUrl: tc.contestant.imageUrl ?? null,
          globalPickNumber: tc.globalPickNumber ?? null,
        })) ?? [],
    }
  })

  return {
    leagueId: draft.leagueId,
    status: draft.status as 'WAITING' | 'ACTIVE' | 'COMPLETE',
    currentPick: draft.currentPick,
    currentRound: draft.currentRound,
    currentUserId,
    picksPerUser: draft.picksPerUser,
    totalPicks,
    draftOrder: orderedUsers,
    availableContestants,
    pickTimeoutSecs: draft.pickTimeoutSecs ?? null,
    pickDeadline: null,
    startedAt: draft.startedAt?.toISOString() ?? null,
  }
}
