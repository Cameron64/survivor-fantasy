import { db } from './db'

export interface ApprovalBlockResult {
  blocked: boolean
  blockingEvents?: Array<{
    id: string
    type: string
    week: number
  }>
}

/**
 * Check if a GameEvent can be approved based on chronological ordering.
 * A GameEvent cannot be approved if unapproved GameEvents exist in earlier weeks.
 */
export async function checkChronologicalApproval(week: number): Promise<ApprovalBlockResult> {
  const blockers = await db.gameEvent.findMany({
    where: {
      week: { lt: week },
      isApproved: false,
    },
    select: { id: true, type: true, week: true },
    orderBy: { week: 'asc' },
  })

  if (blockers.length > 0) {
    return {
      blocked: true,
      blockingEvents: blockers.map((b) => ({
        id: b.id,
        type: b.type,
        week: b.week,
      })),
    }
  }

  return { blocked: false }
}

/**
 * Check if a GameEvent can be unapproved by looking for downstream
 * approved events that reference affected contestants.
 */
export async function checkDownstreamDependencies(
  gameEventId: string,
  week: number,
  affectedContestantIds: string[]
): Promise<ApprovalBlockResult> {
  if (affectedContestantIds.length === 0) {
    return { blocked: false }
  }

  // Find later approved game events that have derived events
  // referencing any of the affected contestants
  const downstreamEvents = await db.gameEvent.findMany({
    where: {
      week: { gt: week },
      isApproved: true,
      events: {
        some: {
          contestantId: { in: affectedContestantIds },
        },
      },
    },
    select: { id: true, type: true, week: true },
    orderBy: { week: 'asc' },
  })

  if (downstreamEvents.length > 0) {
    return {
      blocked: true,
      blockingEvents: downstreamEvents.map((e) => ({
        id: e.id,
        type: e.type,
        week: e.week,
      })),
    }
  }

  return { blocked: false }
}
