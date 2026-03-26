/**
 * Shared types for the draft room feature.
 * Used by both the API routes and the frontend components.
 */

export type DraftPickEntry = {
  id: string
  name: string
  tribe: string | null
  imageUrl: string | null
  globalPickNumber: number | null
}

export type DraftUserEntry = {
  userId: string
  name: string
  picks: DraftPickEntry[]
}

export type AvailableContestant = {
  id: string
  name: string
  tribe: string | null
  imageUrl: string | null
  isEliminated: boolean
}

/**
 * The full draft state payload sent over SSE and returned by GET /api/draft.
 * status mirrors DraftStatus enum: 'WAITING' | 'ACTIVE' | 'COMPLETE'.
 */
export type DraftStatePayload = {
  leagueId: string | null
  status: 'WAITING' | 'ACTIVE' | 'COMPLETE'
  currentPick: number
  currentRound: number
  currentUserId: string | null
  picksPerUser: number
  totalPicks: number
  draftOrder: DraftUserEntry[]
  availableContestants: AvailableContestant[]
  pickTimeoutSecs: number | null
  pickDeadline: string | null // ISO timestamp, null if no timeout active
  startedAt: string | null
}
